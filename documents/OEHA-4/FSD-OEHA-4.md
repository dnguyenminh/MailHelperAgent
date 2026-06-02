# Functional Specification Document (FSD)

## Outlook Email Helper Agent — OEHA-4: Suggest Reply Options - Gợi ý phương án trả lời email

---

## Document Information

| Field | Value |
|-------|-------|
| Jira Ticket | OEHA-4 |
| Title | Suggest Reply Options - Gợi ý 2-3 phương án trả lời email bằng AI |
| Author | BA Agent + TA Agent |
| Version | 1.0 |
| Date | 2025-01-20 |
| Status | Draft |
| Related BRD | BRD-v1-OEHA-4.docx |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-20 | BA Agent | Initiate document |
| 1.1 | 2025-01-20 | TA Agent | Enriched API contracts, UI flow |

---

## 1. Introduction

### 1.1 Purpose

FSD này chi tiết hóa tính năng **gợi ý 2-3 phương án trả lời email** bằng AI. User yêu cầu AI đề xuất reply options với tone khác nhau, preview content, rồi chọn để chèn vào Outlook (OEHA-5).

### 1.2 Scope

- Frontend: Button "Gợi ý trả lời", option buttons, preview area, insert button
- Backend: Endpoint `/api/analyze-email` trả thêm `suggestedReplies`
- AI: Generate 2-3 reply options với distinct tones
- UX: Preview, switch options, regenerate (max 3x)

### 1.3 Definitions & Acronyms

| Term | Definition |
|------|------------|
| Suggested Reply | Phương án email trả lời do AI generate |
| Tone | Giọng điệu (positive/negative/neutral) |
| Preview | Hiển thị trước nội dung |
| Regenerate | Tạo lại gợi ý mới |

### 1.4 References

| Document | Location |
|----------|----------|
| BRD | BRD-v1-OEHA-4.docx |
| OEHA-3 FSD | FSD-v1-OEHA-3.docx |
| OEHA-5 BRD | BRD-v1-OEHA-5.docx |

---

## 2. System Overview

### 2.1 System Context

Cùng architecture với OEHA-3. Frontend gọi cùng backend endpoint. Backend trả combined response (summary + suggestedReplies). Frontend hiển thị reply options dạng buttons + preview.

### 2.2 System Architecture

| Layer | Technology | Responsibility |
|-------|-----------|---------------|
| UI | TypeScript + HTML | Option buttons, preview, insert trigger |
| API | FastAPI | Extended response with replies |
| AI | Ollama | Generate reply content |

---

## 3. Functional Requirements

### 3.1 Feature: AI Suggests Reply Options

**Source:** BRD Story 1

#### 3.1.1 Description

AI generate 2-3 phương án reply với tone khác nhau. Mỗi option có label + full content. Professional, contextual, cùng ngôn ngữ email gốc.

#### 3.1.2 Use Case

**Use Case ID:** UC-01
**Actor:** Office User
**Preconditions:**
- Email đã đọc (OEHA-2), Backend + Ollama running

**Main Flow:**

| Step | Actor | System | Description |
|------|-------|--------|-------------|
| 1 | User clicks "Gợi ý trả lời" | | Trigger |
| 2 | | Show loading | "Đang tạo gợi ý..." |
| 3 | | POST /api/analyze-email | Request |
| 4 | | Backend builds reply prompt | 2-3 options |
| 5 | | Ollama generates | JSON suggestedReplies |
| 6 | | Frontend renders buttons | Label on each |
| 7 | User clicks option | | Select |
| 8 | | Show preview | Full content |
| 9 | User clicks "Chèn vào Reply All" | | Trigger OEHA-5 |

**Exception Flows:**

| ID | Condition | Steps |
|----|-----------|-------|
| EF-01 | < 2 replies | Retry 1x, then error |
| EF-02 | Backend/Ollama error | Same as OEHA-3 |
| EF-03 | Regenerate 3x reached | Disable, show message |

#### 3.1.3 Business Rules

| Rule ID | Rule | Source |
|---------|------|--------|
| BR-01 | 2-3 reply options | BRD Story 1 |
| BR-02 | Distinct tones | BRD Story 1 |
| BR-03 | Contextually match email | BRD Story 3 |
| BR-04 | Professional tone | BRD Story 3 |
| BR-05 | Same language as email | BRD Story 1 |
| BR-06 | Greeting + closing | BRD Story 3 |
| BR-07 | < 15s generation | BRD NFR |
| BR-08 | Max 3 regenerations | BRD Story 4 |
| BR-09 | No auto-send | BRD NFR |

