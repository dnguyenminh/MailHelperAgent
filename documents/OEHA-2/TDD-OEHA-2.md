# Technical Design Document (TDD)

## Outlook Email Helper Agent — OEHA-2: Read Email Content

---

## Document Information

| Field | Value |
|-------|-------|
| Jira Ticket | OEHA-2 |
| Title | Read Email Content - Đọc mail hiện tại qua Office.js API |
| Author | SA Agent |
| Version | 1.0 |
| Date | 2025-01-20 |
| Status | Draft |
| Related BRD | BRD-v1-OEHA-2.docx |
| Related FSD | FSD-v1-OEHA-2.docx |

---

## 1. Introduction

### 1.1 Purpose

TDD này mô tả cách implement tính năng đọc email content qua Office.js API. Frontend-only, không có backend. Focus: module architecture, Office.js integration pattern, error handling, và shared data layer cho downstream features.

### 1.2 Scope

- Refactor `taskpane.ts` từ boilerplate thành modular architecture
- Implement email reading service module
- Implement UI rendering module
- Implement shared state management cho OEHA-3/4/5

### 1.3 Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Language | TypeScript | 5.4+ |
| UI Framework | Vanilla TS + Fluent UI CSS | Office UI Fabric Core 11.1 |
| API | Office.js | Mailbox 1.3+ |
| Build | Webpack | 5.95 |
| Package Manager | npm | 10+ |
| Dev Server | webpack-dev-server | 5.1 |

### 1.4 Design Principles

- Modular: Tách biệt service/UI/state layers
- Shared State: Email data accessible cho OEHA-3/4/5
- Defensive: Graceful error handling
- Testable: Pure functions where possible

### 1.5 Constraints

- Office.js chỉ chạy trong Outlook host context
- Async callbacks cho một số Office.js methods
- HTTPS required (localhost:3000)
- No persistent storage for email content

---

## 2. System Architecture

### 2.1 Architecture Overview

Frontend-only architecture. Taskpane runs in iframe within Outlook. Three layers: Service (Office.js), State (memory), UI (DOM).

```
Outlook Host
└── Taskpane (iframe, https://localhost:3000)
    ├── UI Renderer (DOM manipulation)
    ├── State Manager (singleton, in-memory)
    └── Email Service (Office.js wrapper)
        └── Office.js API → Outlook Mailbox
```

### 2.2 Component Diagram

| Component | Responsibility | File |
|-----------|---------------|------|
| EmailService | Read email via Office.js | `src/taskpane/services/email-service.ts` |
| StateManager | App state, expose data to OEHA-3/4/5 | `src/taskpane/state/app-state.ts` |
| UIRenderer | Render metadata, errors, loading | `src/taskpane/ui/renderer.ts` |
| Main | Bootstrap, wire components | `src/taskpane/taskpane.ts` |
| Types | Shared interfaces | `src/taskpane/types/index.ts` |

---

## 3. Module Design

### 3.1 Package Structure

```
src/taskpane/
├── taskpane.ts              # Entry point
├── taskpane.html            # Updated UI template
├── taskpane.css             # Updated styles
├── types/
│   └── index.ts             # EmailData, AppState interfaces
├── services/
│   └── email-service.ts     # Office.js email reading
├── state/
│   └── app-state.ts         # Singleton state manager
└── ui/
    └── renderer.ts          # DOM rendering
```

### 3.2 Key Interfaces

```typescript
// types/index.ts

export interface EmailAddressInfo {
  name: string;
  email: string;
}

export interface EmailData {
  subject: string;
  from: EmailAddressInfo;
  to: EmailAddressInfo[];
  dateTimeCreated: Date;
  bodyText: string;
  bodyLength: number;
  isTruncated: boolean;
  originalLength?: number;
}

export interface AppState {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  emailData: EmailData | null;
}

export type StateChangeListener = (state: AppState) => void;
```

### 3.3 EmailService

