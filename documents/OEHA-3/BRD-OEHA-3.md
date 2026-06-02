# Business Requirements Document (BRD)

## Outlook Email Helper Agent — OEHA-3: Summarize Mail Loop - Tóm tắt chuỗi email bằng AI

---

## Document Information

| Field | Value |
|-------|-------|
| Jira Ticket | OEHA-3 |
| Title | Summarize Mail Loop - Tóm tắt chuỗi email bằng AI (Ollama LLM) |
| Author | BA Agent |
| Version | 1.0 |
| Date | 2025-01-20 |
| Status | Draft |
| Parent Epic | OEHA-1: Outlook Email Helper Agent - AI Mail Assistant |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-20 | BA Agent | Initiate document — auto-generated from Jira ticket OEHA-3 |

---

## 1. Introduction

### 1.1 Scope

Story này implement tính năng **tóm tắt chuỗi email (mail loop)** bằng AI thông qua Ollama LLM chạy local. Khi user đọc một email dài hoặc chuỗi reply nhiều lượt, add-in sẽ gửi nội dung email đến backend Python FastAPI, backend gọi Ollama để tóm tắt, và trả kết quả dạng bullet points hiển thị trên Taskpane.

**Phạm vi bao gồm:**
- Gửi email content (đã đọc từ OEHA-2) đến backend FastAPI
- Backend xử lý prompt engineering cho Ollama để tóm tắt
- Nhận kết quả summary dạng JSON (mảng các ý chính)
- Hiển thị summary lên Taskpane UI dạng bullet points
- Xử lý loading state, timeout, và error khi gọi AI

### 1.2 Out of Scope

- Đọc email content (đã implement ở OEHA-2)
- Gợi ý reply (thuộc OEHA-4)
- Chèn reply vào Outlook (thuộc OEHA-5)
- Training hoặc fine-tuning model AI
- Multi-language summary (chỉ support Tiếng Việt output trước)
- Cấu hình/quản lý Ollama server (giả định đã chạy sẵn)

### 1.3 Preliminary Requirement

- OEHA-2 hoàn thành (có thể đọc email body content)
- Python FastAPI backend server đã setup và chạy
- Ollama đã cài đặt và chạy trên máy local (port 11434 mặc định)
- Model LLM đã pull sẵn (llama3 hoặc qwen2.5)

---

## 2. Business Requirements

### 2.1 High Level Process Map

User chọn email → Email content đã được đọc (OEHA-2) → User click "Tóm tắt" → Frontend gửi request đến FastAPI backend → Backend construct prompt + gọi Ollama → Ollama trả về summary JSON → Backend parse + return response → Frontend hiển thị summary bullets lên Taskpane.

### 2.2 List of User Stories / Use Cases

| # | Story / Use Case | Priority | Source Ticket |
|---|------------------|----------|---------------|
| 1 | As a user, I want to click a "Summarize" button to get AI-generated summary of the current email thread | MUST HAVE | OEHA-3 |
| 2 | As a user, I want the summary to be displayed as clear bullet points in Vietnamese | MUST HAVE | OEHA-3 |
| 3 | As a user, I want to see a loading indicator while AI is processing, and clear error messages if it fails | MUST HAVE | OEHA-3 |
| 4 | As a user, I want the system to handle long email threads by truncating appropriately before sending to AI | SHOULD HAVE | OEHA-3 |

---

### 2.3 Details of User Stories

---

#### Business Flow

**Step 1:** User đã mở email và Taskpane đang hiển thị metadata (OEHA-2 output)

**Step 2:** User click nút "Tóm tắt" (Summarize) trên Taskpane

**Step 3:** Frontend hiển thị loading spinner + message "Đang phân tích email..."

**Step 4:** Frontend gửi POST request đến `http://localhost:8000/api/analyze-email` với body: `{ subject, body }`

**Step 5:** Backend nhận request, cắt tỉa email nếu quá dài (>8000 chars), construct prompt

