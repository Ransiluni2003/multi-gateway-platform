# 🚀 Project Starter Template - Copy This!

**Use this template for your next manual-coded project**

---

## 📁 Folder Structure to Create

```bash
my-new-project/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js
│   │   ├── controllers/
│   │   │   └── authController.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── errorHandler.js
│   │   ├── models/
│   │   │   └── User.js
│   │   ├── routes/
│   │   │   └── auth.js
│   │   ├── services/
│   │   │   └── authService.js
│   │   └── server.js
│   ├── tests/
│   ├── .env.example
│   ├── .gitignore
│   └── package.json
│
├── frontend/
│   ├── pages/
│   │   ├── index.js
│   │   ├── login.js
│   │   └── dashboard.js
│   ├── components/
│   │   └── Layout.js
│   ├── lib/
│   │   └── api.js
│   ├── styles/
│   │   └── globals.css
│   ├── .env.example
│   └── package.json
│
├── scripts/
│   ├── test-auth.js
│   └── setup-db.js
│
├── docs/
│   ├── API.md
│   └── ARCHITECTURE.md
│
├── docker-compose.yml
├── .gitignore
├── README.md
└── PROJECT_PLAN.md
```

---

## 📝 Essential Template Files

### 1. Root `.gitignore`
```
node_modules/
.env
.env.local
*.log
dist/
build/
.next/
coverage/
.DS_Store
```

---

### 2. Root `README.md`
```markdown
# Project Name

Brief description of what this project does.

## Features
- Feature 1
- Feature 2
- Feature 3

## Tech Stack
- **Backend:** Node.js + Express
- **Frontend:** Next.js
- **Database:** MongoDB
- **Auth:** JWT

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB running locally or cloud
- npm or yarn

### Installation

```bash
# Clone repository
git clone <your-repo>
cd project-name

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Environment Variables

Create `.env` files in both backend and frontend folders:

**backend/.env:**
```
PORT=3001
DATABASE_URL=mongodb://localhost:27017/mydb
JWT_SECRET=your-super-secret-key-here
NODE_ENV=development
```

**frontend/.env.local:**
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Running the Application

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Visit: http://localhost:3000

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Protected Routes
- `GET /api/users/profile` - Get user profile (requires auth)

## Testing

```bash
# Manual testing
node scripts/test-auth.js
```

## Project Structure