```typescript
// services/email-service.ts

const MAX_BODY_LENGTH = 32000;
const BODY_TIMEOUT_MS = 5000;

export class EmailService {
  
  async readEmail(): Promise<EmailData> {
    const item = Office.context.mailbox.item;
    if (!item) throw new Error('NO_EMAIL_SELECTED');
    if (!item.from) throw new Error('COMPOSE_MODE');
    
    const metadata = this.readMetadata(item);
    const body = await this.readBody(item);
    
    return { ...metadata, ...body } as EmailData;
  }
  
  private readMetadata(item: Office.MessageRead): Partial<EmailData> {
    return {
      subject: item.subject || '',
      from: { name: item.from.displayName, email: item.from.emailAddress },
      to: item.to.map(r => ({ name: r.displayName, email: r.emailAddress })),
      dateTimeCreated: item.dateTimeCreated
    };
  }
  
  private readBody(item: Office.MessageRead): Promise<Partial<EmailData>> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('BODY_TIMEOUT')), BODY_TIMEOUT_MS);
      
      item.body.getAsync(Office.CoercionType.Text, (result) => {
        clearTimeout(timeout);
        if (result.status !== Office.AsyncResultStatus.Succeeded) {
          reject(new Error('BODY_EXTRACTION_FAILED'));
          return;
        }
        
        let bodyText = result.value || '';
        const originalLength = bodyText.length;
        let isTruncated = false;
        
        if (bodyText.length > MAX_BODY_LENGTH) {
          bodyText = bodyText.substring(0, MAX_BODY_LENGTH);
          isTruncated = true;
        }
        
        resolve({ bodyText, bodyLength: bodyText.length, isTruncated,
          originalLength: isTruncated ? originalLength : undefined });
      });
    });
  }
}
```

### 3.4 StateManager

```typescript
// state/app-state.ts

export class StateManager {
  private state: AppState = { isLoading: false, isReady: false, error: null, emailData: null };
  private listeners: StateChangeListener[] = [];
  
  getState(): AppState { return { ...this.state }; }
  getEmailData(): EmailData | null { return this.state.emailData; }
  isEmailLoaded(): boolean { return this.state.emailData !== null; }
  
  subscribe(listener: StateChangeListener) { this.listeners.push(listener); }
  
  update(partial: Partial<AppState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach(fn => fn(this.state));
  }
}

export const appState = new StateManager();
```

### 3.5 Design Patterns

| Pattern | Where | Rationale |
|---------|-------|-----------|
| Singleton | StateManager | Single source of truth |
| Observer | State to UI | UI reacts to changes |
| Service Layer | EmailService | Encapsulate Office.js |
| Facade | taskpane.ts | Simple bootstrap |

---

## 4. Security Design

### 4.1 Data Protection

| Data | At Rest | In Transit | In Logs |
|------|---------|------------|---------|
| Email body | Memory only | N/A (no network) | Excluded |
| Metadata | Memory only | N/A | Excluded |

### 4.2 XSS Prevention

- All text via `textContent` (never `innerHTML`)
- No user HTML rendered
- CSP headers from webpack dev server

### 4.3 Permission

- Manifest: `MailboxItem.Read.User` only
- No network permissions for this story

---

## 5. Performance

| Operation | Target | Method |
|-----------|--------|--------|
| Metadata read | < 100ms | Synchronous property access |
| Body extraction | < 3s (5s timeout) | Async with timeout |
| UI render | < 50ms | Minimal DOM ops |

---

## 6. Error Handling

| Error Code | Message | Recovery |
|-----------|---------|----------|
| NO_EMAIL_SELECTED | "Vui lòng chọn một email để bắt đầu" | Retry |
| COMPOSE_MODE | "Tính năng này chỉ hoạt động khi đọc email" | None |
| OFFICE_INIT_FAILED | "Không thể kết nối Outlook" | Refresh |
| BODY_EXTRACTION_FAILED | "Không thể đọc nội dung email" | Retry |
| BODY_TIMEOUT | "Đang tải nội dung email..." | Auto-retry 1x |

---

## 7. Implementation Checklist

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `src/taskpane/types/index.ts` | CREATE | Interfaces |
| 2 | `src/taskpane/services/email-service.ts` | CREATE | Office.js wrapper |
| 3 | `src/taskpane/state/app-state.ts` | CREATE | State singleton |
| 4 | `src/taskpane/ui/renderer.ts` | CREATE | DOM rendering |
| 5 | `src/taskpane/taskpane.ts` | MODIFY | Refactor entry point |
| 6 | `src/taskpane/taskpane.html` | MODIFY | New UI layout |
| 7 | `src/taskpane/taskpane.css` | MODIFY | Fluent UI styles |

### Implementation Order

1. types/index.ts → 2. state/app-state.ts → 3. services/email-service.ts → 4. ui/renderer.ts → 5. taskpane.ts → 6. taskpane.html → 7. taskpane.css

---

## 8. Deployment

| Item | Value |
|------|-------|
| Dev server | https://localhost:3000 |
| Build | `npm run build` |
| Sideload | `npm start` |
| Test | Outlook Desktop or Outlook Web |