**Step 6:** Backend gọi Ollama API với JSON mode enabled, temperature 0.3

**Step 7:** Ollama trả về JSON response chứa `summary` array

**Step 8:** Backend parse response, validate format, return cho frontend

**Step 9:** Frontend nhận response, ẩn loading, hiển thị summary bullets

> **Note:** Toàn bộ flow từ click đến hiển thị kết quả target < 10 giây cho email thông thường. Với email rất dài hoặc máy chậm, chấp nhận tối đa 30 giây.

---

#### STORY 1: Summarize Email via AI

> As a user, I want to click a "Summarize" button to get AI-generated summary of the current email thread.

**Requirement Details:**

1. Nút "Tóm tắt" hiển thị trên Taskpane sau khi email đã được đọc thành công
2. Khi click, gửi email subject + body text đến backend endpoint
3. Backend sử dụng prompt engineering chuẩn để ép Ollama trả JSON
4. Summary phải là mảng 3-7 bullet points, mỗi bullet tóm gọn 1 ý chính
5. Summary giữ nguyên các tên riêng, số liệu, ngày tháng từ email gốc

**Data Fields — Request:**

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| subject | string | Yes | Tiêu đề email | "Re: Báo cáo Q4 2024" |
| body | string | Yes | Nội dung email plain text (từ OEHA-2) | "Hi team,\n..." |

**Data Fields — Response:**

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| summary | string[] | Yes | Mảng các ý chính tóm tắt | ["Cuộc họp Q4 đã diễn ra ngày 15/1", "Doanh thu tăng 20%"] |
| processingTime | number | No | Thời gian xử lý (ms) | 3500 |
| model | string | No | Model đã sử dụng | "llama3:8b" |

**Acceptance Criteria:**

1. GIVEN email body đã có, WHEN user click "Tóm tắt", THEN summary được hiển thị trong <= 10 giây (email thường)
2. GIVEN email thread có 5+ replies, WHEN summarized, THEN summary capture được ý chính của TOÀN BỘ thread (không chỉ email cuối)
3. GIVEN email chứa tên người, ngày, số liệu cụ thể, WHEN summarized, THEN thông tin này được giữ chính xác trong summary
4. GIVEN Ollama trả về response hợp lệ, WHEN parsed, THEN summary có 3-7 bullet points

**API Contract:**

```
POST /api/analyze-email
Content-Type: application/json

Request:
{
  "subject": "Re: Báo cáo Q4",
  "body": "Hi team,\nTôi xin gửi báo cáo..."
}

Response (200 OK):
{
  "summary": [
    "Cuộc họp Q4 đã tổ chức ngày 15/1/2025",
    "Doanh thu quý 4 tăng 20% so với Q3",
    "Team dev cần hoàn thành sprint 12 trước 31/1"
  ],
  "processingTime": 3500,
  "model": "llama3:8b"
}

Response (500 Error):
{
  "error": "AI model unavailable",
  "detail": "Connection to Ollama refused"
}
```

---

#### STORY 2: Display Summary in Vietnamese

> As a user, I want the summary to be displayed as clear bullet points in Vietnamese.

**Requirement Details:**

1. Summary output phải bằng Tiếng Việt (vì email nội bộ doanh nghiệp VN)
2. Nếu email gốc bằng tiếng Anh, summary vẫn trả về tiếng Việt
3. Mỗi bullet point là 1 câu hoàn chỉnh, ngắn gọn (tối đa 100 ký tự)
4. Hiển thị dạng ordered list (có số thứ tự) trên UI

**Acceptance Criteria:**

1. GIVEN email bằng tiếng Việt, WHEN summarized, THEN summary bằng tiếng Việt
2. GIVEN email bằng tiếng Anh, WHEN summarized, THEN summary vẫn bằng tiếng Việt
3. GIVEN summary displayed, WHEN user reads, THEN mỗi point <= 100 ký tự, dễ đọc nhanh

