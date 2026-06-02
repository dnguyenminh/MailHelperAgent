# Business Requirements Document (BRD)

## Outlook Email Helper Agent — OEHA-4: Suggest Reply Options - Gợi ý 2-3 phương án trả lời email bằng AI

---

## Document Information

| Field | Value |
|-------|-------|
| Jira Ticket | OEHA-4 |
| Title | Suggest Reply Options - Gợi ý 2-3 phương án trả lời email bằng AI |
| Author | BA Agent |
| Version | 1.0 |
| Date | 2025-01-20 |
| Status | Draft |
| Parent Epic | OEHA-1: Outlook Email Helper Agent - AI Mail Assistant |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-20 | BA Agent | Initiate document — auto-generated from Jira ticket OEHA-4 |

---

## 1. Introduction

### 1.1 Scope

Story này implement tính năng **gợi ý 2-3 phương án trả lời email** bằng AI. Sau khi email đã được đọc và tóm tắt, user có thể yêu cầu AI đề xuất các phương án reply khác nhau (đồng ý, từ chối, hẹn lại, etc.). Mỗi phương án có label mô tả ngắn + nội dung email reply đầy đủ.

**Phạm vi bao gồm:**
- Gửi email context đến backend để AI generate reply options
- Backend tạo prompt yêu cầu Ollama gợi ý 2-3 phương án phản hồi
- Nhận response dạng JSON chứa array `suggestedReplies` (label + content)
- Hiển thị các phương án dưới dạng buttons trên Taskpane
- User click vào phương án -> hiển thị preview nội dung reply
- Kết nối với OEHA-5 để chèn reply đã chọn vào Outlook

### 1.2 Out of Scope

- Đọc email content (OEHA-2)
- Tóm tắt email (OEHA-3) — tuy nhiên response có thể kết hợp summary + replies
- Tự động gửi email (chỉ gợi ý, user quyết định)
- Chèn reply vào Outlook form (OEHA-5)
- Custom tone/style settings (future enhancement)
- Multi-language replies (chỉ Vietnamese trước)

### 1.3 Preliminary Requirement

- OEHA-2 hoàn thành (đọc được email body)
- OEHA-3 hoàn thành (backend AI pipeline đã setup)
- FastAPI backend + Ollama đang chạy

---

## 2. Business Requirements

### 2.1 High Level Process Map

Email đã được đọc (OEHA-2) -> User click "Gợi ý trả lời" -> Frontend gửi request -> Backend construct prompt cho reply suggestions -> Ollama generate 2-3 phương án -> Backend return JSON -> Frontend hiển thị buttons + preview -> User chọn phương án -> Chuyển sang OEHA-5 (chèn vào Outlook).

### 2.2 List of User Stories / Use Cases

| # | Story / Use Case | Priority | Source Ticket |
|---|------------------|----------|---------------|
| 1 | As a user, I want AI to suggest 2-3 reply options with different tones so I can quickly choose how to respond | MUST HAVE | OEHA-4 |
| 2 | As a user, I want to preview the full reply content before inserting it into Outlook | MUST HAVE | OEHA-4 |
| 3 | As a user, I want the suggested replies to be professional and contextually appropriate | MUST HAVE | OEHA-4 |
| 4 | As a user, I want to regenerate suggestions if I'm not satisfied with the options | SHOULD HAVE | OEHA-4 |

---

### 2.3 Details of User Stories

---

#### Business Flow

**Step 1:** Email đã đọc, summary đã hiển thị (hoặc user skip summary)

**Step 2:** User click nút "Gợi ý trả lời" trên Taskpane

**Step 3:** Frontend gửi POST request đến backend (cùng endpoint hoặc endpoint riêng)

**Step 4:** Backend construct prompt yêu cầu Ollama tạo 2-3 phương án reply

**Step 5:** Ollama generate JSON chứa `suggestedReplies` array

**Step 6:** Frontend hiển thị 2-3 buttons, mỗi button có label ngắn (ví dụ: "Đồng ý", "Từ chối")

**Step 7:** User click vào 1 button -> hiển thị full content của reply đó trong preview area

**Step 8:** User confirm -> trigger OEHA-5 (chèn vào Reply All form)

> **Note:** User có thể edit reply content trong preview trước khi chèn (nice-to-have, có thể defer).

---

#### STORY 1: AI Suggests Reply Options

> As a user, I want AI to suggest 2-3 reply options with different tones so I can quickly choose how to respond.

**Requirement Details:**

1. AI phải generate đúng 2-3 phương án (không ít hơn 2, không nhiều hơn 3)
2. Mỗi phương án có tone khác nhau: ví dụ "Đồng ý/Chấp thuận", "Từ chối/Cần cân nhắc", "Hẹn lịch lại/Cần thêm thông tin"
3. Nội dung reply phải contextually relevant — đề cập đúng chủ đề email gốc
4. Reply phải professional, lịch sự, phù hợp môi trường công sở
5. Reply bằng cùng ngôn ngữ với email gốc (Việt -> Việt, Anh -> Anh)

