# ACUA Social Media Application

A fullstack social media application built with React, Node.js, and SQLite (PostgreSQL-ready).

## Features

### Core Features

- ✅ User registration and authentication (JWT)
- ✅ Shared timeline for all users (sorted by date, newest first)
- ✅ Create, edit, and delete posts
- ✅ Comment on posts (collapsible comment sections)
- ✅ Search posts by text or username
- ✅ Profile management (update display name)
- ✅ Admin role with elevated permissions
- ✅ Avatar initials display
- ✅ Soft delete (admins can see deleted content)

### Bonus Features

- ✅ Edited indicators (shows "edited" and "edited by admin")
- ✅ Loading states during API calls
- ✅ Delete confirmation dialogs
- ✅ Navbar with user info and navigation
- ✅ Home page for unauthenticated users

## Tech Stack

- **Frontend**: React, Tailwind CSS, React Router, Axios
- **Backend**: Node.js, Express, JWT, bcryptjs
- **Database**: PostgreSQL (pg)
- **Runtime**: Bun

## Setup Instructions

### Prerequisites

- Bun (latest version)

### Backend Setup

1. Navigate to the backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
bun install
```

3. Create a `.env` file in the backend directory with your database credentials:

```bash
PORT=3001
JWT_SECRET=your-secret-key-change-in-production
DATABASE_URL=postgresql://postgres:fV0LFPR7mKTroJ9m@db.rxwcfhspknhkiykojsme.supabase.co:5432/postgres
```

4. Start the backend server:

```bash
bun run start
# or for development with auto-reload:
bun run dev
```

The backend will run on `http://localhost:3001`

### Frontend Setup

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
bun install
```

3. Start the development server:

```bash
bun run dev
```

The frontend will run on `http://localhost:3000`

## Usage

1. Start both backend and frontend servers
2. Open `http://localhost:3000` in your browser
3. Register a new account (you can choose "user" or "admin" role)
4. Start posting and interacting with the timeline!

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Posts

- `GET /api/posts` - Get all posts (timeline)
- `GET /api/posts/search?q=query` - Search posts
- `POST /api/posts` - Create post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post

### Comments

- `GET /api/comments/post/:postId` - Get comments for a post
- `POST /api/comments` - Create comment
- `PUT /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment

### Users

- `PUT /api/users/profile` - Update profile

## Database Schema

The application uses PostgreSQL with the following tables:

- `users` - User accounts
- `posts` - User posts
- `comments` - Comments on posts

All tables support soft deletes (deleted flag) and track edit history.

## Security

- All API endpoints (except auth) require JWT authentication
- Passwords are hashed using bcrypt
- Permission checks enforced on backend
- Admin-only features protected by middleware

## Notes

- The database is initialized automatically on first server start
- The application uses PostgreSQL with connection pooling for better performance
- Tables are created automatically if they don't exist
- The code automatically converts MySQL-style queries to PostgreSQL syntax for compatibility