**UI Specifications:**

| No. | Name | Type | Required | Description | Note |
|-----|------|------|----------|-------------|------|
| 1 | Summary Section | Container div | Yes | Khu vực hiển thị summary | Có border-left highlight |
| 2 | Summary Header | h3 text | Yes | "📋 Tóm tắt" | Icon + text |
| 3 | Summary List | Ordered list (ol) | Yes | Danh sách bullet points | Numbered 1, 2, 3... |
| 4 | Summary Item | List item (li) | Yes | Mỗi ý chính | Font-size 14px |

---

#### STORY 3: Loading & Error States

> As a user, I want to see a loading indicator while AI is processing, and clear error messages if it fails.

**Requirement Details:**

1. Khi đang chờ AI response: hiển thị spinner + text "Đang phân tích email..."
2. Nếu timeout (>30s): hiển thị error + nút retry
3. Nếu backend unavailable: hiển thị "Không thể kết nối server AI"
4. Nếu Ollama model chưa load: hiển thị "Model AI chưa sẵn sàng"

**Acceptance Criteria:**

1. GIVEN request sent to backend, WHEN waiting for response, THEN loading spinner visible
2. GIVEN backend responds with error 500, WHEN error caught, THEN hiển thị error message + nút "Thử lại"
3. GIVEN network timeout > 30s, WHEN timeout triggered, THEN hiển thị "Phân tích quá lâu. Vui lòng thử lại."
4. GIVEN user clicks "Thử lại", WHEN retrying, THEN re-send cùng request

**Error Handling:**

| Error | HTTP Status | Frontend Message | Action |
|-------|-------------|-----------------|--------|
| Backend unreachable | Network error | "Không thể kết nối server AI. Kiểm tra backend đang chạy." | Retry button |
| Ollama not running | 500 | "Model AI chưa sẵn sàng. Kiểm tra Ollama đang chạy." | Retry button |
| Timeout > 30s | Timeout | "Phân tích quá lâu. Email có thể quá dài." | Retry + suggest shorter |
| Invalid JSON response | 500 | "Lỗi xử lý kết quả AI. Vui lòng thử lại." | Retry button |

---

#### STORY 4: Handle Long Email Threads

> As a user, I want the system to handle long email threads by truncating appropriately before sending to AI.

**Requirement Details:**

1. Backend nhận email body từ frontend (đã truncate ở 32K chars từ OEHA-2)
2. Backend xử lý thêm: cắt bỏ email signatures lặp (pattern: "---", "Sent from my iPhone", etc.)
3. Backend giới hạn gửi Ollama tối đa 8,000 ký tự (phù hợp context window model 7B-8B)
4. Nếu cắt, ưu tiên giữ email mới nhất (phần trên cùng) + email đầu tiên (phần cuối cùng)

**Acceptance Criteria:**

1. GIVEN email body > 8000 chars, WHEN sent to backend, THEN backend truncate thông minh trước khi gọi Ollama
2. GIVEN email có nhiều signatures lặp, WHEN processed, THEN signatures bị strip (giữ nội dung chính)
3. GIVEN truncated content, WHEN summarized, THEN summary vẫn capture ý chính thread
4. GIVEN very short email (<100 chars), WHEN summarized, THEN summary vẫn hợp lý (có thể chỉ 1-2 points)

---

## 3. Dependencies

| Dependency | Type | Related Ticket | Description |
|------------|------|----------------|-------------|
| OEHA-2 (Read Email) | Feature | OEHA-2 | Phải đọc được email body trước khi summarize |
| Python FastAPI | Backend Framework | N/A | Server xử lý AI requests |
| Ollama | AI Infrastructure | N/A | Local LLM server chạy model llama3/qwen2.5 |
| ollama Python package | Library | N/A | SDK gọi Ollama API từ Python |
| Network (localhost) | Infrastructure | N/A | Frontend <-> Backend communication |

---

