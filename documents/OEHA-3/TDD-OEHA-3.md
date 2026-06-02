# Technical Design Document (TDD)

## Outlook Email Helper Agent — OEHA-3: Summarize Mail Loop

---

## Document Information

| Field | Value |
|-------|-------|
| Jira Ticket | OEHA-3 |
| Title | Summarize Mail Loop - Tóm tắt chuỗi email bằng AI |
| Author | SA Agent |
| Version | 1.0 |
| Date | 2025-01-20 |
| Status | Draft |
| Related BRD | BRD-v1-OEHA-3.docx |
| Related FSD | FSD-v1-OEHA-3.docx |

---

## 1. Introduction

### 1.1 Purpose

Technical implementation cho summarize email feature: Python FastAPI backend, Ollama integration, frontend API client, summary UI.

### 1.2 Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend | Python + FastAPI | 3.11+ / 0.100+ |
| AI SDK | ollama (Python) | 0.3+ |
| LLM | Ollama llama3:8b | Latest |
| Frontend | TypeScript | 5.4+ |
| HTTP | fetch API | Native |

### 1.3 Constraints

- Ollama must be running before backend starts
- Model must be pulled: `ollama pull llama3`
- RAM >= 8GB free for 7B-8B model
- CORS configured for localhost:3000

---

## 2. System Architecture

### 2.1 Overview

```
Outlook Add-in (localhost:3000)
    │ POST /api/analyze-email
    ▼
FastAPI Backend (localhost:8000)
    │ ollama.generate()
    ▼
Ollama Server (localhost:11434) → llama3:8b model
```

### 2.2 Components

| Component | File | Responsibility |
|-----------|------|---------------|
| FastAPI App | `backend/main.py` | HTTP, CORS, routing |
| EmailAnalyzer | `backend/services/analyzer.py` | Prompt, Ollama call |
| TextPreprocessor | `backend/services/preprocessor.py` | Clean, truncate |
| Models | `backend/models.py` | Pydantic schemas |
| API Client | `src/taskpane/services/api-client.ts` | fetch wrapper |
| Summary UI | `src/taskpane/ui/summary-renderer.ts` | Render bullets |

---

## 3. API Design

### 3.1 POST /api/analyze-email

**Request:**
```json
{ "subject": "string (max 500)", "body": "string (max 32000)" }
```

**Response 200:**
```json
{
  "summary": ["bullet 1", "bullet 2", "..."],
  "suggestedReplies": [
    { "label": "Đồng ý", "content": "Hi...", "tone": "positive" }
  ],
  "processingTime": 3500,
  "model": "llama3:8b"
}
```

**Response 500:**
```json
{ "error": "AI model unavailable", "detail": "Connection refused" }
```

**CORS:** `allow_origins=["https://localhost:3000"]`

---

## 4. Backend Design

### 4.1 Package Structure

```
backend/
├── main.py              # FastAPI app + routes
├── models.py            # Pydantic models
├── services/
│   ├── analyzer.py      # Ollama integration
│   └── preprocessor.py  # Text cleaning
├── requirements.txt     # deps
└── run.py               # Start script
```

### 4.2 Key Implementation

**Analyzer:**
```python
class EmailAnalyzer:
    def analyze(self, subject, body):
        prompt = self._build_prompt(subject, body)
        response = ollama.generate(
            model='llama3', prompt=prompt,
            format='json', options={"temperature": 0.3, "num_predict": 2048}
        )
        return json.loads(response['response'])
```

**Preprocessor:**
```python
class TextPreprocessor:
    def clean(self, body, max_length=8000):
        body = self._strip_signatures(body)
        body = self._remove_repeated_headers(body)
        if len(body) > max_length:
            body = self._smart_truncate(body, max_length)
        return body.strip()
    
    def _smart_truncate(self, body, max_len):
        newest = body[:int(max_len * 0.6)]
        oldest = body[-int(max_len * 0.4):]
        return f"{newest}\n[...truncated...]\n{oldest}"
```

---

## 5. Frontend Design

### 5.1 New Files

| File | Description |
|------|-------------|
| `src/taskpane/services/api-client.ts` | Backend fetch with 30s timeout |
| `src/taskpane/ui/summary-renderer.ts` | Render summary list + loading + error |

### 5.2 API Client

```typescript
export class ApiClient {
  async analyzeEmail(subject: string, body: string): Promise<AnalyzeResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const resp = await fetch('http://localhost:8000/api/analyze-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body }),
        signal: controller.signal
      });
      if (!resp.ok) throw new Error((await resp.json()).detail);
      return await resp.json();
    } finally { clearTimeout(timeout); }
  }
}
```

---

## 6. Security

| Concern | Solution |
|---------|----------|
| Data exposure | All localhost |
| CORS | Restricted origins |
| Input validation | Pydantic max_length |
| No auth | Local single-user |

---

## 7. Performance

| Operation | Target |
|-----------|--------|
| Ollama warm | < 5s |
| Ollama cold (first req) | < 15s |
| End-to-end | < 10s (warm) |
| Frontend render | < 50ms |

---

## 8. Implementation Checklist

### Backend (CREATE all)

1. `backend/requirements.txt` — fastapi, uvicorn, ollama, pydantic
2. `backend/models.py` — EmailRequest, AnalyzeResponse
3. `backend/services/preprocessor.py` — strip, truncate
4. `backend/services/analyzer.py` — Ollama call
5. `backend/main.py` — FastAPI app
6. `backend/run.py` — uvicorn start

### Frontend (CREATE/MODIFY)

1. `src/taskpane/services/api-client.ts` — CREATE
2. `src/taskpane/ui/summary-renderer.ts` — CREATE
3. `src/taskpane/taskpane.ts` — MODIFY (add summarize button handler)
4. `src/taskpane/taskpane.html` — MODIFY (add summary section)
5. `src/taskpane/taskpane.css` — MODIFY (spinner, summary styles)

### Start Commands

```bash
# Terminal 1: Ollama
ollama serve && ollama pull llama3

# Terminal 2: Backend
cd backend && pip install -r requirements.txt && python run.py

# Terminal 3: Frontend
npm run dev-server
```

---

## 9. Deployment

| Component | Port | Command |
|-----------|------|---------|
| Frontend | 3000 | `npm run dev-server` |
| Backend | 8000 | `uvicorn main:app --port 8000` |
| Ollama | 11434 | `ollama serve` |
