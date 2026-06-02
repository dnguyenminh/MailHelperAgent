# 📧 Outlook Email Helper Agent

AI-powered Outlook Add-in that reads your emails, summarizes conversation threads, and suggests professional replies — all running locally with an embedded LLM (no cloud API needed).

## Features

- **📖 Read Email** — Automatically extracts email metadata and body content via Office.js
- **📋 Summarize** — AI generates 3-5 bullet-point summaries of email threads (Vietnamese)
- **💬 Suggest Replies** — 2-3 reply options with different tones (agree, decline, ask more)
- **⚡ One-Click Insert** — Selected reply auto-inserted into Outlook Reply All form

## Architecture

```
┌─────────────────────┐     POST /api/analyze-email     ┌──────────────────┐
│  Outlook Add-in     │ ─────────────────────────────► │  Backend Server  │
│  (TypeScript)       │ ◄───────────────────────────── │  (Python/Node/   │
│  localhost:3000     │     { summary, replies }        │   Java)          │
└─────────────────────┘                                 │  localhost:8000  │
                                                        │                  │
                                                        │  ┌────────────┐  │
                                                        │  │ GGUF Model │  │
                                                        │  │ (embedded) │  │
                                                        │  └────────────┘  │
                                                        └──────────────────┘
```

**100% local** — No data leaves your machine. Model runs embedded in-process (CPU-only).

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+ (for Python backend) OR **Java** 21+ (for Java backend)
- **Outlook** Desktop (Windows/Mac) or Outlook Web
- **~4GB free RAM** for the AI model

## Quick Start

### 1. Clone & Install Frontend

```bash
git clone https://github.com/dnguyenminh/MailHelperAgent.git
cd MailHelperAgent
npm install
```

### 2. Download AI Model (~1.9 GB)

```bash
cd models
# Option A: huggingface-cli
pip install huggingface-hub
huggingface-cli download Qwen/Qwen2.5-3B-Instruct-GGUF qwen2.5-3b-instruct-q4_k_m.gguf --local-dir .

# Option B: Direct download from HuggingFace website
# https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF
```

### 3. Start Backend (choose one)


#### Option A: Python (recommended)

```bash
cd backend
pip install -r requirements.txt
python run.py
# Server starts at http://localhost:8000
```

#### Option B: Node.js

```bash
cd backend-nodejs
npm install
npm start
# Server starts at http://localhost:8000
```

#### Option C: Java (Spring Boot)

```bash
cd backend-java
mvn spring-boot:run
# Server starts at http://localhost:8000
```

### 4. Start Frontend (Outlook Add-in)

```bash
# In project root
npm run dev-server
# Add-in available at https://localhost:3000
```

### 5. Sideload into Outlook

- **Outlook Desktop**: Run `npm start` (auto-sideloads via manifest.json)
- **Outlook Web**: Settings → Manage Add-ins → My Add-ins → Custom Add-ins → Add from file → select `manifest.json`

## Project Structure

```
MailHelperAgent/
├── src/taskpane/           # Frontend (TypeScript + Office.js)
│   ├── taskpane.ts         # Main entry point
│   ├── taskpane.html       # UI layout
│   ├── taskpane.css        # Styles (Fluent UI)
│   ├── types/              # Shared interfaces
│   ├── services/           # Email, API, Insert services
│   ├── state/              # App state manager
│   └── ui/                 # DOM renderer
├── backend/                # Python FastAPI + llama-cpp-python
├── backend-nodejs/         # Node.js Express + node-llama-cpp
├── backend-java/           # Spring Boot + de.kherud:llama
├── models/                 # GGUF model file (download separately)
├── manifest.json           # Outlook Add-in manifest
├── webpack.config.js       # Build configuration
└── documents/              # SDLC documentation (BRD, FSD, TDD)
```

## API Contract

All backends expose the same API:

```
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
  "model": "qwen2.5-3b-instruct (embedded GGUF)"
}
```

## Configuration

| Env Variable | Default | Description |
|-------------|---------|-------------|
| `MODEL_PATH` | `models/qwen2.5-3b-instruct-q4_k_m.gguf` | Path to GGUF model file |
| `PORT` | `8000` | Backend server port |

## Development

```bash
# Build frontend
npm run build

# Lint
npm run lint

# Watch mode
npm run watch
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | TypeScript, Office.js, Webpack, Fluent UI |
| Backend (Python) | FastAPI, llama-cpp-python, Pydantic |
| Backend (Node.js) | Express, node-llama-cpp |
| Backend (Java) | Spring Boot 3.3, de.kherud:llama (JNI) |
| AI Model | Qwen2.5-3B-Instruct (GGUF Q4_K_M) |

## License

MIT