**Data Fields — Request:**

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| subject | string | Yes | Tiêu đề email | "Re: Lịch họp sprint review" |
| body | string | Yes | Nội dung email plain text | "Hi team, xin mời họp..." |

**Data Fields — Response:**

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| suggestedReplies | array | Yes | Mảng 2-3 phương án reply | (see below) |
| suggestedReplies[].label | string | Yes | Label ngắn mô tả tone | "Đồng ý tham gia" |
| suggestedReplies[].content | string | Yes | Nội dung email reply đầy đủ | "Hi anh/chị,\nTôi xác nhận sẽ tham gia..." |
| suggestedReplies[].tone | string | No | Tone tag | "positive" / "negative" / "neutral" |

**Acceptance Criteria:**

1. GIVEN email content provided, WHEN AI generates replies, THEN exactly 2-3 options returned
2. GIVEN reply options, WHEN displayed, THEN each has distinct tone/approach
3. GIVEN email about meeting request, WHEN AI suggests, THEN options include "accept" and "decline" variants
4. GIVEN email content in Vietnamese, WHEN AI generates, THEN replies in Vietnamese
5. GIVEN email content in English, WHEN AI generates, THEN replies in English

**API Contract:**

```
POST /api/analyze-email
Content-Type: application/json

Request:
{
  "subject": "Re: Lịch họp sprint review",
  "body": "Hi team,\nXin mời các bạn tham gia sprint review..."
}

Response (200 OK):
{
  "summary": [...],
  "suggestedReplies": [
    {
      "label": "Đồng ý tham gia",
      "content": "Hi anh/chị,\n\nTôi xác nhận sẽ tham gia buổi sprint review. Cảm ơn anh/chị đã thông báo.\n\nTrân trọng.",
      "tone": "positive"
    },
    {
      "label": "Từ chối - bận lịch khác",
      "content": "Hi anh/chị,\n\nRất tiếc tôi không thể tham gia do đã có lịch họp khác trùng giờ. Anh/chị có thể gửi meeting notes sau buổi họp được không?\n\nCảm ơn và xin lỗi vì sự bất tiện.\n\nTrân trọng.",
      "tone": "negative"
    },
    {
      "label": "Hỏi thêm thông tin",
      "content": "Hi anh/chị,\n\nTôi muốn xác nhận lại: buổi review này sẽ cover những sprint nào? Và liệu có cần chuẩn bị tài liệu trước không?\n\nCảm ơn.\n\nTrân trọng.",
      "tone": "neutral"
    }
  ]
}
```

---

#### STORY 2: Preview Reply Content

> As a user, I want to preview the full reply content before inserting it into Outlook.

**Requirement Details:**

1. Khi user click vào button phương án, hiển thị full reply content trong preview area
2. Preview hiển thị dạng formatted text (có line breaks, greeting, body, signature)
3. User có thể switch giữa các phương án bằng cách click button khác
4. Có nút "Chèn vào Reply" để confirm và trigger OEHA-5
5. Có nút "Tạo lại" nếu không hài lòng với tất cả options

**Acceptance Criteria:**

1. GIVEN reply options displayed, WHEN user clicks option button, THEN full content shown in preview area
2. GIVEN preview showing, WHEN user clicks different option, THEN preview updates instantly
3. GIVEN preview showing, WHEN user clicks "Chèn vào Reply", THEN OEHA-5 triggered with selected content
4. GIVEN preview showing, THEN content readable với proper formatting (line breaks preserved)

**UI Specifications:**

| No. | Name | Type | Required | Description | Note |
|-----|------|------|----------|-------------|------|
| 1 | Reply Section Header | h3 text | Yes | "💬 Gợi ý trả lời" | Icon + text |
| 2 | Option Buttons | Button group | Yes | 2-3 buttons với labels | Horizontal layout, active state highlight |
| 3 | Preview Area | Textarea/div | Yes | Hiển thị full reply content | Read-only, scrollable, min-height 120px |
| 4 | Insert Button | Primary Button | Yes | "Chèn vào Reply All" | Fluent UI primary style, chỉ enable khi có preview |
| 5 | Regenerate Button | Secondary Button | No | "🔄 Tạo gợi ý khác" | Gọi lại API |

---

#### STORY 3: Professional & Contextual Replies

> As a user, I want the suggested replies to be professional and contextually appropriate.

**Requirement Details:**

1. Replies phải có greeting phù hợp (Hi anh/chị, Dear Mr/Mrs, etc.)
2. Replies phải reference đúng context email gốc (tên project, ngày, action items)
3. Replies phải có closing signature phù hợp (Trân trọng, Best regards, etc.)
4. Tone phải professional — không quá casual, không quá formal
5. Nếu email gốc urgent -> replies phải acknowledge urgency

**Acceptance Criteria:**

1. GIVEN professional email context, WHEN AI generates reply, THEN reply has proper greeting + closing
2. GIVEN email mentions specific date/project, WHEN AI generates reply, THEN reply references same details
3. GIVEN email marked urgent, WHEN AI generates reply, THEN at least one option acknowledges urgency
4. GIVEN all generated replies, WHEN reviewed, THEN none contains inappropriate/casual language

