# 🛠️ Manual Coding Guide - Build Projects Without AI

**Learn to build a full-stack project from scratch - NO AI code generation**

Based on: `multi-gateway-platform` architecture  
**For:** Developers who want to code everything themselves  
**Last Updated:** February 13, 2026

---

## 🎯 Why Code Manually?

✅ **Deep understanding** of every line  
✅ **Problem-solving skills** improve massively  
✅ **Debug faster** - you know your own code  
✅ **Interview confidence** - real coding experience  
✅ **Portfolio credibility** - you can explain everything

---

## 📋 Phase-by-Phase Build Process

### **PHASE 0: Planning (Before ANY Coding)**

#### Step 1: Define Your Project (30 mins)
Create `PROJECT_PLAN.md` manually:

```markdown
# Project Name

## What Problem Does It Solve?
[1 paragraph explanation]

## Core Features (Max 5)
1. Feature 1
2. Feature 2
3. Feature 3

## Tech Stack Decision
- Backend: Node.js + Express (why?)
- Frontend: Next.js (why?)
- Database: MongoDB/PostgreSQL (why?)
- Auth: JWT (why?)

## NOT in MVP
- Feature X (later)
- Feature Y (later)
```

#### Step 2: Draw Architecture (Paper/Whiteboard)
```
Client → API Gateway → Services → Database
         ↓
      Middleware
```

Take a photo, save as `architecture-sketch.jpg`

---

### **PHASE 1: Project Setup (Manual)**

#### Step 1.1: Initialize Project
```bash
mkdir my-project
cd my-project
npm init -y  # Answer prompts yourself
```

#### Step 1.2: Create Folder Structure
```bash
mkdir -p backend/src/{routes,controllers,models,middleware,services,config}
mkdir -p frontend/{pages,components,lib,styles}
mkdir -p scripts
mkdir -p docs
```

#### Step 1.3: Manual `.gitignore` Creation
Type this yourself (learn what each means):
```
node_modules/
.env
.env.local
dist/
build/
.next/
*.log
coverage/
```

#### Step 1.4: Manual `package.json` Scripts
Add ONE script at a time as you need it:
```json
"scripts": {
  "dev": "node backend/src/server.js",
  "test": "jest"
}
```

**DON'T copy-paste 50 scripts** - add them when you actually use them!

---

### **PHASE 2: Backend Foundation (Code Manually)**

#### Step 2.1: Create Your First Server File
`backend/src/server.js` - **Type every character:**

```javascript
// Import dependencies
const express = require('express');

// Initialize app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Your first route
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

**Test it manually:**
```bash
node backend/src/server.js
curl http://localhost:3001/health
```

#### Step 2.2: Add Dependencies ONE at a time
```bash
npm install express      # Learn: web framework
npm install dotenv       # Learn: environment variables
npm install mongoose     # Learn: MongoDB driver
```

**Rule:** Only install when you NEED it, not "just in case"

#### Step 2.3: Environment Config (Manual)
Create `.env` manually:
```
PORT=3001
DATABASE_URL=mongodb://localhost:27017/mydb
JWT_SECRET=your-secret-here-generate-randomly
```

Create `.env.example` (without real values):
```
PORT=3001
DATABASE_URL=
JWT_SECRET=
```

---

### **PHASE 3: Database Models (Learn Schemas)**

#### Step 3.1: User Model - Type Yourself
`backend/src/models/User.js`:

```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define schema - learn each field
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
```

**Learn:** What is each part doing? Google terms you don't know!

---

### **PHASE 4: Routes & Controllers**

#### Step 4.1: Create Auth Routes
`backend/src/routes/auth.js`:

```javascript
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Define routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

