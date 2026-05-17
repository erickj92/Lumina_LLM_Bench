# Lumina Bench

A high-performance, privacy-first benchmarking suite for OpenAI-compatible API providers. Run benchmarks directly from your browser with absolute API key privacy.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/react-18-61DAFB.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.0-3178C6.svg)
![Vite](https://img.shields.io/badge/vite-5.0-646CFF.svg)

## ✨ Features

- **🔒 Privacy-First:** Your API keys never leave your browser. All LLM execution happens client-side.
- **📊 Accurate Metrics:** Precise measurement of:
  - **TTFT** (Time to First Token)
  - **TPS** (Tokens Per Second)
  - **Latency** (Time to first response byte)
- **🧠 Reasoning Support:** See and measure reasoning/thinking tokens separately from output tokens.
- **🌐 Universal Compatibility:** Works with any OpenAI-compatible endpoint (OpenAI, Groq, Venice, DeepSeek, Together, Ollama, and more).
- **📱 Responsive UI:** Clean, modern interface with real-time streaming display.
- **⚡ Streaming Architecture:** Benchmarks run with actual streaming responses for authentic TTFT measurement.
- **📈 Visual Dashboard:** Sparkline charts showing performance trends per model/provider.
- **🔐 The Vault:** Secure local storage for your API keys with quick-select.
- **📜 Test History:** Persistent history with filtering, search, and JSON export.
- **🏷️ Custom Providers:** Add your own API endpoints beyond the built-in presets.
- **🏆 Global Leaderboard:** Submit and compare results with the community (anonymous by default).

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/erickj92/Lumina_LLM_Bench.git
cd Lumina_LLM_Bench

# Install frontend dependencies
npm install

# Start the development server
npm run dev
```

Then open `http://localhost:5173` in your browser.

## 📝 Usage

1. **Enter your API details:**
   - Select a provider preset or enter a custom base URL
   - Paste your API key (stored locally, never sent to our servers)
   - Or use "The Vault" to manage and quick-select saved keys

2. **Load models:**
   - Click "Load Models" to fetch available models from the provider
   - Or manually enter a model ID if the fetch fails

3. **Configure your test:**
   - Select a model from the dropdown
   - Adjust max tokens (default: 4096)
   - Modify the system prompt if desired

4. **Run the benchmark:**
   - Click "Run Benchmark"
   - Watch real-time metrics update as the stream arrives

5. **Review results:**
   - TTFT, TPS, and total token counts
   - Collapsible reasoning/thinking view (for supported models)
   - Copy or save your results

6. **View history:**
   - See past benchmarks in the History tab
   - Filter by provider, model, or date
   - Export your history to JSON

7. **Global Leaderboard:**
   - Create an account (optional, username-only)
   - Check "Report to Leaderboard" on benchmark completion
   - View global aggregated stats in the 🏆 Leaderboard tab

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Your Browser                        │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │  React UI   │◄──►│ Stream Test │◄──►│  Provider   │ │
│  │  Components │    │   Engine    │    │   API       │ │
│  └─────────────┘    └─────────────┘    └─────────────┘ │
│         │                  │                           │
│  ┌──────▼──────┐    ┌─────▼──────┐                   │
│  │  IndexedDB  │    │ Zustand    │                   │
│  │  (History)  │    │ (State)    │                   │
│  └─────────────┘    └─────────────┘                   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼ (Optional: Report Results)
┌─────────────────────────────────────────────────────────┐
│                Lumina Bench API (FastAPI)              │
│         Anonymized aggregation only — no API keys      │
└─────────────────────────────────────────────────────────┘
```

## 🔧 Supported Providers

| Provider | Endpoint | Notes |
|----------|----------|-------|
| OpenAI | `https://api.openai.com/v1` | Full support |
| Groq | `https://api.groq.com/openai/v1` | Full support |
| Venice | `https://api.venice.ai/api/v1` | Full support |
| DeepSeek | `https://api.deepseek.com/v1` | Full support |
| Together | `https://api.together.xyz/v1` | Full support |
| Ollama Cloud | `https://ollama.com` | Native `/api/tags` & `/api/chat` |
| Ollama (Local) | `http://localhost:11434` | Native API support |
| **Custom** | *Any URL* | Add your own endpoints |

## 🛠️ Development

### Project Structure

```
src/
├── components/          # React UI components
│   ├── AuthPanel.tsx    # Login/Register UI
│   ├── Dashboard.tsx    # Sparkline grid view
│   ├── HistoryView.tsx  # Test history browser
│   ├── KeyVault.tsx     # API key manager
│   ├── Leaderboard.tsx  # Global leaderboard
│   ├── ModelSelector.tsx # Searchable model dropdown
│   └── StreamTest.tsx   # Main benchmark UI
├── hooks/               # Custom React hooks
│   └── useStreamTest.ts # Test lifecycle management
├── stores/              # Zustand state stores
│   ├── authStore.ts     # Auth token persistence
│   ├── keyStore.ts      # API key persistence
│   ├── historyStore.ts  # History cache
│   └── uiStore.ts       # UI state
├── api/                 # API client
│   └── client.ts        # Backend API calls
├── db/                  # IndexedDB layer
│   └── history.ts       # Test result storage
├── types/               # TypeScript definitions
│   └── index.ts
├── utils/               # Core utilities
│   ├── streaming.ts     # SSE/NDJSON streaming engine
│   └── models.ts        # Model fetching & detection
├── App.tsx
└── main.tsx

backend/                  # FastAPI backend
├── main.py              # FastAPI app entry
├── auth_router.py       # /auth endpoints
├── results_router.py    # /results endpoints
├── database.py          # SQLite connection
├── models.py            # SQLAlchemy models
├── schemas.py           # Pydantic schemas
├── auth.py              # JWT utilities
└── requirements.txt     # Python deps
```

### Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS, shadcn/ui
- **State:** Zustand
- **Storage:** IndexedDB (idb library)
- **Visualization:** Recharts
- **Backend:** FastAPI + SQLite
- **Auth:** JWT with bcrypt password hashing

### Building for Production

```bash
npm run build
```

Output goes to `dist/` — deploy as a static site.

## 🌐 Deployment

### Prerequisites

- **Docker + Docker Compose** installed on your server
- A **reverse proxy** (e.g., [Nginx Proxy Manager](https://nginxproxymanager.com/)) for SSL/HTTPS
- A domain/subdomain pointed to your server

### Deployment Method: Docker Compose (Recommended)

This project uses **Docker Compose** with **build-from-source** approach (no pre-built images). The Docker setup builds everything locally on your server.

**Assumptions:**
- You have a reverse proxy (like Nginx Proxy Manager) handling SSL certificates
- Your reverse proxy will forward traffic to the exposed Docker port

**Steps:**

```bash
# 1. Clone the repository to your server
git clone https://github.com/erickj92/Lumina_LLM_Bench.git
cd Lumina_LLM_Bench

# 2. Configure environment
cp backend/.env.example backend/.env
nano backend/.env  # Edit with your settings (see below)

# 3. Build and start services
docker compose up --build -d

# 4. Configure your reverse proxy
# - Point your domain (e.g., lumina.yourdomain.com) to your server's IP
# - In Nginx Proxy Manager: Add Proxy Host → Forward to http://your-server-ip:PORT
# - Enable SSL with Let's Encrypt
```

**`backend/.env` Configuration:**

```bash
# Required - Generate with: openssl rand -hex 32
SECRET_KEY=your-random-secret-key-here

# Database location (inside container)
DATABASE_URL=sqlite:///data/lumina_bench.db

# CORS - Add your domain when using HTTPS
CORS_ORIGINS=https://lumina.yourdomain.com,http://localhost:5173
```

**Docker Compose Details:**

| Service | Exposes | Purpose |
|---------|---------|---------|
| `frontend` | `PORT` (default: 80) | nginx:alpine serving static files + reverse proxy to backend |
| `backend` | Internal only | FastAPI + uvicorn API server |
| `lumina_data` | Volume | SQLite database persistence |

**Default Port Mapping:**
- Frontend container port 80 is mapped to host port 80
- Change in `docker-compose.yml` if port 80 is already in use:
  ```yaml
  ports:
    - "3000:80"  # Use host port 3000 instead
  ```

**Reverse Proxy Example (Nginx Proxy Manager):**

| Setting | Value |
|---------|-------|
| Domain Names | `lumina.yourdomain.com` |
| Scheme | `http` |
| Forward Hostname/IP | `your-vps-ip` |
| Forward Port | `80` (or whatever you mapped to) |
| SSL | Request a new SSL certificate |

### Option C: Static Frontend Only (No Leaderboard)

If you only need local testing without the global leaderboard features:

```bash
npm run build
# Deploy dist/ to any static host (Netlify, Vercel, GitHub Pages, etc.)
```

*Note: Without the backend, features like user accounts and the global leaderboard will not be available.*

### Option B: Full Stack with Backend (Recommended)

For the complete experience including user accounts and global leaderboard:

**1. Backend Setup:**

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --host 0.0.0.0 --port 8000
```

```bash
# Update API URL for production
# Edit src/api/client.ts and change BASE_URL to your backend URL

npm run build
```

**3. Deploy:**

- **Backend:** Run uvicorn behind a reverse proxy (nginx, Caddy) with HTTPS
- **Frontend:** Deploy `dist/` to your static host
- **Database:** SQLite file is created automatically; back it up regularly

**Environment Variables:**

Create a `.env` file in `backend/`:

```bash
# Required
SECRET_KEY=your-random-secret-key-here  # Generate with: openssl rand -hex 32

# Optional
DATABASE_URL=sqlite:///lumina_bench.db  # Default location
CORS_ORIGINS=https://yourdomain.com      # Frontend domain
```

**Reverse Proxy Example (nginx):**

```nginx
server {
    listen 443 ssl;
    server_name api.luminabench.example;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🔒 Security

- **Zero server-side LLM proxy:** Your API keys go directly from your browser to your chosen provider.
- **No key storage on our servers:** Keys are stored in your browser's local storage only.
- **Optional anonymous reporting:** Only TTFT, TPS, provider name, and model ID are sent to our aggregation API (if you choose to report results).
- **No email required:** Accounts are username-only. No password recovery mechanism.

## 🗺️ Roadmap

- [x] Phase 1: Core streaming engine with TTFT/TPS calculation
- [x] Phase 2: Dashboard UI with Tailwind, shadcn/ui, Recharts, and IndexedDB persistence
- [x] Phase 3: FastAPI backend for global leaderboard, user auth, and result aggregation
- [x] Phase 4: Docker Compose setup and VPS deployment


## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines and submit PRs.

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

---

<p align="center">Built with ⚡ by the Lumina Bench team</p>
