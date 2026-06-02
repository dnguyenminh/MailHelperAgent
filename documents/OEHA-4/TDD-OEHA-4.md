# Technical Design Document (TDD)

## Outlook Email Helper Agent — OEHA-4: Suggest Reply Options

---

## Document Information

| Field | Value |
|-------|-------|
| Jira Ticket | OEHA-4 |
| Title | Suggest Reply Options - Gợi ý 2-3 phương án trả lời |
| Author | SA Agent |
| Version | 1.0 |
| Date | 2025-01-20 |
| Status | Draft |
| Related BRD | BRD-v1-OEHA-4.docx |
| Related FSD | FSD-v1-OEHA-4.docx |

---

## 1. Introduction

### 1.1 Purpose

Frontend UI implementation cho reply suggestions. Backend handled in OEHA-3 (combined response). This story: reply buttons, preview, regenerate, bridge to OEHA-5.

### 1.2 Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | TypeScript + Fluent UI CSS |
| State | In-memory ReplyState |
| Integration | OEHA-5 displayReplyAllForm |

### 1.3 Constraints

- Backend already returns `suggestedReplies` (OEHA-3)
- Max 3 regenerate calls
- Preview scrollable
- Insert connects to OEHA-5

---

## 2. Architecture

No new backend. Frontend components consume `suggestedReplies` from API response.

```
API Response .suggestedReplies[]
    ▼
ReplyRenderer
├── Option Buttons (2-3)
├── Preview Area (textarea, editable)
├── Insert Button → InsertService → Office.js
└── Regenerate Button (max 3x)
```

---

## 3. Module Design

### 3.1 New Files

| File | Responsibility |
|------|---------------|
| `src/taskpane/state/reply-state.ts` | Selection state, regen counter |
| `src/taskpane/ui/reply-renderer.ts` | Buttons, preview, actions |
| `src/taskpane/services/insert-service.ts` | textToHtml + displayReplyAllForm |

### 3.2 ReplyState

```typescript
export class ReplyStateManager {
  private options: ReplyOption[] = [];
  private selectedIndex: number | null = null;
  private previewContent: string = '';
  private regenerateCount: number = 0;
  
  setOptions(opts: ReplyOption[]) { this.options = opts; this.selectedIndex = null; }
  selectOption(i: number) { this.selectedIndex = i; this.previewContent = this.options[i].content; }
  canRegenerate(): boolean { return this.regenerateCount < 3; }
  incrementRegenerate() { this.regenerateCount++; }
  getSelectedContent(): string { return this.previewContent; }
  updatePreview(text: string) { this.previewContent = text; }
}
```

### 3.3 InsertService

```typescript
export class InsertService {
  insertReply(content: string): void {
    const htmlBody = this.textToHtml(content);
    try {
      Office.context.mailbox.item.displayReplyAllForm({ htmlBody });
      this.showToast('success', 'Đã chèn nội dung vào Reply All');
    } catch {
      navigator.clipboard.writeText(content);
      this.showToast('warning', 'Đã copy. Paste vào Reply thủ công.');
    }
  }
  
  private textToHtml(text: string): string {
    const sanitized = text.replace(/<[^>]*>/g, '');
    return sanitized.split('\n\n')
      .map(p => `<p>${p.trim().replace(/\n/g, '<br>')}</p>`).join('');
  }
}
```

---

## 4. UI Design

### 4.1 CSS

```css
.reply-btn-group { display: flex; gap: 8px; margin: 12px 0; flex-wrap: wrap; }
.reply-option-btn { padding: 8px 16px; border: 1px solid #0078d4; border-radius: 4px; }
.reply-option-btn.active { background: #0078d4; color: white; }
.reply-preview { width: 100%; min-height: 120px; padding: 8px; resize: vertical; }
.toast { position: fixed; bottom: 16px; padding: 12px; border-radius: 4px; }
.toast-success { background: #dff6dd; border-left: 4px solid #107c10; }
```

---

## 5. Security

| Concern | Solution |
|---------|----------|
| Script injection | textToHtml strips all HTML tags |
| No auto-send | User must click Send in Outlook |
| Content sanitization | Regex strip before conversion |

---

## 6. Implementation Checklist

| # | File | Action |
|---|------|--------|
| 1 | `src/taskpane/state/reply-state.ts` | CREATE |
| 2 | `src/taskpane/services/insert-service.ts` | CREATE |
| 3 | `src/taskpane/ui/reply-renderer.ts` | CREATE |
| 4 | `src/taskpane/taskpane.ts` | MODIFY |
| 5 | `src/taskpane/taskpane.html` | MODIFY |
| 6 | `src/taskpane/taskpane.css` | MODIFY |

Order: state → service → renderer → wiring
