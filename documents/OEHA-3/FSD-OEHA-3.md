# Functional Specification Document (FSD)

## Outlook Email Helper Agent — OEHA-3: Summarize Mail Loop - Tóm tắt chuỗi email bằng AI

---

## Document Information

| Field | Value |
|-------|-------|
| Jira Ticket | OEHA-3 |
| Title | Summarize Mail Loop - Tóm tắt chuỗi email bằng AI (Ollama LLM) |
| Author | BA Agent + TA Agent |
| Version | 1.0 |
| Date | 2025-01-20 |
| Status | Draft |
| Related BRD | BRD-v1-OEHA-3.docx |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-20 | BA Agent | Initiate document |
| 1.1 | 2025-01-20 | TA Agent | Enriched with API contracts, integration specs, pseudocode |

---

## 1. Introduction

### 1.1 Purpose

FSD này chi tiết hóa các yêu cầu chức năng cho tính năng **tóm tắt chuỗi email bằng AI** thông qua Ollama LLM chạy local. Frontend gọi backend Python FastAPI, backend xử lý prompt engineering và gọi Ollama, trả kết quả summary dạng JSON.

### 1.2 Scope

- Frontend: Nút "Tóm tắt" trên Taskpane, loading state, hiển thị summary bullets
- Backend: FastAPI endpoint `/api/analyze-email`, prompt construction, Ollama integration
- AI: Tóm tắt email thành 3-7 bullet points bằng Tiếng Việt
- Error handling: Timeout, Ollama unavailable, invalid JSON response

### 1.3 Definitions & Acronyms

| Term | Definition |
|------|------------|
| Ollama | Open-source local LLM runner |
| FastAPI | Python async web framework |
| JSON Mode | Ollama mode ép output JSON |
| Context Window | Giới hạn tokens model xử lý |
| Mail Loop | Chuỗi email reply qua lại |

### 1.4 References

| Document | Location |
|----------|----------|
| BRD | BRD-v1-OEHA-3.docx |
| OEHA-2 FSD | FSD-v1-OEHA-2.docx |
| Ollama API | https://github.com/ollama/ollama/blob/main/docs/api.md |

---

## 2. System Overview

### 2.1 System Context

Frontend Outlook Add-in Taskpane giao tiếp với Python FastAPI backend qua HTTP REST. Backend gọi Ollama LLM server chạy local. Toàn bộ data flow nằm trên localhost.

**Actors:**
- Office User: Click "Tóm tắt" để nhận AI summary
- Frontend (Taskpane): Gửi request, hiển thị result
- FastAPI Backend: Xử lý prompt, gọi Ollama, parse response
- Ollama Server: Chạy LLM model local

### 2.2 System Architecture

| Layer | Technology | Responsibility |
|-------|-----------|---------------|
| UI | TypeScript + HTML (Fluent UI) | Button, loading, display summary |
| API Gateway | FastAPI (Python) | Receive request, CORS, validate |
| AI Service | Ollama Python SDK | Construct prompt, call model, parse JSON |
| LLM | Ollama (llama3:8b / qwen2.5:7b) | Generate summary text |

---

## 3. Functional Requirements

### 3.1 Feature: Summarize Email via AI

**Source:** BRD Story 1

#### 3.1.1 Description

User click nút "Tóm tắt". Frontend gửi subject + body đến backend. Backend construct prompt, gọi Ollama với JSON mode, parse response, trả về mảng summary bullets.

#### 3.1.2 Use Case

**Use Case ID:** UC-01
**Actor:** Office User
**Preconditions:**
- Email đã được đọc thành công (OEHA-2 output available)
- `bodyText` not null/empty
- Backend server running (localhost:8000)
- Ollama server running (localhost:11434)

**Postconditions:**
- Summary bullets displayed on Taskpane
- Processing time visible

**Main Flow:**

