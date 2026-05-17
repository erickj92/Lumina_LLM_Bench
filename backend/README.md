# Lumina Bench Backend

FastAPI-based backend for Lumina Bench — provides user authentication (JWT) and global leaderboard aggregation.

## Quick Start

```bash
# 1. Create virtual environment (one-time)
python3 -m venv .venv

# 2. Install dependencies
.venv/bin/pip install -r requirements.txt

# 3. Start the API server (with hot-reload)
.venv/bin/uvicorn main:app --reload
```

The server will be available at `http://localhost:8000`.
API docs (Swagger UI) at `http://localhost:8000/docs`.

## Two-Terminal Workflow

```
Terminal 1:          cd backend && .venv/bin/uvicorn main:app --reload
Terminal 2:          cd .. && npm run dev        # Vite frontend on :5173
```

The Vite dev server proxies `/auth` and `/results` requests to the FastAPI backend on port `8000`, so the frontend doesn't need to know the backend URL.

## API Endpoints

| Method | Path               | Description                          |
|--------|--------------------|--------------------------------------|
| GET    | `/`                | App info                             |
| GET    | `/health`          | Health check                         |
| POST   | `/auth/register`   | Register a new user                  |
| POST   | `/auth/login`      | Login, receive JWT token             |
| POST   | `/results/submit`  | Submit a benchmark result            |
| GET    | `/results/global`  | Aggregated leaderboard stats         |
| GET    | `/results/recent`  | Most recent results (latest first)   |

## Dependencies

- **FastAPI** — Web framework
- **Uvicorn** — ASGI server
- **SQLAlchemy** — ORM (SQLite)
- **Pydantic** — Schema validation
- **python-jose** — JWT creation/validation (HMAC-SHA256)
- **passlib** — bcrypt password hashing
- **python-multipart** — Form parsing (reserved for future use)

## Database

SQLite file (`lumina_bench.db`) is created automatically in the `backend/` directory on first run. No external database setup required.

## Notes

- JWT tokens expire after 72 hours
- The secret key in `auth.py` is a dev default — **change it for production**
- Results can be submitted anonymously (no token) or authenticated (linked to a user)
- No API keys, prompts, or sensitive data are stored — only anonymized metrics