---

#### STORY 4: Regenerate Suggestions

> As a user, I want to regenerate suggestions if I'm not satisfied with the options.

**Requirement Details:**

1. Nút "Tạo gợi ý khác" gọi lại cùng API endpoint
2. Ollama inherently random (temperature > 0) nên kết quả sẽ khác
3. Giới hạn regenerate: tối đa 3 lần liên tiếp (tránh spam)
4. Sau 3 lần, disable nút + hiển thị "Đã hết lượt tạo lại"

**Acceptance Criteria:**

1. GIVEN current suggestions displayed, WHEN user clicks "Tạo gợi ý khác", THEN new suggestions generated
2. GIVEN regenerated, WHEN new results displayed, THEN previous suggestions replaced
3. GIVEN user regenerated 3 times, WHEN clicking again, THEN button disabled + message shown
4. GIVEN regenerate clicked, THEN loading state shown during processing

---

## 3. Dependencies

| Dependency | Type | Related Ticket | Description |
|------------|------|----------------|-------------|
| OEHA-2 (Read Email) | Feature | OEHA-2 | Email content phải available |
| OEHA-3 (Summarize) | Feature | OEHA-3 | Backend pipeline đã setup, endpoint có thể dùng chung |
| OEHA-5 (Auto-Insert) | Feature | OEHA-5 | Downstream — nhận selected reply để chèn vào Outlook |
| Python FastAPI | Backend | N/A | Xử lý request, gọi Ollama |
| Ollama | AI | N/A | Generate reply content |

---

## 4. Stakeholders

| Role | Name / Team | Responsibility | Source |
|------|-------------|----------------|--------|
| Product Owner | Project Owner | Define reply quality criteria | Jira reporter |
| Developer | Dev Team | Implement suggestion UI + backend | Jira assignee |
| End User | Office workers | Select and use suggested replies | Target audience |

---

## 5. Risks and Assumptions

### 5.1 Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| AI generates inappropriate content | High | Low | Prompt engineering restrict, temperature low |
| Reply không match context email | Medium | Medium | Include full email context in prompt, validate |
| User gửi reply sai (AI hallucinate tên/số) | High | Medium | Preview trước khi insert, user xác nhận |
| Response chậm (cần generate nhiều text hơn summary) | Medium | Medium | Timeout 30s, loading indicator |

### 5.2 Assumptions

- Backend endpoint `/api/analyze-email` trả về cả summary và suggestedReplies trong 1 response
- User sẽ review preview trước khi insert (không auto-send)
- Reply length: 50-200 từ mỗi phương án (vừa đủ professional email)
- Ollama có thể generate 2-3 replies trong 1 lần gọi

---

## 6. Non-Functional Requirements

| Category | Requirement | Details |
|----------|-------------|---------|
| Performance | Reply generation < 15s | Longer than summary due to more content |
| Performance | Maximum timeout: 30s | Same as OEHA-3 |
| Security | Reply content không auto-send | User PHẢI confirm trước khi insert |
| UX | Preview clear, readable | Proper formatting, easy to scan |
| Quality | Replies professional tone | No slang, no inappropriate content |
| Reliability | Fallback nếu < 2 replies generated | Retry 1 lần, nếu vẫn fail -> show error |

---

## 7. Related Tickets

| Ticket Key | Summary | Status | Type | Relationship |
|------------|---------|--------|------|--------------|
| OEHA-1 | Outlook Email Helper Agent - AI Mail Assistant | To Do | Epic | Parent epic |
| OEHA-2 | Read Email Content | To Do | Story | Prerequisite |
| OEHA-3 | Summarize Mail Loop | To Do | Story | Related (shared backend) |
| OEHA-4 | Suggest Reply Options | To Do | Story | Main ticket |
| OEHA-5 | Auto-Insert Reply | To Do | Story | Downstream consumer |

---

## 8. Appendix

### Glossary

| Term | Definition |
|------|------------|
| Suggested Reply | Phương án email trả lời do AI generate |
| Tone | Giọng điệu của reply (positive, negative, neutral) |
| Preview | Hiển thị trước nội dung reply trước khi chèn |
| Regenerate | Tạo lại các gợi ý mới nếu không hài lòng |

### Prompt Template (Reference)

```python
prompt = f"""
Bạn là một trợ lý email thông minh chuyên nghiệp.
Hãy đề xuất 2-3 phương án trả lời cho email dưới đây.
Mỗi phương án có tone khác nhau (đồng ý, từ chối, hỏi thêm).

Tiêu đề: {subject}
Nội dung email:
{body}

Trả về JSON:
{{
  "suggestedReplies": [
    {{
      "label": "Mô tả ngắn phương án",
      "content": "Nội dung email trả lời đầy đủ, lịch sự, professional"
    }}
  ]
}}
"""
```

### Technical References

| Document | Link / Location |
|----------|-----------------|
| Phase 2 - Apply Ollama | documents/Phase 2 - Apply Ollama |
| OEHA-3 BRD (shared backend) | documents/BRD-OEHA-3.md |
