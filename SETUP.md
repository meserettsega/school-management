# School Management System - Complete Setup Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Database Setup](#database-setup)
6. [Running the Application](#running-the-application)
7. [Testing the API](#testing-the-api)
8. [Troubleshooting](#troubleshooting)
9. [Next Steps](#next-steps)

---

## Prerequisites

### Required Software
- **Node.js** (v16.x or higher) - [Download](https://nodejs.org/)
- **npm** (v7.x or higher) - Comes with Node.js
- **MongoDB** - [Local Installation](https://docs.mongodb.com/manual/installation/) OR [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- **Git** (optional) - [Download](https://git-scm.com/)
- **Postman** (optional, for API testing) - [Download](https://www.postman.com/downloads/)

### Verify Installation
```bash
node --version  # Should be v16.x+
npm --version   # Should be v7.x+
```

---

## Project Structure

```
school/
├── backend/                    # Node.js + Express.js server
│   ├── config/
│   │   └── database.js        # MongoDB connection
│   ├── models/                # Database schemas (15 models)
│   ├── controllers/           # Business logic (16 controllers)
│   ├── routes/                # API endpoints (14 route files)
│   ├── middleware/            # Auth, error handling
│   ├── utils/                 # JWT, password utilities
│   ├── server.js              # Express app setup
│   ├── package.json           # Dependencies
│   ├── .env                   # Environment variables (create this)
│   └── .env.example           # Environment template
│
├── frontend/                  # React + Vite application
│   ├── src/
│   │   ├── pages/            # Route pages (Login, Dashboards)
│   │   ├── components/       # Reusable UI components
│   │   ├── store/            # Redux state management
│   │   ├── services/         # API service calls
│   │   ├── utils/            # Helper functions & API client
│   │   ├── App.jsx           # Main app component
│   │   ├── main.jsx          # React entry point
│   │   └── index.css         # Global styles
│   ├── index.html            # HTML template
│   ├── vite.config.js        # Vite configuration
│   ├── tailwind.config.js    # Tailwind CSS config
│   ├── package.json          # Dependencies
│   ├── .env                  # Environment variables (create this)
│   └── .env.example          # Environment template
│
├── README.md                 # Full project documentation
├── QUICK_START.md           # Quick setup guide
├── API_DOCUMENTATION.md     # Complete API reference
└── SETUP.md                 # This file
```

---

## Backend Setup

### Step 1: Navigate to Backend
```bash
cd school/backend
```

### Step 2: Install Dependencies
```bash
npm install
```

**Dependencies Installed:**
- express 4.18.2 - Web framework
- mongoose 8.0.0 - MongoDB ODM
- jsonwebtoken 9.1.2 - JWT authentication
- bcryptjs 2.4.3 - Password hashing
- dotenv 16.3.1 - Environment variables
- cors 2.8.5 - Cross-origin requests
- helmet 7.1.0 - Security headers
- socket.io 4.7.2 - Real-time communication
- multer 1.4.5-lts.1 - File uploads
- axios 1.6.2 - HTTP client

### Step 3: Create Environment File
Create `.env` file in `backend/` folder:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:217/school
# OR use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/school_management

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this_123456789
JWT_REFRESH_SECRET=your_refresh_secret_key_change_this_987654321
JWT_EXPIRY=7d
JWT_REFRESH_EXPIRY=30d

# Cloudinary (Optional - for image storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Frontend URL
FRONTEND_URL=http://localhost:5123

# Email (Optional - for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=788
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your_app_password
```

### Step 4: Start Backend Server
```bash
npm run dev
```

**Expected Output:**
```
Server running on PORT 5000
MongoDB connected successfully
```

Backend is now running at: **http://localhost:5000**

---

## Frontend Setup

### Step 1: Navigate to Frontend (In a new terminal)
```bash
cd school/frontend
```

### Step 2: Install Dependencies
```bash
npm install
```

**Key Dependencies:**
- react 18.2.0 - UI library
- react-router-dom 6.20.0 - Routing
- axios 1.6.2 - HTTP client
- redux & @reduxjs/toolkit 1.9.7 - State management
- tailwindcss 3.3.6 - CSS framework
- vite 5.0.7 - Build tool

### Step 3: Create Environment File
Create `.env` file in `frontend/` folder:

```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=School Management System
```

### Step 4: Start Frontend Server
```bash
npm run dev
```

**Expected Output:**
```
  VITE v5.0.7  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

Frontend is now running at: **http://localhost:5173**

---

## Database Setup

### Option 1: Local MongoDB

#### Windows/Mac/Linux
1. [Download MongoDB Community Edition](https://www.mongodb.com/try/download/community)
2. Install following the instructions
3. Start MongoDB service:
   - **Windows**: MongoDB should auto-start
   - **Mac**: `brew services start mongodb-community`
   - **Linux**: `sudo systemctl start mongod`
4. Update `.env` in backend:
   ```env
   MONGODB_URI=mongodb://localhost:27017/school_management
   ```

### Option 2: MongoDB Atlas (Cloud)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Create a new project
4. Create a new cluster (free tier available)
5. Create a database named `school_management`
6. Create a database user with username and password
7. Get connection string (Drivers > Node.js)
8. Update `.env` in backend:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/school_management?retryWrites=true&w=majority
   ```

**Verify Connection:**
Use MongoDB Compass (GUI):
- Download [MongoDB Compass](https://www.mongodb.com/products/tools/compass)
- Paste your connection string
- Connect and verify database exists

---

## Running the Application

### Terminal 1: Backend
```bash
cd backend
npm run dev
# Runs on http://localhost:5000
```

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

### Open in Browser
Go to: **http://localhost:5173**

---

## Testing the API

### Method 1: Using Postman

1. Download [Postman](https://www.postman.com/downloads/)
2. Import the API collection or create requests manually

**Example: Create School**
```
POST http://localhost:5000/api/schools
Content-Type: application/json

{
  "name": "ABC School",
  "code": "SCHOOL001",
  "email": "school@abc.com",
  "phone": "1234567890",
  "address": {
    "street": "123 Main St",
    "city": "City",
    "state": "State",
    "zipCode": "12345"
  },
  "principalName": "Mr. Principal",
  "principalEmail": "principal@abc.com",
  "adminName": "Admin Name",
  "adminEmail": "admin@abc.com",
  "adminPassword": "password123"
}
```

### Method 2: Using cURL
```bash
curl -X POST http://localhost:5000/api/schools \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ABC School",
    "code": "SCHOOL001",
    "email": "school@abc.com",
    "phone": "1234567890",
    "address": {
      "street": "123 Main St",
      "city": "City",
      "state": "State",
      "zipCode": "12345"
    },
    "principalName": "Mr. Principal",
    "principalEmail": "principal@abc.com",
    "adminName": "Admin Name",
    "adminEmail": "admin@abc.com",
    "adminPassword": "password123"
  }'
```

### Method 3: Using Frontend UI
1. Open http://localhost:5173
2. Enter School Code: `SCHOOL001`
3. Email: `admin@abc.com`
4. Password: `password123`

---

## Troubleshooting

### MongoDB Connection Error
**Error**: `MongooseError: Cannot connect to MongoDB`

**Solutions**:
1. Check MongoDB is running: `sudo systemctl status mongod` (Linux)
2. Verify MONGODB_URI in `.env`
3. If using MongoDB Atlas, ensure:
   - IP whitelist includes your IP
   - Username/password are correct
   - Connection string is properly formatted

### Port Already in Use
**Error**: `Error: listen EADDRINUSE: address already in use :::5000`

**Solutions**:
```bash
# Kill process on port 5000
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :5000
kill -9 <PID>
```

Or change PORT in `.env`:
```env
PORT=5001
```

### Dependencies Missing
**Error**: `Cannot find module 'express'`

**Solution**:
```bash
npm install
# or
npm install --legacy-peer-deps
```

### CORS Error
**Error**: `Access to XMLHttpRequest blocked by CORS policy`

**Solution**: Ensure backend `.env` has:
```env
FRONTEND_URL=http://localhost:5173
```

### Token Expired
**Error**: `401 Unauthorized`

**Solution**: Login again, or use refresh token endpoint to get new access token

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

## Development Commands

### Backend
```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Run linting
npm run lint
```

### Frontend
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

---

## Environment Variables Reference

### Backend (.env)
| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 5000 | Server port |
| MONGODB_URI | mongodb://localhost:27017/school_management | Database URI |
| JWT_SECRET | (required) | JWT signing secret |
| JWT_EXPIRY | 7d | Access token expiry |
| FRONTEND_URL | http://localhost:3000 | Frontend URL for CORS |

### Frontend (.env)
| Variable | Default | Description |
|----------|---------|-------------|
| VITE_API_URL | http://localhost:5000/api | Backend API URL |
| VITE_APP_NAME | School Management System | App name |

---

## Next Steps

### 1. Create Initial Data
- Create a school via API or frontend
- Add students and teachers
- Set up classes and subjects
- Create timetables

### 2. Customize Theme
Edit `frontend/tailwind.config.js`:
```js
theme: {
  extend: {
    colors: {
      primary: '#3B82F6',    // Blue
      secondary: '#10B981',  // Green
      danger: '#EF4444',     // Red
    }
  }
}
```

### 3. Add Features
- Implement file uploads (Multer + Cloudinary)
- Add email notifications
- Create reports (PDF/Excel)
- Add data analytics charts

### 4. Deployment
- Deploy backend to Heroku, Railway, or AWS
- Deploy frontend to Vercel, Netlify, or GitHub Pages
- Set up CI/CD pipeline

### 5. Testing
- Write unit tests (Jest)
- Write integration tests
- Load testing with Artillery

---

## Useful Resources

- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)

---

## Support

For issues or questions:
1. Check [README.md](README.md) for complete documentation
2. Review [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for API details
3. Check error messages and [Troubleshooting](#troubleshooting) section
4. Review backend console logs for detailed errors

---

## Security Checklist

Before deploying to production:

- [ ] Change JWT_SECRET to a strong, unique value
- [ ] Enable HTTPS
- [ ] Set secure CORS origins
- [ ] Enable MongoDB authentication
- [ ] Use environment variables for all secrets
- [ ] Add rate limiting
- [ ] Enable request validation
- [ ] Add logging and monitoring
- [ ] Set up automated backups
- [ ] Use Content Security Policy headers

---

**Last Updated**: 2024  
**Project Version**: 1.0.0
