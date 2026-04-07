# OrgaNote

OrgaNote is a minimalist productivity tool that auto-formats messy to-do lists into clean, structured, and visually organized tasks. Unlike Notion or Todoist, it prioritizes simplicity—just write, click, and get clarity. Designed to reduce cognitive load, OrgaNote blends the ease of jotting things down with the power of automation.

## Features

- **Smart Task Input** - Write tasks in natural language, and the NLP engine automatically parses and organizes them
- **Multiple Views** - Switch between List and Kanban board views to organize tasks your way
- **Task Organization** - Categorize tasks (Work, School, Personal, Other) and set priorities (High, Medium, Low)
- **Calendar Integration** - Visualize tasks on a calendar with due dates
- **Progress Tracking** - Monitor your completion progress with visual indicators
- **Customizable Theme** - Personalize colors and fonts to match your style
- **Drag & Drop** - Easily move tasks between statuses in Kanban view
- **Search & Filter** - Quickly find tasks with the search functionality

## Tech Stack

### Frontend
- **React** 
- **Vite** - Fast build tool
- **Ant Design** - UI component library
- **CSS** - Custom styling with theme variables

### Backend
- **Node.js/Express** - REST API server
- **PostgreSQL** - Relational database
- **Chrono-node** - Natural language date parsing
- **Docker** - Containerization

## Deploying To Railway

This project is easiest to deploy to Railway as 3 services:

1. `PostgreSQL`
2. `backend` from `backend/`
3. `frontend` from `frontend/`

### 1. Push the repo to GitHub

Railway deploys cleanly from a GitHub repo. Push this repository first.

### 2. Create a PostgreSQL service

In Railway:

1. Create a new project.
2. Add `PostgreSQL`.
3. Keep the generated `DATABASE_URL`; Railway will provide it automatically to linked services.

### 3. Deploy the backend service

Create a new Railway service from this repo and set the root directory to `backend`.

Recommended settings:

- Start command: `npm start`
- Environment variables:
	- `DATABASE_URL` = reference the Railway Postgres service variable
	- `PORT` = leave unset; Railway provides this automatically
	- `NODE_ENV` = `production`

Notes:

- The backend already listens on `0.0.0.0`, which Railway requires.
- The database client now supports Railway's hosted Postgres SSL connection.

### 4. Deploy the frontend service

Create another Railway service from this repo and set the root directory to `frontend`.

Use the included `frontend/Dockerfile` so Railway builds and serves the Vite app as a production static site.

Set this environment variable on the frontend service:

- `VITE_API_URL` = your backend public URL plus `/api`

Example:

- `VITE_API_URL=https://your-backend-service.up.railway.app/api`

The frontend now reads `VITE_API_URL` instead of calling localhost directly.

### 5. Redeploy after setting variables

After the backend gets a public Railway URL:

1. Copy that URL.
2. Set `VITE_API_URL` on the frontend service.
3. Redeploy the frontend service.

### 6. Optional custom domains

If you add custom domains later:

- Point the frontend domain to the frontend Railway service.
- Update `VITE_API_URL` if the backend domain changes.

### Local vs Railway

- Local frontend can still use the default `/api` path if you proxy requests, or you can set `VITE_API_URL=http://localhost:3002/api` in a local frontend env file.
- Local backend still defaults to `postgresql://organote:organote@localhost:15432/organote`.


