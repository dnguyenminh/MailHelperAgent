# 📧 Outlook Email Helper Agent

AI-powered Outlook Add-in that reads your emails, summarizes conversation threads, and suggests professional replies — all running locally (no cloud API needed).

**Supports 2 AI modes:**
- 🌐 **Ollama API** — Use any Ollama model (7B+ recommended for quality)
- 💻 **Embedded GGUF** — No external dependency, CPU-only, runs in-process

## Features

- **📖 Read Email** — Automatically extracts email metadata and body content via Office.js
- **📋 Summarize** — AI generates 3-7 bullet-point summaries of email threads (Vietnamese)
- **💬 Suggest Replies** — 2-3 reply options with different tones (agree, decline, ask more)
- **⚡ One-Click Insert** — Selected reply auto-inserted into Outlook Reply All form
- **🔒 100% Local** — No data leaves your machine

## Architecture

```
┌─────────────────────┐     POST /api/analyze-email     ┌──────────────────────┐
│  Outlook Add-in     │ ─────────────────────────────► │  Backend Server       │
│  (TypeScript)       │ ◄───────────────────────────── │  (Python/Node/Java)   │
│  localhost:3000     │     { summary, replies }        │  localhost:8000       │
└─────────────────────┘                                 │                       │
                                                        │  ┌─────────────────┐  │
                                                        │  │ AI_MODE=ollama  │  │
                                                        │  │ → Ollama API    │  │
                                                        │  │                 │  │
                                                        │  │ AI_MODE=embedded│  │
                                                        │  │ → GGUF in-proc  │  │
                                                        │  └─────────────────┘  │
                                                        └──────────────────────┘
```

## Prerequisites

- **Node.js** 18+ and npm
- **Outlook** Desktop (Windows/Mac) or Outlook Web
- For **Ollama mode**: Ollama installed + model pulled
- For **Embedded mode**: ~4GB free RAM + GGUF model downloaded

## Quick Start

### 1. Clone & Install Frontend

```bash
git clone https://github.com/dnguyenminh/MailHelperAgent.git
cd MailHelperAgent
npm install
```

### 2. Setup AI (choose one mode)

#### Mode A: Ollama API (better quality, needs Ollama)

```bash
# Install Ollama: https://ollama.ai
ollama pull qwen2.5:7b-instruct-q4_K_M
ollama serve
```

#### Mode B: Embedded GGUF (no dependencies, CPU-only)

```bash
cd models
pip install huggingface-hub
huggingface-cli download Qwen/Qwen2.5-3B-Instruct-GGUF qwen2.5-3b-instruct-q4_k_m.gguf --local-dir .
cd ..
```

### 3. Start Backend (choose one language)

#### Python (recommended)

```bash
cd backend
pip install -r requirements.txt

# Ollama mode (default)
python run.py

# Embedded mode
# pip install llama-cpp-python
# AI_MODE=embedded python run.py
```

#### Node.js

```bash
cd backend-nodejs
npm install

# Ollama mode (default)
npm start

# Embedded mode
# AI_MODE=embedded npm start
```

#### Java (Spring Boot)

```bash
cd backend-java
mvn spring-boot:run
```

### 4. Start Frontend

```bash
# In project root
npm run dev-server
```

### 5. Sideload into Outlook

- **Outlook Desktop**: Run `npm start` (auto-sideloads)
- **Outlook Web**: Settings → Manage Add-ins → Custom Add-ins → Add from file → `manifest.json`

## Configuration

| Env Variable | Default | Description |
|-------------|---------|-------------|
| `AI_MODE` | `ollama` | AI mode: `ollama` or `embedded` |
| `OLLAMA_MODEL` | `qwen2.5:7b-instruct-q4_K_M` | Ollama model name |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama server URL |
| `MODEL_PATH` | `models/qwen2.5-3b-instruct-q4_k_m.gguf` | Path to GGUF model (embedded mode) |
| `PORT` | `8000` | Backend server port |

## Project Structure

```
MailHelperAgent/
├── src/taskpane/           # Frontend (TypeScript + Office.js)
│   ├── taskpane.ts         # Main entry point
│   ├── services/           # Email, API, Insert services
│   ├── state/              # App state manager
│   ├── ui/                 # DOM renderers
│   └── types/              # Shared interfaces
├── backend/                # Python FastAPI (ollama + llama-cpp-python)
├── backend-nodejs/         # Node.js Express (ollama + node-llama-cpp)
├── backend-java/           # Spring Boot (de.kherud:llama)
├── models/                 # GGUF model file (download separately)
├── .github/workflows/      # CI/CD (build + release)
├── documents/              # SDLC docs (BRD, FSD, TDD per ticket)
├── manifest.json           # Outlook Add-in manifest
└── webpack.config.js       # Build configuration
```

## API Contract

All backends expose the same API:

```
GET /health
→ { "status": "ok", "mode": "ollama|embedded", "model": "..." }

POST /api/analyze-email
Content-Type: application/json

Request:
{ "subject": "Re: Meeting", "body": "Hi team..." }

Response:
{
  "summary": ["Point 1", "Point 2", "Point 3"],
  "suggestedReplies": [
    { "label": "Đồng ý", "content": "Hi,\n\nTôi đồng ý...", "tone": "positive" },
    { "label": "Từ chối", "content": "Hi,\n\nRất tiếc...", "tone": "negative" }
  ],
  "processingTime": 5000,
  "model": "qwen2.5:7b-instruct-q4_K_M (ollama)"
}
```

## Choosing the Right Mode

| Criteria | Ollama | Embedded |
|----------|--------|----------|
| Quality | ⭐⭐⭐⭐⭐ (7B model) | ⭐⭐⭐ (3B model) |
| Speed | ~3-5s (GPU) / ~10s (CPU) | ~5-10s (CPU) |
| Setup | Install Ollama + pull model | Download 1 GGUF file |
| RAM needed | 8GB+ | 4GB |
| GPU needed | Optional (helps speed) | No |
| Dependencies | Ollama server running | None (in-process) |

## Development

```bash
npm run build        # Build frontend
npm run lint         # Lint check
npm run watch        # Watch mode
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | TypeScript, Office.js, Webpack, Fluent UI |
| Backend (Python) | FastAPI, ollama / llama-cpp-python |
| Backend (Node.js) | Express, ollama / node-llama-cpp |
| Backend (Java) | Spring Boot 3.3, de.kherud:llama (JNI) |
| AI Models | Qwen2.5-7B (Ollama) / Qwen2.5-3B-GGUF (Embedded) |

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.1.1 | 2026-06-02 | Code review fixes: debounce, accessibility, configurable URL, startup validation |
| v1.1.0 | 2026-06-02 | Dual-mode AI (Ollama + Embedded GGUF) |
| v1.0.0 | 2026-06-02 | Initial release |

## License

MIT
