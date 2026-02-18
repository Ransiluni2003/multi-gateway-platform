# 🎓 Learning Guide: Pagination & Infinite Scroll Patterns

**Building Scalable List APIs**  
**Date:** February 13, 2026

---

## 📚 What This Teaches

Learn to build APIs that scale from 10 to 10 million records:
1. **Why** loading all records breaks at scale
2. **Pagination patterns:** Offset, cursor, keyset
3. **Frontend implementation:** Load more vs infinite scroll
4. **Database optimization** for pagination queries

---

## Part 1: The N+1 Million Problem

### Breaking at Scale

**Day 1 (10 users):**
```typescript
// GET /api/files
export async function getFiles(req, res) {
  const files = await db.files.find({ userId: req.user.id });
  res.json(files); // Returns 5 files, works fine ✅
}
```

**Day 365 (1000 users, 500,000 files):**
```typescript
// Same endpoint
const files = await db.files.find({ userId: req.user.id });
// Returns 50,000 files for power user
// Response size: 50 MB
// Query time: 30 seconds
// Browser crashes trying to render 50,000 rows 💀
```

**Real-world impact:**
- ❌ API timeout (30s+ response time)
- ❌ Database memory exhaustion
- ❌ Frontend freezes rendering huge lists
- ❌ Mobile app crashes OOM (Out of Memory)
- ❌ Bandwidth costs spike ($$$)

---

## Part 2: Pagination Patterns

### Pattern 1: Offset/Limit (Simple but Flawed)

**How it works:**
```typescript
// Page 1: GET /api/files?page=1&limit=20
const files = await db.files.find({ userId })
  .skip(0)      // Skip 0 records
  .limit(20);   // Return 20 records

// Page 2: GET /api/files?page=2&limit=20
const files = await db.files.find({ userId })
  .skip(20)     // Skip first 20 records
  .limit(20);   // Return next 20 records
```

**Implementation:**

```typescript
// backend/src/routes/files.ts

export async function listFiles(req: Request, res: Response) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100
  
  const skip = (page - 1) * limit;
  
  // Get total count (for pagination info)
  const total = await db.files.countDocuments({ userId: req.user.id });
  
  // Get page of results
  const files = await db.files.find({ userId: req.user.id })
    .sort({ createdAt: -1 }) // Newest first
    .skip(skip)
    .limit(limit)
    .lean(); // Return plain objects (faster)
  
  res.json({
    data: files,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + files.length < total,
    },
  });
}
```

**Pros ✅:**
- Simple to implement
- Easy to jump to any page (page 1, 5, 100)
- Total count available (show "Page 1 of 50")
- Good for small-medium datasets

**Cons ❌:**
- `skip(10000)` is SLOW - database scans 10K rows to skip them
- Performance degrades linearly with page number
- Inconsistent results if data changes between requests
- `countDocuments()` is expensive on large collections

**Performance:**
```
Page 1:  skip(0)     → 10ms  ✅
Page 10: skip(200)   → 15ms  ✅
Page 100: skip(2000) → 100ms ⚠️
Page 500: skip(10000)→ 2000ms ❌
```

**When to use:** Admin dashboards, small datasets, need page numbers

---

### Pattern 2: Cursor Pagination (Scalable)

**Concept:** Use last record ID as bookmark instead of counting

```typescript
// Page 1: GET /api/files?limit=20
// Returns: files + cursor to next page

// Page 2: GET /api/files?limit=20&cursor=abc123
// Returns: files AFTER cursor
```

**Implementation:**