| Step | Actor | System | Description |
|------|-------|--------|-------------|
| 1 | User clicks "Tóm tắt" | | Trigger summarize |
| 2 | | Frontend shows loading | Spinner + "Đang phân tích email..." |
| 3 | | Frontend POSTs to backend | `POST /api/analyze-email` |
| 4 | | Backend validates input | Check subject/body not empty |
| 5 | | Backend truncates body | If > 8000 chars |
| 6 | | Backend strips signatures | Remove repeated signatures |
| 7 | | Backend constructs prompt | Vietnamese prompt |
| 8 | | Backend calls Ollama | format='json', temperature=0.3 |
| 9 | | Backend parses JSON | Validate summary array |
| 10 | | Backend returns 200 | summary + processingTime |
| 11 | | Frontend hides loading | Remove spinner |
| 12 | | Frontend renders summary | Ordered list |

**Alternative Flows:**

| ID | Condition | Steps |
|----|-----------|-------|
| AF-01 | Email body < 100 chars | Process normally, may return 1-2 points |
| AF-02 | Ollama returns < 3 bullets | Accept, display available |
| AF-03 | JSON has extra fields | Ignore extra, extract `summary` only |

**Exception Flows:**

| ID | Condition | Steps |
|----|-----------|-------|
| EF-01 | Backend unreachable | "Không thể kết nối server AI" + Retry |
| EF-02 | Ollama not running (500) | "Model AI chưa sẵn sàng" + Retry |
| EF-03 | Timeout > 30s | "Phân tích quá lâu" + Retry |
| EF-04 | Invalid JSON from Ollama | Backend retry 1x, then 500 + Retry |

#### 3.1.3 Business Rules

| Rule ID | Rule | Source |
|---------|------|--------|
| BR-01 | Summary: 3-7 bullet points | BRD Story 1 |
| BR-02 | Output always Vietnamese | BRD Story 2 |
| BR-03 | Preserve names, numbers, dates | BRD Story 1 |
| BR-04 | Response < 10s (normal email) | BRD NFR |
| BR-05 | Timeout: 30s max | BRD NFR |
| BR-06 | Body to Ollama max 8000 chars | BRD Story 4 |
| BR-07 | Each bullet max 100 chars | BRD Story 2 |
| BR-08 | Auto-retry 1x before error | BRD NFR |

#### 3.1.4 Data Specifications

**Input (Frontend to Backend):**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| subject | string | Yes | Not empty, max 500 | Email subject |
| body | string | Yes | Not empty, max 32000 | Email body plain text |

**Output (Backend to Frontend):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| summary | string[] | Yes | 3-7 Vietnamese bullets |
| processingTime | number | No | MS elapsed |
| model | string | No | Model used |

#### 3.1.5 UI Specifications

**Screen: Summary Display**

| No. | Element | Type | Required | Behavior | Validation |
|-----|---------|------|----------|----------|------------|
| 1 | Summarize Button | button | Yes | Trigger API. Disabled during loading | Enabled when email loaded |
| 2 | Loading Spinner | div | Yes | Visible during API call | Auto-hide on response |
| 3 | Loading Text | p | Yes | "Đang phân tích email..." | Below spinner |
| 4 | Summary Header | h3 | Yes | "📋 Tóm tắt" | After results |
| 5 | Summary List | ol | Yes | Numbered bullets | 3-7 items |
| 6 | Summary Item | li | Yes | Bullet text | Max 100 chars |
| 7 | Error Container | div | Conditional | Error + retry | Red border-left |
| 8 | Retry Button | button | Conditional | Re-request | Only shown on error |

#### 3.1.6 API Contract (Functional View)

**Endpoint:** `POST /api/analyze-email`

**Request:**
```json
{
  "subject": "Re: Báo cáo Q4",
  "body": "Hi team, tôi xin gửi báo cáo..."
}
```

**Response 200:**
```json
{
  "summary": [
    "Báo cáo Q4 được gửi bởi Nguyễn Văn A",
    "Doanh thu đạt 5.2 tỷ VND, tăng 20%",
    "Đề xuất tăng headcount sales miền Nam"
  ],
  "processingTime": 3500,
  "model": "llama3:8b"
}
```

**Response 500:**
```json
{
  "error": "AI model unavailable",
  "detail": "Connection to Ollama refused"
}
```

---

### 3.2 Feature: Handle Long Email Threads

**Source:** BRD Story 4

#### 3.2.1 Description

Backend truncates long email bodies before Ollama. Strips signatures, prioritizes recent content.

#### 3.2.2 Business Rules