#### 3.1.4 Data Specifications

**Output — suggestedReplies:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| suggestedReplies | array | Yes | 2-3 reply objects |
| [].label | string | Yes | Short label |
| [].content | string | Yes | Full reply text |
| [].tone | string | No | positive/negative/neutral |

#### 3.1.5 UI Specifications

| No. | Element | Type | Required | Behavior |
|-----|---------|------|----------|----------|
| 1 | Section Header | h3 | Yes | "💬 Gợi ý trả lời" |
| 2 | Option Buttons | button group | Yes | 2-3 horizontal, active state |
| 3 | Preview Area | textarea | Yes | Full content, scrollable, 120px min |
| 4 | Insert Button | primary | Yes | "Chèn vào Reply All" — disabled until selected |
| 5 | Regenerate Button | secondary | No | "🔄 Tạo gợi ý khác" — max 3x |
| 6 | Counter | small text | No | "(còn N lượt)" |

#### 3.1.6 API Contract

**Endpoint:** `POST /api/analyze-email` (same as OEHA-3)

**Response includes:**
```json
{
  "summary": ["..."],
  "suggestedReplies": [
    {"label": "Đồng ý", "content": "Hi...\n\nTrân trọng.", "tone": "positive"},
    {"label": "Từ chối", "content": "Hi...\n\nTrân trọng.", "tone": "negative"},
    {"label": "Hỏi thêm", "content": "Hi...\n\nTrân trọng.", "tone": "neutral"}
  ]
}
```

---

### 3.2 Feature: Preview Reply Content

**Source:** BRD Story 2

#### 3.2.1 Use Case UC-02

| Step | Actor | System | Description |
|------|-------|--------|-------------|
| 1 | Click option button | | Select |
| 2 | | Highlight button | Active CSS |
| 3 | | Show in preview | Full text |
| 4 | | Enable Insert button | Ready |

#### 3.2.2 Business Rules

| Rule ID | Rule |
|---------|------|
| BR-10 | Click → show content |
| BR-11 | Switch → instant update |
| BR-12 | Insert uses current preview (may be edited) |

---

### 3.3 Feature: Regenerate Suggestions

**Source:** BRD Story 4

| Rule ID | Rule |
|---------|------|
| BR-08 | Max 3 regenerations |
| BR-13 | New replaces old |
| BR-14 | After 3x disable + message |

---

## 4. Data Model

```typescript
interface ReplyState {
  options: Array<{ label: string; content: string; tone?: string }>;
  selectedIndex: number | null;
  previewContent: string;
  regenerateCount: number;  // 0-3
  isLoading: boolean;
}
```

---

## 5. Integration Specifications

### 5.1 Backend (same as OEHA-3)

Combined response from `/api/analyze-email`

### 5.2 Downstream: OEHA-5

- Data: `previewContent` string
- Trigger: "Chèn vào Reply All" click

---

## 6. Processing Logic

### 6.1 Combined Prompt (Summary + Replies)

Backend uses single prompt requesting both summary and replies. See OEHA-3 FSD §6 for full prompt structure.

### 6.2 Frontend Selection

```typescript
function selectOption(index) {
  state.selectedIndex = index;
  state.previewContent = state.options[index].content;
  highlightButton(index);
  enableInsertButton();
}
```

---

## 7. Security

| Constraint | Implementation |
|-----------|---------------|
| No auto-send | User confirms |
| Sanitize AI output | Strip script tags |
| Local only | Same as OEHA-3 |

---

## 8. Non-Functional Requirements

| Category | Target |
|----------|--------|
| Performance | < 15s generation |
| Timeout | 30s max |
| Quality | Professional replies |
| UX | Clear preview |

---

## 9. Testing Considerations

| ID | Scenario | Priority |
|----|----------|----------|
| TC-01 | Generate 2-3 options | High |
| TC-02 | Distinct tones | High |
| TC-03 | Preview shows content | High |
| TC-04 | Switch options | High |
| TC-05 | Regenerate different results | Medium |
| TC-06 | Regenerate limit 3x | Medium |
| TC-07 | Vietnamese replies | High |
| TC-08 | English replies | High |
| TC-09 | Insert triggers OEHA-5 | High |

---

## 11. Appendix

### Change Log from BRD

| BRD Item | FSD Clarification |
|----------|-------------------|
| Combined endpoint | summary + suggestedReplies in one response |
| Editable preview | SHOULD HAVE via textarea |
| Reply length | 50-200 words per option |