```typescript
export async function listFilesWithCursor(req: Request, res: Response) {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const cursor = req.query.cursor as string | undefined;
  
  // Build query
  const query: any = { userId: req.user.id };
  
  // If cursor exists, only get records AFTER it
  if (cursor) {
    try {
      const cursorDoc = JSON.parse(
        Buffer.from(cursor, 'base64').toString('utf-8')
      );
      
      // Get records created before cursor timestamp
      // AND if same timestamp, use _id for stable ordering
      query.$or = [
        { createdAt: { $lt: cursorDoc.createdAt } },
        { 
          createdAt: cursorDoc.createdAt, 
          _id: { $lt: cursorDoc._id } 
        },
      ];
    } catch (error) {
      return res.status(400).json({ error: 'Invalid cursor' });
    }
  }
  
  // Get limit + 1 to check if more results exist
  const files = await db.files.find(query)
    .sort({ createdAt: -1, _id: -1 }) // Stable sort
    .limit(limit + 1)
    .lean();
  
  // Check if there are more results
  const hasMore = files.length > limit;
  const results = hasMore ? files.slice(0, limit) : files;
  
  // Generate cursor for next page
  let nextCursor: string | null = null;
  if (hasMore && results.length > 0) {
    const lastItem = results[results.length - 1];
    const cursorData = {
      createdAt: lastItem.createdAt,
      _id: lastItem._id,
    };
    nextCursor = Buffer.from(JSON.stringify(cursorData)).toString('base64');
  }
  
  res.json({
    data: results,
    pagination: {
      cursor: nextCursor,
      hasMore,
      limit,
    },
  });
}
```

**Cursor format:**
```json
// Plain object
{ "createdAt": "2026-02-13T10:00:00Z", "_id": "65d1234abcd" }

// Base64 encoded
"eyJjcmVhdGVkQXQiOiIyMDI2LTAyLTEzVDEwOjAwOjAwWiIsIl9pZCI6IjY1ZDEyMzRhYmNkIn0="
```

**Pros ✅:**
- Constant time performance (no skip!)
- Handles real-time data changes gracefully
- Works with infinite scroll UX
- No expensive `countDocuments()`

