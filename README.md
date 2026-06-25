# ChaosPulse: API Resilience & Observability Platform

ChaosPulse (APIPulse) is a premium, developer-centric dashboard and backend suite designed to test, analyze, and grade the resilience of your HTTP APIs. It simulates real-world network turbulence, runs concurrent load tests, inspects SSL statuses, and outputs comprehensive health reports.

The platform is designed with a high-tech dark matrix theme featuring green, gold, and burnt-orange color tones, providing a sharp and developer-friendly terminal aesthetic.

---

## 🚀 Key Features

* **API Health Analyzer**: Retrieves status codes, response times, payload sizes, headers, and SSL certificate validity/expiration details.
* **Load Testing Lab**: Allows running high-concurrency requests (10, 50, or 100 requests) to benchmark latency and identify throughput bottlenecks.
* **Chaos Engineering Simulator**: Injects artificial faults into target endpoints to verify system resilience, including:
  * **Latency Injection**: Adds artificial response delay.
  * **Timeout Simulation**: Aborts connection if responses exceed threshold limits.
  * **Packet Loss**: Randomly drops outgoing packages to test failover logic.
  * **Retry Backoff**: Simulates recovery flow across multiple retry-attempts using exponential backoff.
* **Resilience Scoring & Reports**: Generates automated grading cards indicating API reliability, performance scores, and configuration recommendations.

---

## 🛠️ Technology Stack

### Backend
* **Core Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.12+)
* **Database**: [PostgreSQL](https://www.postgresql.org/) (SQLAlchemy ORM)
* **Caching & Rate Limiting**: [Redis](https://redis.io/)
* **Package Manager**: [uv](https://github.com/astral-sh/uv) (ultra-fast Python package installer)

### Frontend
* **Core Framework**: [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
* **Build System**: [Vite](https://vite.dev/)
* **State & Fetching**: [TanStack Query v5](https://tanstack.com/query)
* **Styling**: [TailwindCSS v4](https://tailwindcss.com/)
* **Icons**: [Lucide React](https://lucide.dev/)

---

## ⚙️ Project Structure

```
APIPulse/
├── backend/               # FastAPI Application
│   ├── app/               # Main Backend Logic
│   │   ├── api/           # Router & Endpoints
│   │   ├── database/      # DB Engine & Sessions
│   │   ├── models/        # SQLAlchemy Models
│   │   ├── schemas/       # Pydantic Request/Response Models
│   │   ├── services/      # Business Logic (Chaos, Load Testing, SSL)
│   │   └── config.py      # App configuration using pydantic-settings
│   ├── pulse/             # Python Virtual Environment
│   └── requirements.txt   # Backend Dependencies
├── frontend/              # React Frontend Application
│   ├── public/            # Static assets (glowing custom favicon.svg)
│   ├── src/               # React Components and Styles
│   │   ├── components/    # Tab Views (Analyzer, Chaos Lab, Load Testing, Reports)
│   │   ├── index.css      # Core styles & Tailwind v4 Custom Theme Setup
│   │   └── App.tsx        # Main layout and routing
│   └── package.json       # Frontend Dependencies & Scripts
├── docker/                # Containered Infrastructure
│   └── docker-compose.yml # PostgreSQL & Redis service definitions
└── .gitignore             # Workspace-level Git ignore settings
```

---

## 🔌 Setup & Local Development

Follow these steps to run the complete stack locally:

### 1. Run Databases (Docker Compose)
Ensure Docker is running, then spin up the PostgreSQL and Redis containers:
```bash
docker compose -f docker/docker-compose.yml up -d
```

### 2. Set Up the Backend
Navigate to the `backend/` directory, activate the virtual environment, install requirements, and run the server:
```bash
cd backend

# Activate the virtual environment
source pulse/bin/activate

# Install dependencies using uv
uv pip install -r requirements.txt

# Start the FastAPI backend
python -m app.main
```
The backend API server will start on `http://localhost:8000`. You can access the interactive OpenAPI documentation at `http://localhost:8000/docs`.

### 3. Set Up the Frontend
Open a new terminal window, navigate to the `frontend/` directory, install Node dependencies, and start the Vite dev server:
```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite developer server
npm run dev
```
The frontend will start running (typically on `http://localhost:5173` or fallback to `http://localhost:5174` if port 5173 is occupied).

---

## 🎛️ Configuration & Environment Variables

The backend application uses environment variables for easy overrides. You can configure these in `backend/.env`:

* **`DATABASE_URL`**: Connection string for PostgreSQL (Defaults to `postgresql://postgres:postgres@localhost:5432/chaospulse`).
* **`REDIS_URL`**: Connection string for Redis cache (Defaults to `redis://localhost:6379/0`).
* **`HOST` / `PORT`**: The host address and port the backend binds to.
* **`CORS_ORIGINS`**: A comma-separated string of frontend domains allowed to query the backend:
  ```env
  CORS_ORIGINS="http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173"
  ```