## 4. Stakeholders

| Role | Name / Team | Responsibility | Source |
|------|-------------|----------------|--------|
| Product Owner | Project Owner | Define summary requirements, evaluate quality | Jira reporter |
| Developer | Dev Team | Implement frontend + backend integration | Jira assignee |
| End User | Office workers | Use summary feature for quick email comprehension | Target audience |

---

## 5. Risks and Assumptions

### 5.1 Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Ollama response chậm trên máy yếu (>30s) | High | Medium | Dùng model nhỏ (3B), set timeout, show loading |
| Summary quality kém (hallucination) | High | Medium | Tune prompt, temperature 0.3, validate output |
| Ollama crash/OOM khi email quá dài | Medium | Low | Truncate input <= 8000 chars |
| JSON format trả về sai | Medium | Medium | Dùng format='json' mode, validate + retry |
| CORS block request từ Add-in | High | Medium | Cấu hình FastAPI CORS middleware |

### 5.2 Assumptions

- Ollama server đã chạy sẵn tại `localhost:11434`
- Model (llama3 hoặc qwen2.5) đã được pull (`ollama pull llama3`)
- FastAPI backend chạy tại `localhost:8000`
- Máy có đủ RAM (>=8GB free) để chạy model 7B-8B
- Email content chủ yếu bằng Tiếng Việt hoặc Tiếng Anh

---

## 6. Non-Functional Requirements

| Category | Requirement | Details |
|----------|-------------|---------|
| Performance | End-to-end response < 10s (email thường) | Từ click đến hiển thị summary |
| Performance | Maximum timeout: 30s | Abort nếu AI chậm quá |
| Scalability | 1 user / 1 request tại 1 thời điểm | Local single-user scenario |
| Security | Email content KHÔNG gửi ra internet | Ollama chạy 100% local |
| Reliability | Retry 1 lần nếu request fail | Auto-retry trước khi show error |
| UX | Loading feedback trong lúc chờ | Spinner + text message |

---

## 7. Related Tickets

| Ticket Key | Summary | Status | Type | Relationship |
|------------|---------|--------|------|--------------|
| OEHA-1 | Outlook Email Helper Agent - AI Mail Assistant | To Do | Epic | Parent epic |
| OEHA-2 | Read Email Content | To Do | Story | Prerequisite (provides email body) |
| OEHA-3 | Summarize Mail Loop | To Do | Story | Main ticket |
| OEHA-4 | Suggest Reply Options | To Do | Story | Uses same backend, extends response |
| OEHA-5 | Auto-Insert Reply | To Do | Story | Downstream |

---

## 8. Appendix

### Glossary

| Term | Definition |
|------|------------|
| Ollama | Open-source local LLM runner (chạy model AI trên máy local) |
| FastAPI | Python web framework hiệu suất cao cho API |
| Prompt Engineering | Kỹ thuật thiết kế câu lệnh cho AI model |
| JSON Mode | Chế độ ép Ollama chỉ trả output dạng JSON |
| Context Window | Giới hạn số tokens model có thể xử lý 1 lần |
| Mail Loop | Chuỗi email reply qua lại (conversation thread) |

### Prompt Template (Reference)

```python
prompt = f"""
Bạn là một trợ lý email thông minh chuyên nghiệp.
Hãy tóm tắt chuỗi email dưới đây thành 3-7 ý chính ngắn gọn bằng tiếng Việt.

Tiêu đề: {subject}
Nội dung chuỗi email:
{body}

Trả về JSON:
{{
  "summary": ["Ý chính 1...", "Ý chính 2...", ...]
}}
"""
```

### Technical References

| Document | Link / Location |
|----------|-----------------|
| Phase 2 - Apply Ollama | documents/Phase 2 - Apply Ollama |
| Ollama API Docs | https://github.com/ollama/ollama/blob/main/docs/api.md |
| FastAPI Docs | https://fastapi.tiangolo.com/ |
