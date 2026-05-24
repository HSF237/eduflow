# EduFlow — School Management System

A modern school management platform for teachers, parents, and principals.

## Features

- **Attendance** — Mark, edit, and track daily attendance with analytics
- **Homework** — Teachers post assignments; parents see them on their dashboard
- **Timetable** — Class-wise schedule visible to parents in real time
- **Announcements** — Broadcast messages to all parents in a class
- **Parent Portal** — Secure per-student login codes (no class-wide sharing)
- **Messaging** — Direct teacher ↔ parent communication
- **Leave Management** — Parents apply for leave; teachers approve or reject
- **Exam & Marks** — Enter and view student results
- **Principal Dashboard** — School-wide overview and management

## Tech Stack

- React 18 + Vite
- Tailwind CSS
- Firebase (Auth + Firestore)
- Deployed on Vercel

## Local Setup

```bash
cd frontend
npm install
npm run dev
```

## Deployment

Connected to Vercel. Every push to `main` auto-deploys.

- **Root Directory:** `frontend`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