module.exports = router;
```

#### Step 4.2: Create Auth Controller
`backend/src/controllers/authController.js`:

```javascript
const User = require('../models/User');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }
    
    // Create user
    const user = await User.create({ email, password });
    
    res.status(201).json({ 
      message: 'User registered successfully',
      userId: user._id 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ token, userId: user._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.logout = async (req, res) => {
  // For JWT, logout is handled client-side
  res.json({ message: 'Logged out successfully' });
};
```

**Type every line yourself** - understand the flow!

---

### **PHASE 5: Middleware (Security)**

#### Step 5.1: Authentication Middleware
`backend/src/middleware/auth.js`:

```javascript
const jwt = require('jsonwebtoken');

exports.authenticate = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Extract token
    const token = authHeader.split(' ')[1]; // "Bearer TOKEN"
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user info to request
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

#### Step 5.2: Error Handler Middleware
`backend/src/middleware/errorHandler.js`:

```javascript
exports.errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  const statusCode = err.statusCode || 500;
  
  res.status(statusCode).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
```

---

### **PHASE 6: Frontend (Next.js)**

#### Step 6.1: Initialize Next.js
```bash
cd frontend
npm init -y
npm install next react react-dom
```

Add to `package.json`:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start"
}
```

#### Step 6.2: Create First Page
`frontend/pages/index.js`:

```javascript
import { useState } from 'react';

export default function Home() {
  const [message, setMessage] = useState('');
  
  const checkHealth = async () => {
    try {
      const response = await fetch('http://localhost:3001/health');
      const data = await response.json();
      setMessage(JSON.stringify(data, null, 2));
    } catch (error) {
      setMessage('Error: ' + error.message);
    }
  };
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>My Project</h1>
      <button onClick={checkHealth}>Check Backend Health</button>
      <pre>{message}</pre>
    </div>
  );
}
```

**Type it yourself** - understand React hooks!

---

### **PHASE 7: Testing (Manual)**

#### Step 7.1: Manual Testing Checklist
Create `MANUAL_TEST_CHECKLIST.md`:

```markdown
# Manual Test Checklist

## Backend Tests
- [ ] Server starts without errors
- [ ] Health endpoint returns 200
- [ ] Can register new user
- [ ] Cannot register duplicate email
- [ ] Can login with correct password
- [ ] Cannot login with wrong password
- [ ] Protected routes require token
- [ ] Invalid token returns 401