| Rule ID | Rule | Source |
|---------|------|--------|
| BR-06 | Max 8000 chars to Ollama | BRD Story 4 |
| BR-09 | Strip repeated signatures | BRD Story 4 |
| BR-10 | Keep newest (60%) + oldest (40%) | BRD Story 4 |
| BR-11 | Short emails still process | BRD Story 4 |

---

## 4. Data Model

> No persistent storage. Request/response only.

### 4.1 Request Schema

```json
{
  "subject": "string (required)",
  "body": "string (required, max 32000)"
}
```

### 4.2 Response Schema

```json
{
  "summary": ["string[]"],
  "processingTime": "number (optional)",
  "model": "string (optional)"
}
```

---

## 5. Integration Specifications

### 5.1 External System: Ollama LLM Server

| Attribute | Value |
|-----------|-------|
| Purpose | Generate AI summary |
| Direction | Outbound (backend to Ollama) |
| Protocol | HTTP REST |
| Endpoint | http://localhost:11434 |
| Authentication | None (local) |
| Timeout | 30 seconds |
| Retry | 1x automatic |

### 5.2 Internal: Frontend (OEHA-2 data)

| Attribute | Value |
|-----------|-------|
| Purpose | Provides email subject + body |
| Direction | Inbound |
| Format | JSON POST body |
| Dependency | OEHA-2 completed |

---

## 6. Processing Logic

### 6.1 Summarization Pipeline

```python
async def analyze_email(subject, body):
    # 1. Validate
    validate_input(subject, body)
    
    # 2. Pre-process
    cleaned = strip_signatures(body)
    cleaned = remove_repeated_headers(cleaned)
    
    # 3. Truncate
    if len(cleaned) > 8000:
        cleaned = smart_truncate(cleaned, 8000)
    
    # 4. Build prompt (Vietnamese)
    prompt = build_summary_prompt(subject, cleaned)
    
    # 5. Call Ollama (JSON mode, temp 0.3)
    response = ollama.generate(model='llama3', prompt=prompt, format='json', options={"temperature": 0.3})
    
    # 6. Parse + validate
    result = json.loads(response['response'])
    assert 'summary' in result and isinstance(result['summary'], list)
    
    return result
```

### 6.2 Smart Truncate

```python
def smart_truncate(body, max_len=8000):
    newest = body[:int(max_len * 0.6)]
    oldest = body[-int(max_len * 0.4):]
    return newest + "\n...[truncated]...\n" + oldest
```

---

## 7. Security Requirements

| Constraint | Implementation |
|-----------|---------------|
| No external network | Ollama on localhost only |
| CORS restricted | FastAPI CORS middleware |
| Input validated | Backend checks body size |
| No persistence | Data in memory only |

---

## 8. Non-Functional Requirements

| Category | Requirement | Target |
|----------|-------------|--------|
| Performance | End-to-end | < 10s normal, 30s max |
| Security | Data locality | 100% local |
| Reliability | Auto-retry | 1x before error |
| UX | Feedback | Loading spinner |

---

## 9. Error Handling (User-Facing)

| Scenario | Message | Action |
|----------|---------|--------|
| Backend down | "Không thể kết nối server AI" | Retry |
| Ollama down | "Model AI chưa sẵn sàng" | Retry |
| Timeout | "Phân tích quá lâu" | Retry |
| Invalid response | "Lỗi xử lý kết quả AI" | Retry |
| No body | "Không có nội dung để tóm tắt" | Disable button |

---

## 10. Testing Considerations

| ID | Scenario | Priority |
|----|----------|----------|
| TC-01 | Normal Vietnamese email summary | High |
| TC-02 | English email → Vietnamese summary | High |
| TC-03 | Long email (>8000) truncation | High |
| TC-04 | Short email (<100 chars) | Medium |
| TC-05 | Backend unavailable | High |
| TC-06 | Ollama unavailable | High |
| TC-07 | Timeout 30s | Medium |
| TC-08 | Signature stripping | Medium |
| TC-09 | Unicode preservation | High |

---

## 11. Appendix

### Change Log from BRD

| BRD Item | FSD Clarification |
|----------|-------------------|
| Model choice | Default llama3:8b, configurable via env var |
| Retry | 1x auto in backend, 1x manual in frontend |
| Summary count | Accept 1-2 for very short emails |
