# Functional Specification Document (FSD)

## Outlook Email Helper Agent — OEHA-5: Auto-Insert Reply

---

## Document Information

| Field | Value |
|-------|-------|
| Jira Ticket | OEHA-5 |
| Title | Auto-Insert Reply - Tự động chèn nội dung reply vào Outlook Reply All form |
| Author | BA Agent + TA Agent |
| Version | 1.0 |
| Date | 2025-01-20 |
| Status | Draft |
| Related BRD | BRD-v1-OEHA-5.docx |

---

## 1. Introduction

### 1.1 Purpose

Tính năng tự động chèn nội dung reply đã chọn (từ OEHA-4) vào Outlook Reply All form via Office.js `displayReplyAllForm()`.

### 1.2 Scope

- Nhận reply content từ OEHA-4
- Convert plain text to HTML
- Call Office.js displayReplyAllForm
- Success/error feedback
- Fallback: clipboard copy

### 1.3 References

| Document | Location |
|----------|----------|
| BRD | BRD-v1-OEHA-5.docx |
| OEHA-4 FSD | FSD-v1-OEHA-4.docx |
| Office.js API | https://learn.microsoft.com/en-us/javascript/api/outlook/office.messageread |

---

## 2. System Overview

Frontend-only. Nhận text từ OEHA-4, convert HTML, gọi Office.js. Không cần backend.

| Layer | Technology | Responsibility |
|-------|-----------|---------------|
| UI | TypeScript | Convert, call API, toast |
| API | Office.js Mailbox 1.3+ | displayReplyAllForm |
| Host | Outlook Desktop/Web | Open Reply All window |

---

## 3. Functional Requirements

### 3.1 Feature: One-Click Insert Reply

**Use Case ID:** UC-01

**Main Flow:**

| Step | Actor | System | Description |
|------|-------|--------|-------------|
| 1 | Click "Chèn vào Reply All" | | Trigger |
| 2 | | Get previewContent | From OEHA-4 |
| 3 | | textToHtml(content) | Convert |
| 4 | | displayReplyAllForm({htmlBody}) | Insert |
| 5 | | Show success toast | "Đã chèn nội dung" |
| 6 | | Reset state | Ready for next |
| 7 | User reviews + Send | | Manual |

**Business Rules:**

| Rule ID | Rule |
|---------|------|
| BR-01 | Insert < 1 second |
| BR-02 | Reply All only |
| BR-03 | Original recipients included |
| BR-04 | No auto-send |
| BR-05 | Button disabled until selection |

**Error Handling:**

| Condition | Message | Fallback |
|-----------|---------|----------|
| API unsupported | "Outlook không hỗ trợ tự động chèn" | Copy to clipboard |
| Permission denied | "Add-in không có quyền" | Info only |
| No email selected | "Chọn email trước" | Info only |

---

### 3.2 Feature: HTML Formatting

**Conversion Rules:**

| Input | Output |
|-------|--------|
| `\n` single | `<br>` |
| `\n\n` double | `</p><p>` |
| HTML tags in content | Stripped (security) |
| Vietnamese diacritics | Preserved UTF-8 |

---

### 3.3 Feature: Success Confirmation

- Success toast: green, auto-hide 5s
- Error toast: red, dismiss button
- State resets after successful insert

---

## 4. Processing Logic

### 4.1 Text to HTML

```typescript
function textToHtml(text: string): string {
  const sanitized = text.replace(/<[^>]*>/g, '');
  const paragraphs = sanitized.split('\n\n');
  return paragraphs.map(p => `<p>${p.trim().replace(/\n/g, '<br>')}</p>`).join('');
}
```

### 4.2 Insert Flow

```typescript
function insertReply(content: string) {
  const htmlBody = textToHtml(content);
  try {
    Office.context.mailbox.item.displayReplyAllForm({ htmlBody });
    showSuccessToast("Đã chèn nội dung vào Reply All");
    resetState();
  } catch (error) {
    if (isApiUnsupported(error)) {
      copyToClipboard(content);
      showError("Đã copy nội dung. Paste vào Reply All thủ công.");
    } else {
      showError("Lỗi: " + error.message);
    }
  }
}
```

---

## 5. UI Specifications

| No. | Element | Type | Behavior |
|-----|---------|------|----------|
| 1 | Insert Button | primary | Disabled until option selected |
| 2 | Success Toast | notification | Green, 5s auto-hide |
| 3 | Error Toast | notification | Red, dismiss button |
| 4 | Copy Fallback | button | Shown when API unsupported |

---

## 6. Security

| Constraint | Implementation |
|-----------|---------------|
| No script injection | Strip HTML from AI content |
| No auto-send | User must Send manually |
| Minimum permission | ReadItem |

---

## 7. Non-Functional Requirements

| Category | Target |
|----------|--------|
| Performance | Form < 1s |
| Compatibility | Desktop + Web |
| Accessibility | Keyboard nav |

---

## 8. Testing Considerations

| ID | Scenario | Priority |
|----|----------|----------|
| TC-01 | Insert opens form with content | High |
| TC-02 | Reply All recipients correct | High |
| TC-03 | Line breaks preserved | High |
| TC-04 | Vietnamese chars correct | High |
| TC-05 | No script in HTML | High |
| TC-06 | Toast shows + hides | Medium |
| TC-07 | Copy fallback works | Medium |
| TC-08 | Desktop vs Web behavior | High |
