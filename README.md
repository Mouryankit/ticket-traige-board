# DeskFlow - Support Ticket Triage Board

DeskFlow is a MERN support ticket board with SLA-aware tickets, strict status transitions, filters, and live board updates.

## Structure

- `backend/` - Express, Node.js, MongoDB/Mongoose API
- `frontend/` - React + Vite single-page board UI

## Local Setup

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Set `MONGODB_URI` in `.env` to your MongoDB Atlas connection string.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Set `VITE_API_URL` to your backend URL, for example `http://localhost:5000`.

## API

- `POST /tickets`
- `GET /tickets?status=&priority=&breached=true`
- `PATCH /tickets/:id`
- `DELETE /tickets/:id`
- `GET /tickets/stats`

## Deployment Notes

Backend on Render/Railway/Fly:

- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Environment variables:
  - `MONGODB_URI`
  - `CLIENT_ORIGIN` with your deployed frontend URL

Frontend on Vercel/Netlify/Render Static Site:

- Root directory: `frontend`
- Build command: `npm run build`
- Publish directory: `dist`
- Environment variables:
  - `VITE_API_URL` with your deployed backend URL

Do not leave `VITE_API_URL` pointed at localhost for the deployed frontend.
