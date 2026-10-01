# ⚙️ Setup Guide

This document provides the instructions required to set up and run the School Management System locally for development.

---

## 📋 Table of Contents

* [Prerequisites](#-prerequisites)
* [Project Structure](#-project-structure)
* [Backend Setup](#-backend-setup)
* [Frontend Setup](#-frontend-setup)
* [Database Setup](#-database-setup)
* [Environment Variables](#-environment-variables)
* [Running the Application](#-running-the-application)
* [Build Verification](#-build-verification)
* [Development Commands](#-development-commands)
* [Troubleshooting](#-troubleshooting)
* [Environment Security](#-environment-security)

---

# 🧰 Prerequisites

Before setting up the project, make sure the following software is installed.

| Requirement | Version / Recommendation       |
| ----------- | ------------------------------ |
| Node.js     | 16+                            |
| npm         | 7+                             |
| MongoDB     | Local MongoDB or MongoDB Atlas |
| Git         | Latest stable version          |
| Postman     | Optional, for API testing      |
| Code Editor | VS Code or equivalent          |

### Verify Node.js

```
node --version
```

### Verify npm

```
npm --version
```

### Verify Git

```
git --version
```

### Verify MongoDB

```
mongod --version
```

> Use the Node.js version supported by the project's `package.json` if an `engines` configuration is specified.

---

# 📁 Project Structure

The project is organized into separate frontend and backend applications.

```
school-management-system/
│
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── config/
│   ├── server.js
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── .env
│
├── README.md
├── SETUP.md
├── QUICK_START.md
└── WALKTHROUGH.md
```

> The exact project structure may change as development continues.

---

# 🖥️ Backend Setup

## 1. Navigate to the Backend

From the project root:

```
cd backend
```

## 2. Install Dependencies

Install all backend dependencies:

```
npm install
```

If the project contains a valid `package-lock.json`, you can use:

```
npm ci
```

---

## 3. Configure Backend Environment Variables

Create a `.env` file inside the `backend` directory.

```
backend/
├── .env
├── package.json
└── ...
```

Use the environment variables required by the application.

Example development configuration:

```
PORT=5000
NODE_ENV=development

MONGODB_URI=mongodb://localhost:27017/school_management

JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_token_secret

JWT_EXPIRY=7d
JWT_REFRESH_EXPIRY=30d

FRONTEND_URL=http://localhost:5173
```

If Cloudinary is used by the application, configure the required Cloudinary variables:

```
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

If email functionality is enabled, configure the required SMTP variables:

```
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASSWORD=
```

> Do not commit the actual `.env` file or real credentials to the repository.

---

## 4. Start the Backend

Run the development server using the script defined in `package.json`.

Typical command:

```
npm run dev
```

If the project uses `npm start` for development, use:

```
npm start
```

The backend will normally be available at:

```
http://localhost:5000
```

The actual port depends on the `PORT` configuration.

---

# 🎨 Frontend Setup

Open a new terminal while keeping the backend running.

## 1. Navigate to the Frontend

```
cd frontend
```

## 2. Install Dependencies

```
npm install
```

If the project contains a valid `package-lock.json`:

```
npm ci
```

---

## 3. Configure Frontend Environment Variables

Create a `.env` file inside the `frontend` directory.

Example:

```
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=School Management System
```

> For Vite applications, frontend environment variables exposed to the application must use the `VITE_` prefix.

Do not store private credentials or backend secrets in frontend environment variables.

---

## 4. Start the Frontend

Run:

```
npm run dev
```

The frontend will normally be available at:

```
http://localhost:5173
```

The exact port may vary depending on the Vite configuration.

---

# 🗄️ Database Setup

The application uses MongoDB as its database.

You can configure either:

* Local MongoDB
* MongoDB Atlas

---

## Option 1: Local MongoDB

Make sure MongoDB is installed and running.

Verify the MongoDB Shell:

```
mongosh
```

Connect to the local MongoDB instance if required.

Example connection string:

```
MONGODB_URI=mongodb://localhost:27017/school_management
```

The database will be created automatically when the application writes data to it.

---

## Option 2: MongoDB Atlas

If using MongoDB Atlas:

1. Create an Atlas cluster.
2. Create a database user.
3. Configure network access.
4. Obtain the MongoDB connection string.
5. Add the connection string to the backend `.env` file.

Example:

```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
```

> Never commit a MongoDB Atlas connection string containing credentials.

---

# 🔐 Environment Variables

Environment variables are used to keep application configuration and sensitive values outside the source code.

## Backend Environment Variables

| Variable                | Required | Description                       |
| ----------------------- | -------- | --------------------------------- |
| `PORT`                  | Yes      | Backend server port               |
| `NODE_ENV`              | Yes      | Application environment           |
| `MONGODB_URI`           | Yes      | MongoDB connection string         |
| `JWT_SECRET`            | Yes      | JWT signing secret                |
| `JWT_REFRESH_SECRET`    | Yes      | Refresh-token secret              |
| `JWT_EXPIRY`            | Yes      | JWT expiration duration           |
| `JWT_REFRESH_EXPIRY`    | Yes      | Refresh-token expiration duration |
| `FRONTEND_URL`          | Yes      | Frontend URL used for CORS        |
| `CLOUDINARY_CLOUD_NAME` | Optional | Cloudinary cloud name             |
| `CLOUDINARY_API_KEY`    | Optional | Cloudinary API key                |
| `CLOUDINARY_API_SECRET` | Optional | Cloudinary API secret             |
| `EMAIL_HOST`            | Optional | SMTP host                         |
| `EMAIL_PORT`            | Optional | SMTP port                         |
| `EMAIL_USER`            | Optional | SMTP username                     |
| `EMAIL_PASSWORD`        | Optional | SMTP password                     |

## Frontend Environment Variables

| Variable        | Required | Description          |
| --------------- | -------- | -------------------- |
| `VITE_API_URL`  | Yes      | Backend API base URL |
| `VITE_APP_NAME` | Optional | Application name     |

> The actual environment variables required by the project should always match the variables used in the source code and `.env.example`.

---

# ▶️ Running the Application

The backend and frontend should be started in separate terminals.

## Terminal 1 — Backend

```
cd backend
npm install
npm run dev
```

## Terminal 2 — Frontend

```
cd frontend
npm install
npm run dev
```

After both applications start, open the frontend in a browser.

Typical local URLs:

```
Frontend: http://localhost:5173
Backend:  http://localhost:5000
```

---

# 🔄 Application Flow

The local application follows this general architecture:

```
Browser
   │
   ▼
React Frontend
   │
   │ HTTP / REST API
   ▼
Node.js + Express Backend
   │
   │ Mongoose
   ▼
MongoDB
```

The frontend communicates with the backend through the configured API URL.

---

# 🏗️ Build Verification

## Frontend Build

Navigate to the frontend:

```
cd frontend
```

Create a production build:

```
npm run build
```

The generated build is normally available in:

```
frontend/dist/
```

depending on the project configuration.

---

## Backend Verification

The backend does not require a separate build step if it is running as a Node.js application.

If the project defines linting or testing scripts, they can be executed using the corresponding commands from `package.json`.

For example:

```
npm run lint
```

or:

```
npm test
```

> Only use commands that are actually defined in the project's `package.json`.

---

# 🧪 Development Commands

## Install Dependencies

Backend:

```
cd backend
npm install
```

Frontend:

```
cd frontend
npm install
```

---

## Start Backend

```
cd backend
npm run dev
```

---

## Start Frontend

```
cd frontend
npm run dev
```

---

## Run Tests

If tests are configured:

```
npm test
```

---

## Run Linting

If ESLint is configured:

```
npm run lint
```

---

# 🛠️ Troubleshooting

## MongoDB Connection Error

If the backend cannot connect to MongoDB:

1. Make sure MongoDB is running.
2. Verify the `MONGODB_URI`.
3. Verify the MongoDB port.
4. If using Atlas, verify database credentials.
5. Check Atlas network access configuration.

Example local configuration:

```
MONGODB_URI=mongodb://localhost:27017/school_management
```

---

## Port Already in Use

If you see an error such as:

```
EADDRINUSE
```

check which process is using the port.

For macOS/Linux:

```
lsof -i :5000
```

If required, terminate the process:

```
kill <PID>
```

Alternatively, change the backend port in `.env`:

```
PORT=5001
```

If the backend port is changed, update the frontend API URL accordingly:

```
VITE_API_URL=http://localhost:5001/api
```

Restart the application after changing the configuration.

---

# ❌ CORS Error

If the frontend loads but API requests fail because of CORS:

Check the backend:

```
FRONTEND_URL=http://localhost:5173
```

Check the frontend:

```
VITE_API_URL=http://localhost:5000/api
```

Make sure the frontend URL configured in the backend matches the actual frontend development URL.

Restart the backend after changing `.env`.

---

# ❌ Frontend Cannot Connect to Backend

Check that the backend is running:

```
cd backend
npm run dev
```

Then verify:

```
VITE_API_URL=http://localhost:5000/api
```

Open browser Developer Tools and check:

```
Developer Tools → Network
```

Verify:

* Request URL
* Request method
* Status code
* Response
* Network errors

Also check the browser console for CORS or runtime errors.

---

# ❌ Environment Variables Not Working

## Backend

Make sure `.env` exists inside the backend directory:

```
backend/
├── .env
├── package.json
└── ...
```

Restart the backend after changing environment variables.

## Frontend

Make sure Vite variables use the `VITE_` prefix.

Example:

```
VITE_API_URL=http://localhost:5000/api
```

Restart the frontend development server after modifying `.env`.

---

# ❌ Dependency Installation Problems

Check Node.js and npm versions:

```
node --version
npm --version
```

If dependencies need to be reinstalled:

Backend:

```
cd backend
rm -rf node_modules
npm install
```

Frontend:

```
cd frontend
rm -rf node_modules
npm install
```

If a valid `package-lock.json` exists, use:

```
npm ci
```

---

# 🔒 Environment Security

Never commit sensitive environment configuration to Git.

Do not commit:

```
.env
.env.local
.env.production
```

Use `.env.example` to document required variables without exposing real values.

Example:

```
MONGODB_URI=
JWT_SECRET=
JWT_REFRESH_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASSWORD=
```

Never hardcode sensitive credentials in source code.

Avoid:

```
const password = "my-secret-password";
```

Use environment variables:

```
const password = process.env.SOME_SECRET;
```

Before committing changes, check:

```
git status
```

Review changes when required:

```
git diff
```

Make sure no environment file containing real credentials is staged or committed.

---

# 📚 Related Documentation

* `README.md` — Project overview, features, architecture, and technology stack
* `QUICK_START.md` — Quick local setup
* `SETUP.md` — Detailed development setup
* `WALKTHROUGH.md` — Application features and workflows
* `API_DOCUMENTATION.md` — API reference, if maintained separately

---

# ✅ Setup Checklist

Before starting development, verify:

```
[ ] Node.js installed
[ ] npm installed
[ ] Git installed
[ ] MongoDB configured
[ ] Repository cloned
[ ] Backend dependencies installed
[ ] Frontend dependencies installed
[ ] Backend .env configured
[ ] Frontend .env configured
[ ] MongoDB connection verified
[ ] Backend starts successfully
[ ] Frontend starts successfully
[ ] Frontend can communicate with backend
[ ] No unexpected CORS errors
[ ] Environment files are excluded from Git
[ ] Frontend build completes successfully
```

---

# 📌 Notes

* Keep sensitive credentials outside the source code.
* Keep `.env` files out of Git.
* Use `.env.example` for documenting configuration requirements.
* Keep API details in `API_DOCUMENTATION.md`.
* Keep application workflows and feature explanations in `WALKTHROUGH.md`.
* Keep project overview and roadmap information in `README.md`.
* Keep deployment-specific instructions in separate deployment documentation.