**Cons ❌:**
- Can't jump to specific page
- No total count (can't show "Page X of Y")
- More complex implementation
- Cursor must be opaque to client

**Performance:**
```
Page 1:    → 10ms  ✅
Page 100:  → 10ms  ✅
Page 10000:→ 10ms  ✅ (Always fast!)
```

**When to use:** Social feeds, file lists, activity logs, mobile apps

---

### Pattern 3: Keyset Pagination (SQL-optimized)

**Concept:** Use indexed columns as cursor (faster than ObjectID)

```typescript
export async function listFilesKeyset(req: Request, res: Response) {
  const limit = 20;
  const lastCreatedAt = req.query.lastCreatedAt 
    ? new Date(req.query.lastCreatedAt as string) 
    : null;
  
  const query: any = { userId: req.user.id };
  
  if (lastCreatedAt) {
    // Only get records created before last seen
    query.createdAt = { $lt: lastCreatedAt };
  }
  
  const files = await db.files.find(query)
    .sort({ createdAt: -1 })
    .limit(limit + 1);
  
  const hasMore = files.length > limit;
  const results = files.slice(0, limit);
  
  res.json({
    data: results,
    pagination: {
      lastCreatedAt: results[results.length - 1]?.createdAt,
      hasMore,
    },
  });
}
```

**Key difference:** Uses indexed `createdAt` field instead of `_id`

**Database index required:**
```typescript
// MongoDB
db.files.createIndex({ userId: 1, createdAt: -1 });

// PostgreSQL
CREATE INDEX idx_files_user_created ON files(user_id, created_at DESC);
```

**Performance:** Even faster than cursor pagination if properly indexed!

---

## Part 3: Frontend Implementation

### Numbered Pagination UI

```typescript
// components/FileList.tsx

import { useState, useEffect } from 'react';

export function FileList() {
  const [files, setFiles] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalPages: 1,
    hasMore: false,
  });
  
  useEffect(() => {
    loadFiles(pagination.page);
  }, [pagination.page]);
  
  async function loadFiles(page: number) {
    const response = await fetch(`/api/files?page=${page}&limit=20`);
    const data = await response.json();
    
    setFiles(data.data);
    setPagination(data.pagination);
  }
  
  return (
    <div>
      {files.map(file => (
        <FileItem key={file._id} file={file} />
      ))}
      
      <div className="pagination">
        <button 
          disabled={pagination.page === 1}
          onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
        >
          Previous
        </button>
        
        <span>Page {pagination.page} of {pagination.totalPages}</span>
        
        <button 
          disabled={!pagination.hasMore}
          onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

---

### Infinite Scroll (Cursor-based)

```typescript
// components/InfiniteFileList.tsx

import { useState, useEffect, useRef } from 'react';

export function InfiniteFileList() {
  const [files, setFiles] = useState([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const observerRef = useRef<IntersectionObserver>();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    loadInitialFiles();
  }, []);
  
  useEffect(() => {
    // Set up intersection observer for infinite scroll
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMoreFiles();
        }
      },
      { threshold: 0.1 }
    );
    
    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }
    
    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, cursor]);
  
  async function loadInitialFiles() {
    setLoading(true);
    const response = await fetch('/api/files?limit=20');
    const data = await response.json();
    
    setFiles(data.data);
    setCursor(data.pagination.cursor);
    setHasMore(data.pagination.hasMore);
    setLoading(false);
  }
  
  async function loadMoreFiles() {
    if (!cursor || !hasMore || loading) return;
    
    setLoading(true);
    const response = await fetch(`/api/files?limit=20&cursor=${cursor}`);
    const data = await response.json();
    
    setFiles(prev => [...prev, ...data.data]); // Append new files
    setCursor(data.pagination.cursor);
    setHasMore(data.pagination.hasMore);
    setLoading(false);
  }
  
  return (
    <div>
      {files.map(file => (
        <FileItem key={file._id} file={file} />
      ))}
      
      {/* Trigger element for loading more */}
      {hasMore && (
        <div ref={loadMoreRef} style={{ height: '100px', padding: '20px' }}>
          {loading ? 'Loading...' : 'Scroll for more'}
        </div>
      )}
      
      {!hasMore && <div>No more files</div>}
    </div>
  );
}
```

---

### "Load More" Button (Simpler Alternative)

```typescript
export function LoadMoreFileList() {
  const [files, setFiles] = useState([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    loadFiles();
  }, []);
  
  async function loadFiles(appendCursor?: string) {
    setLoading(true);
    
    const url = appendCursor 
      ? `/api/files?limit=20&cursor=${appendCursor}`
      : '/api/files?limit=20';
    
    const response = await fetch(url);
    const data = await response.json();
    
    setFiles(prev => appendCursor ? [...prev, ...data.data] : data.data);
    setCursor(data.pagination.cursor);
    setHasMore(data.pagination.hasMore);
    setLoading(false);
  }
  
  return (
    <div>
      {files.map(file => <FileItem key={file._id} file={file} />)}
      
      {hasMore && (
        <button 
          onClick={() => loadFiles(cursor)}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

---

## Part 4: Database Optimization

### Indexing Strategy

```typescript
// MongoDB indexes

// For offset pagination
db.files.createIndex({ userId: 1, createdAt: -1 });

// For cursor pagination (compound index)
db.files.createIndex({ userId: 1, createdAt: -1, _id: -1 });

// For search + pagination
db.files.createIndex({ userId: 1, filename: 'text', createdAt: -1 });
```

**Index usage explanation:**
```sql
-- Query: find({ userId: 123, createdAt: { $lt: date } }).sort({ createdAt: -1 })

-- Index scan: userId=123, then jump to createdAt < date, then read 20 rows
-- Time: O(log n) + O(limit) = 10ms even for millions of rows ✅

-- Without index:
-- Full collection scan: read ALL rows, filter, sort, then limit
-- Time: O(n) = 30,000ms for 1M rows ❌
```

---

### Projection (Only Return Needed Fields)

```typescript
// ❌ BAD: Return entire document (1KB each)
const files = await db.files.find({ userId })
  .limit(20);

// ✅ GOOD: Return only needed fields (100 bytes each)
const files = await db.files.find({ userId })
  .select('_id filename size createdAt')
  .limit(20);

// 10x less bandwidth, 10x faster serialization!
```

---

### Lean Queries (Mongoose)

```typescript
// ❌ BAD: Hydrate full Mongoose documents
const files = await File.find({ userId }).limit(20);
// Each document has methods, virtuals, etc. (slow)

// ✅ GOOD: Return plain JavaScript objects
const files = await File.find({ userId })
  .limit(20)
  .lean();
// 5x faster!
```

---

## Part 5: Handling Edge Cases

### Problem 1: Deleted Items (Cursor Invalidation)

**Scenario:** User deletes item while paginating

```
Page 1: Items [1, 2, 3, 4, 5] → Cursor = 5
[User deletes item 4]
Page 2: Items [6, 7, 8, 9, 10] ✅ (Still works!)
```

Cursor pagination handles this gracefully! 

Offset pagination would skip item 6:
```
Page 1: skip(0), limit(5) → [1, 2, 3, 4, 5]
[Delete item 4]
Page 2: skip(5), limit(5) → [6, 7, 8, 9, 10]
                              ↑ Item 6 moved to position 5, gets skipped!
```

---

### Problem 2: Sorting by Non-Unique Field

**Bad cursor:**
```typescript
// Cursor contains ONLY createdAt (not unique!)
cursor = { createdAt: "2026-02-13T10:00:00Z" }

// Problem: Multiple files have same createdAt
// → Pagination may skip or duplicate items
```

**Solution: Include unique field (_id)**
```typescript
cursor = { 
  createdAt: "2026-02-13T10:00:00Z",
  _id: "65d1234abcd"  // ← Tie-breaker
}

// Query uses BOTH fields for stable ordering
query = {
  $or: [
    { createdAt: { $lt: cursor.createdAt } },
    { 
      createdAt: cursor.createdAt, 
      _id: { $lt: cursor._id }  // ← Break ties
    }
  ]
}
```

---

### Problem 3: Concurrent Inserts

**Scenario:** New items added while user paginates

```
Initial: [A, B, C, D, E]
Page 1: GET → [A, B]

[New item X inserted at top]

State: [X, A, B, C, D, E]
Page 2: GET → [C, D]  ← Cursor-based (works!)
        vs
        skip(2) → [B, C]  ← Offset-based (duplicates B!)
```

Cursor pagination: ✅ Handles gracefully  
Offset pagination: ❌ Shows duplicates

---

## Part 6: Implementation for THIS Repository

### Recommended Approach

**For file lists:** Cursor pagination  
**For audit logs:** Cursor pagination  
**For admin user list:** Offset pagination (need page numbers)

### Migration Plan

#### Step 1: Add Pagination to File API

```typescript
// commerce-web/src/app/api/files/route.ts

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const cursor = searchParams.get('cursor');
  
  // Build query (your existing logic)
  const query = { userId: req.user.id };
  
  if (cursor) {
    const { createdAt, _id } = JSON.parse(
      Buffer.from(cursor, 'base64').toString()
    );
    query.$or = [
      { createdAt: { $lt: new Date(createdAt) } },
      { createdAt: new Date(createdAt), _id: { $lt: _id } },
    ];
  }
  
  const files = await db.files.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1);
  
  const hasMore = files.length > limit;
  const results = files.slice(0, limit);
  
  const nextCursor = hasMore && results.length > 0
    ? Buffer.from(JSON.stringify({
        createdAt: results[-1].createdAt,
        _id: results[results.length - 1]._id,
      })).toString('base64')
    : null;
  
  return Response.json({
    files: results,
    pagination: { cursor: nextCursor, hasMore, limit },
  });
}
```

#### Step 2: Update Frontend

```typescript
// commerce-web/src/components/FileList.tsx

export function FileList() {
  const [files, setFiles] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  
  async function loadMore() {
    const url = cursor 
      ? `/api/files?cursor=${cursor}&limit=20`
      : '/api/files?limit=20';
    
    const response = await fetch(url);
    const data = await response.json();
    
    setFiles(prev => [...prev, ...data.files]);
    setCursor(data.pagination.cursor);
    setHasMore(data.pagination.hasMore);
  }
  
  // ... render logic
}
```

---

## Summary: When to Use Each Pattern

| Use Case | Pattern | Why |
|----------|---------|-----|
| **Social feed** | Cursor | Real-time updates, infinite scroll |
| **File manager** | Cursor | Large lists, "Load More" button |
| **Audit logs** | Cursor | Millions of rows, no page jumps needed |
| **Admin tables** | Offset | Need page numbers, small datasets |
| **Search results** | Offset | Users expect page numbers |
| **Mobile app** | Cursor | Smooth infinite scroll UX |

**Golden rule:** Default to cursor pagination unless you need page numbers!

---

**Go build scalable APIs! 📄🚀**
