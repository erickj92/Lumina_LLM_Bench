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

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/lumina-bench.git
cd lumina-bench

# Install dependencies
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
│   ├── Dashboard.tsx    # Sparkline grid view
│   ├── HistoryView.tsx  # Test history browser
│   ├── KeyVault.tsx     # API key manager
│   ├── ModelSelector.tsx # Searchable model dropdown
│   └── StreamTest.tsx   # Main benchmark UI
├── hooks/               # Custom React hooks
│   └── useStreamTest.ts # Test lifecycle management
├── stores/              # Zustand state stores
│   ├── keyStore.ts      # API key persistence
│   ├── historyStore.ts  # History cache
│   └── uiStore.ts       # UI state
├── db/                  # IndexedDB layer
│   └── history.ts       # Test result storage
├── types/               # TypeScript definitions
│   └── index.ts
├── utils/               # Core utilities
│   ├── streaming.ts     # SSE/NDJSON streaming engine
│   └── models.ts        # Model fetching & detection
├── App.tsx
└── main.tsx
```

### Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS, shadcn/ui
- **State:** Zustand
- **Storage:** IndexedDB (idb library)
- **Visualization:** Recharts
- **Backend:** FastAPI + SQLite (Phase 3)

### Building for Production

```bash
npm run build
```

Output goes to `dist/` — deploy as a static site.

## 🔒 Security

- **Zero server-side LLM proxy:** Your API keys go directly from your browser to your chosen provider.
- **No key storage on our servers:** Keys are stored in your browser's local storage only.
- **Optional anonymous reporting:** Only TTFT, TPS, provider name, and model ID are sent to our aggregation API (if you choose to report results).

## 🗺️ Roadmap

- [x] Phase 1: Core streaming engine with TTFT/TPS calculation
- [x] Phase 2: Dashboard UI with Tailwind, shadcn/ui, Recharts, and IndexedDB persistence
- [ ] Phase 3: FastAPI backend for global leaderboard and result aggregation
- [ ] Phase 4: Docker Compose setup and VPS deployment

See [`VIBES.md`](./VIBES.md) for detailed internal project tracking.

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines and submit PRs.

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

---

<p align="center">Built with ⚡ by the Lumina Bench team</p>
