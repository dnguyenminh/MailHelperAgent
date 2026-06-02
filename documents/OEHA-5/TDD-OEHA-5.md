# Technical Design Document (TDD)

## Outlook Email Helper Agent — OEHA-5: Auto-Insert Reply

---

## Document Information

| Field | Value |
|-------|-------|
| Jira Ticket | OEHA-5 |
| Title | Auto-Insert Reply - Tự động chèn reply vào Outlook |
| Author | SA Agent |
| Version | 1.0 |
| Date | 2025-01-20 |
| Status | Draft |
| Related BRD | BRD-v1-OEHA-5.docx |
| Related FSD | FSD-v1-OEHA-5.docx |

---

## 1. Introduction

### 1.1 Purpose

Nhận selected reply content từ OEHA-4, convert HTML, call Office.js displayReplyAllForm. Frontend-only.

### 1.2 Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | TypeScript |
| API | Office.js Mailbox 1.3+ |
| Fallback | Clipboard API |

### 1.3 Constraints

- Behavior differs Desktop vs Web
- Mobile not supported
- ReadItem permission sufficient

---

## 2. Architecture

```
OEHA-4 content → textToHtml() → displayReplyAllForm({ htmlBody })
                                        ↓ (fallback)
                                  clipboard.writeText()
```

---

## 3. Implementation

### 3.1 textToHtml

```typescript
export function textToHtml(text: string): string {
  let clean = text.replace(/<[^>]*>/g, '');  // strip HTML
  clean = clean.trim();
  const paragraphs = clean.split(/\n\s*\n/);
  return paragraphs
    .filter(p => p.trim().length > 0)
    .map(p => `<p>${p.trim().replace(/\n/g, '<br>')}</p>`)
    .join('');
}
```

### 3.2 InsertService

```typescript
export class InsertService {
  insertReply(content: string): void {
    const htmlBody = textToHtml(content);
    try {
      Office.context.mailbox.item.displayReplyAllForm({ htmlBody });
      showToast('success', 'Đã chèn nội dung vào Reply All');
    } catch {
      this.copyFallback(content);
    }
  }
  
  private async copyFallback(content: string) {
    await navigator.clipboard.writeText(content);
    showToast('info', 'Đã copy. Paste vào Reply All (Ctrl+V).');
  }
}
```

### 3.3 Platform Support

| Platform | Supported | Behavior |
|----------|-----------|----------|
| Desktop Windows | Yes | Popup compose |
| Desktop Mac | Yes | Popup compose |
| Outlook Web | Yes | Inline compose |
| Mobile | No | Clipboard fallback |

---

## 4. Toast System

```typescript
export class ToastManager {
  show(type: 'success'|'error'|'info', msg: string, ms = 5000): void {
    const el = document.getElementById('toast');
    el.className = `toast toast-${type} visible`;
    el.textContent = msg;
    setTimeout(() => el.classList.remove('visible'), ms);
  }
}
```

---

## 5. Security

- textToHtml strips ALL HTML tags first
- No innerHTML with raw AI content
- No auto-send (user controls Send)

---

## 6. Implementation Checklist

| # | File | Action |
|---|------|--------|
| 1 | `src/taskpane/services/insert-service.ts` | VERIFY (from OEHA-4) |
| 2 | `src/taskpane/ui/toast-manager.ts` | CREATE |
| 3 | `src/taskpane/taskpane.html` | MODIFY (toast container) |
| 4 | `src/taskpane/taskpane.css` | MODIFY (toast styles) |

---

## 7. Testing

1. Desktop: displayReplyAllForm opens with content
2. Web: inline compose works
3. Clipboard fallback when API fails
4. HTML formatting correct
5. Vietnamese diacritics preserved
6. No script tags pass through