## How to Test
1. Start server: `npm run dev`
2. Use Postman or curl
3. Test each endpoint
4. Check database changes
```

#### Step 7.2: Create Test Script
`scripts/test-auth.js`:

```javascript
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testAuth() {
  try {
    console.log('Testing Registration...');
    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
      email: 'test@example.com',
      password: 'password123'
    });
    console.log('✅ Registration:', registerResponse.data);
    
    console.log('\nTesting Login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    console.log('✅ Login:', loginResponse.data);
    
    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testAuth();
```

---

### **PHASE 8: Docker (Optional)**

#### Step 8.1: Create Dockerfile
`backend/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Start app
CMD ["node", "src/server.js"]
```

#### Step 8.2: Docker Compose
`docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=mongodb://mongo:27017/mydb
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - mongo
  
  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

---

## 📚 Learning Resources (When Stuck)

### Official Documentation (Read First!)
- **Node.js:** https://nodejs.org/docs
- **Express:** https://expressjs.com/en/guide/routing.html
- **Next.js:** https://nextjs.org/docs
- **MongoDB:** https://www.mongodb.com/docs/manual/

### When to Use AI vs Manual
❌ **AVOID AI for:**
- Writing your core business logic
- Learning new concepts
- Understanding errors
- Practice/interview prep

✅ **USE AI for:**
- Explaining error messages
- Suggesting better patterns (after you've tried)
- Code review
- Documentation

---

## 🎓 Daily Coding Routine

### Morning (2 hours)
1. **Plan** - What feature today? (10 min)
2. **Code** - Implement ONE feature (1h 30min)
3. **Test** - Manual testing (20 min)

### Afternoon (1 hour)
1. **Debug** - Fix broken things (30 min)
2. **Document** - Update README (20 min)
3. **Commit** - Git commit with clear message (10 min)

### Weekly Goals
- **Week 1:** Backend auth working
- **Week 2:** Frontend login page
- **Week 3:** Protected routes
- **Week 4:** Docker deployment

---

## 🚫 Common Mistakes to Avoid

### 1. **Scope Creep**
❌ "Let me add OAuth, 2FA, email verification..."  
✅ "Let me get basic login working first"

### 2. **Perfect Code Syndrome**
❌ Spending 2 hours on variable names  
✅ Get it working, refactor later

### 3. **Copy-Paste from StackOverflow**
❌ Copying code you don't understand  
✅ Read it, understand it, type it yourself

### 4. **Skipping Tests**
❌ "I'll test later"  
✅ Test each feature immediately

### 5. **No Git Commits**
❌ One commit after 2 weeks  
✅ Commit after each working feature

---

## 📝 Documentation Template

### For Each Feature - Create `FEATURE_NAME.md`:

```markdown
# Feature: User Authentication

## What It Does
Allows users to register and login

## How It Works
1. User sends email + password
2. Server validates input
3. Password hashed with bcrypt
4. JWT token generated
5. Token sent to client

## Files Modified
- `backend/src/routes/auth.js` - Routes
- `backend/src/controllers/authController.js` - Logic
- `backend/src/models/User.js` - Schema

## How to Test
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123"}'
```

## Known Issues
- No rate limiting yet
- No email verification

## Next Steps
- Add refresh tokens
- Add rate limiting
```

---

## 🎯 Your First 30-Day Project Plan

### Week 1: Backend Core
- [ ] Day 1-2: Setup + Hello World
- [ ] Day 3-4: Database connection
- [ ] Day 5-7: Auth routes

### Week 2: Frontend Basics
- [ ] Day 8-10: Next.js pages
- [ ] Day 11-12: Login form
- [ ] Day 13-14: Connect to backend

### Week 3: Features
- [ ] Day 15-17: Protected pages
- [ ] Day 18-20: User profile
- [ ] Day 21: Testing

### Week 4: Polish
- [ ] Day 22-24: Error handling
- [ ] Day 25-26: Docker setup
- [ ] Day 27-28: Documentation
- [ ] Day 29-30: Demo preparation

---

## 🔍 Debugging Checklist (When Stuck)

1. **Read the error message** (fully!)
2. **console.log()** everything
3. **Check your .env file** (loaded?)
4. **Verify database connection**
5. **Test with Postman** (isolate frontend/backend)
6. **Check browser console**
7. **Read documentation** (official source)
8. **Google the specific error**
9. **Ask for help** (with context)

---

## 📊 Progress Tracking Template

Create `PROGRESS.md`:

```markdown
# Project Progress

## Completed ✅
- [2026-02-13] Basic server setup
- [2026-02-14] User model created
- [2026-02-15] Register endpoint working

## In Progress 🚧
- Login endpoint (started 2026-02-16)

## Blocked 🚫
- Need to learn JWT refresh tokens

## Next Up ⏭️
- Protected routes
- Frontend login page
```

---

## 🎉 You're Ready!

**Remember:**
- 🐢 **Slow is smooth, smooth is fast**
- 💪 **Struggle = Learning**
- 🔄 **Iterate, don't perfect**
- 📝 **Document everything**
- 🧪 **Test constantly**

**Start small, code daily, ship weekly!**

---

## 📞 Getting Help (Smart Way)

When asking for help, provide:
1. What you're trying to do
2. What you expected
3. What actually happened
4. Error messages (full)
5. Code snippet (relevant part)
6. What you've tried

❌ "My code doesn't work, help!"  
✅ "I'm trying to hash passwords with bcrypt. Expected hash to be saved, but getting 'undefined'. Here's my code..."

---

**Good luck! You got this! 💪**