See [ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Known Issues
- List any current issues

## Future Improvements
- List planned features

## License
MIT
```

---

### 3. `backend/src/server.js` (Starter)
```javascript
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;

// Connect to database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
// Add more routes here

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
```

---

### 4. `backend/src/config/database.js`
```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
```

---

### 5. `backend/package.json` (Starter)
```json
{
  "name": "my-project-backend",
  "version": "1.0.0",
  "description": "",
  "main": "src/server.js",
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "test": "jest"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

---

### 6. `frontend/pages/index.js` (Starter)
```javascript
import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [status, setStatus] = useState(null);
  
  const checkHealth = async () => {
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_API_URL + '/health');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      setStatus({ error: error.message });
    }
  };
  
  return (
    <div className="container">
      <h1>My Project</h1>
      <p>Welcome to my manually coded project!</p>
      
      <div className="actions">
        <Link href="/login">
          <button>Login</button>
        </Link>
        <button onClick={checkHealth}>Check Backend</button>
      </div>
      
      {status && (
        <pre>{JSON.stringify(status, null, 2)}</pre>
      )}
      
      <style jsx>{`
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
        }
        .actions {
          display: flex;
          gap: 1rem;
          margin: 2rem 0;
        }
        button {
          padding: 0.5rem 1rem;
          background: #0070f3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        button:hover {
          background: #0051cc;
        }
        pre {
          background: #f4f4f4;
          padding: 1rem;
          border-radius: 4px;
          overflow-x: auto;
        }
      `}</style>
    </div>
  );
}
```

---

### 7. `frontend/package.json` (Starter)
```json
{
  "name": "my-project-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.0.0",
    "react": "18.2.0",
    "react-dom": "18.2.0"
  }
}
```

---

### 8. `docker-compose.yml` (Starter)
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
      - NODE_ENV=development
    depends_on:
      - mongo
    volumes:
      - ./backend:/app
      - /app/node_modules
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3001
    volumes:
      - ./frontend:/app
      - /app/node_modules
  
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

### 9. `PROJECT_PLAN.md` (Template)
```markdown
# Project Plan: [Your Project Name]

## Problem Statement
What problem does this solve?

## Target Users
Who will use this?

## Core Features (MVP)
1. User authentication
2. [Feature 2]
3. [Feature 3]

## Non-MVP Features (Later)
- [Future feature 1]
- [Future feature 2]

## Tech Stack
- **Backend:** Node.js + Express
- **Frontend:** Next.js
- **Database:** MongoDB
- **Auth:** JWT
- **Deployment:** Docker

## Database Schema

### User
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  role: String (enum),
  createdAt: Date
}
```

## API Design

### Authentication
- `POST /api/auth/register`
  - Body: { email, password }
  - Returns: { userId, message }
  
- `POST /api/auth/login`
  - Body: { email, password }
  - Returns: { token, userId }

## Timeline
- **Week 1:** Backend auth
- **Week 2:** Frontend pages
- **Week 3:** Testing
- **Week 4:** Deployment

## Success Criteria
- [ ] Users can register
- [ ] Users can login
- [ ] Protected routes work
- [ ] Deployment successful
```

---

## 🚀 Quick Start Commands

### Create Project
```bash
# Create folders
mkdir -p my-project/backend/src/{config,controllers,middleware,models,routes,services}
mkdir -p my-project/frontend/{pages,components,lib,styles}
mkdir -p my-project/{scripts,docs}
cd my-project

# Initialize Git
git init
echo "node_modules/" > .gitignore
echo ".env" >> .gitignore
echo "*.log" >> .gitignore

# Initialize backend
cd backend
npm init -y
npm install express mongoose bcryptjs jsonwebtoken dotenv cors
npm install -D nodemon

# Initialize frontend
cd ../frontend
npm init -y
npm install next react react-dom

# Create env files
echo "PORT=3001\nDATABASE_URL=\nJWT_SECRET=" > backend/.env.example
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > frontend/.env.example

# Copy example to actual
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

### First Commit
```bash
git add .
git commit -m "Initial project setup with backend and frontend structure"
```

---

## 📋 Daily Checklist

### Before Starting Work
- [ ] Pull latest code (`git pull`)
- [ ] Check what you did yesterday
- [ ] Plan today's feature (write it down)

### During Work
- [ ] Write code for ONE feature
- [ ] Test it manually
- [ ] Fix bugs immediately
- [ ] Document what it does

### Before Ending
- [ ] All tests pass
- [ ] Code is formatted
- [ ] Commit with clear message
- [ ] Update progress log

---

## 🎯 Learning Goals

### Week 1-2: Backend Basics
- [ ] Understand Express routing
- [ ] Learn MongoDB queries
- [ ] Master JWT authentication
- [ ] Write middleware

### Week 3-4: Frontend Basics
- [ ] Understand React hooks
- [ ] Learn Next.js routing
- [ ] Handle API calls
- [ ] Manage state

### Week 5-6: Integration
- [ ] Connect frontend to backend
- [ ] Handle errors gracefully
- [ ] Add loading states
- [ ] Implement auth flow

### Week 7-8: Polish
- [ ] Add validation
- [ ] Improve error messages
- [ ] Write documentation
- [ ] Prepare for deployment

---

## 💡 Code Snippets Reference

### Common Patterns

**Async Error Wrapper:**
```javascript
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Usage
router.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find();
  res.json(users);
}));
```

**API Client (Frontend):**
```javascript
// lib/api.js
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  
  return response.json();
}
```

---

**Now copy these templates and start building! 🚀**
