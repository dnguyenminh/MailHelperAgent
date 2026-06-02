# Functional Specification Document (FSD)

## Outlook Email Helper Agent — OEHA-2: Read Email Content - Đọc mail hiện tại qua Office.js API

---

## Document Information

| Field | Value |
|-------|-------|
| Jira Ticket | OEHA-2 |
| Title | Read Email Content - Đọc mail hiện tại qua Office.js API |
| Author | BA Agent |
| Version | 1.0 |
| Date | 2025-01-20 |
| Status | Draft |
| Related BRD | documents/OEHA-2/BRD-OEHA-2.md |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-20 | BA Agent | Initiate document — auto-generated from BRD-OEHA-2 |

---

## 1. Introduction

### 1.1 Purpose

FSD này chi tiết hóa các yêu cầu chức năng cho tính năng **đọc nội dung email hiện tại** qua Office.js API trong Outlook Add-in. Đây là foundation layer cho toàn bộ pipeline AI (OEHA-3: Summarize, OEHA-4: Suggest Reply, OEHA-5: Auto-Insert).

### 1.2 Scope

- Đọc email metadata (subject, from, to, date) qua `Office.context.mailbox.item`
- Đọc email body content dạng plain text qua `item.body.getAsync()`
- Hiển thị thông tin lên Taskpane UI
- Xử lý error states (no email selected, compose mode, permission denied)
- Cung cấp data layer cho downstream features (OEHA-3, OEHA-4)

### 1.3 Definitions & Acronyms

| Term | Definition |
|------|------------|
| Office.js | Microsoft JavaScript API cho Office Add-ins |
| Taskpane | Panel UI hiển thị bên phải trong Outlook |
| CoercionType | Kiểu convert data trong Office.js (Text, HTML) |
| Mail Loop/Thread | Chuỗi email reply qua lại giữa nhiều người |
| Sideload | Cài đặt add-in thủ công để test |

### 1.4 References

| Document | Location |
|----------|----------|
| BRD | documents/OEHA-2/BRD-OEHA-2.md |
| Phase 1 - Initialize | documents/Phase 1 - Initialize.md |
| Office.js Mailbox API | https://learn.microsoft.com/en-us/javascript/api/outlook |
| Manifest | manifest.json |

---

## 2. System Overview

### 2.1 System Context

Outlook Add-in Taskpane chạy embedded trong Outlook application. Taskpane giao tiếp với Outlook qua Office.js API để đọc email data. Không có backend trong story này — toàn bộ logic frontend-only.

**Actors:**
- Office User: Người dùng Outlook đang xem email
- Office.js API: Interface cung cấp bởi Microsoft để access Outlook data
- Outlook Host: Outlook Desktop hoặc Outlook Web chứa add-in

### 2.2 System Architecture

**Frontend Only** — Story này không có backend. Toàn bộ logic chạy trong Outlook Add-in Taskpane qua Office.js API.

| Layer | Technology | Responsibility |
|-------|-----------|---------------|
| UI | HTML + CSS (Fluent UI) | Hiển thị metadata + body |
| Logic | TypeScript | Đọc email, xử lý data, error handling |
| API | Office.js Mailbox 1.3+ | Interface với Outlook |
| Host | Outlook Desktop/Web | Chứa Add-in Taskpane |

---

## 3. Functional Requirements

### 3.1 Feature: Read Email Metadata

**Source:** BRD Story 1

#### 3.1.1 Description

Khi user mở Taskpane, add-in tự động đọc metadata của email đang được chọn trong Outlook và hiển thị lên UI. Metadata bao gồm: Subject, From (name + email), To (recipients list), DateTimeCreated.

#### 3.1.2 Use Case

**Use Case ID:** UC-01  
**Actor:** Office User  
**Preconditions:**
- Outlook đang mở
- User đã chọn (click) một email trong inbox/folder
- Add-in Taskpane đã được mở (Show Task Pane)

**Postconditions:**
- Metadata email hiển thị đầy đủ trên Taskpane
- Data available cho downstream modules

**Main Flow:**

| Step | Actor | System | Description |
|------|-------|--------|-------------|
| 1 | User clicks "Show Task Pane" | | Mở Taskpane panel |
| 2 | | Office.js initializes | `Office.onReady()` fires |
| 3 | | Check host type | Verify `info.host === Office.HostType.Outlook` |
| 4 | | Read `Office.context.mailbox.item` | Get reference to current email |
| 5 | | Extract metadata fields | subject, from, to, dateTimeCreated |
| 6 | | Render metadata to UI | Display formatted metadata in Taskpane |

**Alternative Flows:**

| ID | Condition | Steps |
|----|-----------|-------|
| AF-01 | User switches to different email while Taskpane open | User clicks "Refresh" button → System re-reads metadata from new email → UI updates |
| AF-02 | Email has >3 recipients | Display first 3 recipients + "và {N} người khác" |

**Exception Flows:**

| ID | Condition | Steps |
|----|-----------|-------|
| EF-01 | No email selected (`item === null`) | Display: "Vui lòng chọn một email để bắt đầu" + Retry button |
| EF-02 | User in Compose mode | Display: "Tính năng này chỉ hoạt động khi đọc email" |
| EF-03 | Office.js fails to initialize | Display: "Không thể kết nối Outlook. Vui lòng tải lại add-in." |

#### 3.1.3 Business Rules

| Rule ID | Rule | Source |
|---------|------|--------|
| BR-01 | Metadata phải load trong < 1 giây | BRD NFR |
| BR-02 | Subject hiển thị nguyên (không strip Re:/Fw:) | BRD AC-3 |
| BR-03 | Recipients > 3 → collapse with count | BRD Story 1 |
| BR-04 | Date format: dd/MM/yyyy HH:mm | BRD UI Spec |

#### 3.1.4 Data Specifications

**Input Data (from Office.js):**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| item.subject | string | Yes | Not null | Email subject line |
| item.from | EmailAddressDetails | Yes | Has displayName + emailAddress | Sender info |
| item.to | EmailAddressDetails[] | Yes | Array length >= 1 | Recipients |
| item.dateTimeCreated | Date | Yes | Valid Date object | Email timestamp |

**Output Data (to UI):**

| Field | Type | Description |
|-------|------|-------------|
| displaySubject | string | Subject text (as-is) |
| displayFrom | string | "{name} <{email}>" |
| displayTo | string | Formatted recipients string |
| displayDate | string | "dd/MM/yyyy HH:mm" formatted |

#### 3.1.5 UI Specifications

**Screen: Email Metadata Panel**

| No. | Element | Type | Required | Behavior | Validation |
|-----|---------|------|----------|----------|------------|
| 1 | Subject | h2 text | Yes | Display email subject, bold, truncate with ellipsis if > 80 chars | Not empty |
| 2 | From Info | p text + icon | Yes | "📧 {senderName} ({senderEmail})" | Valid email format |
| 3 | To Info | p text | Yes | "👥 {recipient1}, {recipient2}, ..." or "👥 {r1}, {r2}, {r3} và {N} người khác" | At least 1 recipient |
| 4 | Date | p text | Yes | "📅 {dd/MM/yyyy HH:mm}" | Valid date |
| 5 | Refresh Button | button | Yes | Click → re-read email metadata + body | Always enabled |
| 6 | Divider | hr | Yes | Visual separator below metadata | N/A |

#### 3.1.6 API Contract (Functional View)

> **Note:** Story này không có backend API. Data source là Office.js local API.

**Office.js Properties Used:**

| Property | Type | Purpose | Error Case |
|----------|------|---------|------------|
| `Office.context.mailbox.item` | MailboxItem | Get current email reference | null if no email selected |
| `.subject` | string | Email subject | Empty string possible |
| `.from` | EmailAddressDetails | Sender info | null if draft |
| `.to` | EmailAddressDetails[] | Recipients | Empty array possible |
| `.dateTimeCreated` | Date | Timestamp | null for drafts |

---

### 3.2 Feature: Extract Email Body Content

**Source:** BRD Story 2

#### 3.2.1 Description

Đọc toàn bộ email body content dưới dạng plain text, lưu vào memory sẵn sàng cho các module AI downstream. Hỗ trợ truncation nếu body quá dài (>32,000 ký tự).

#### 3.2.2 Use Case

**Use Case ID:** UC-02  
**Actor:** Office User (indirect — auto-triggered)  
**Preconditions:**
- UC-01 completed successfully (metadata loaded)
- `Office.context.mailbox.item` is not null

**Postconditions:**
- `bodyText` variable populated with email plain text content
- `bodyLength` and `isTruncated` flags set
- Data ready for OEHA-3/OEHA-4 consumption

**Main Flow:**

| Step | Actor | System | Description |
|------|-------|--------|-------------|
| 1 | | Trigger body extraction | Auto-triggered after metadata load |
| 2 | | Call `item.body.getAsync(Office.CoercionType.Text, callback)` | Request plain text body |
| 3 | | Receive async result | Check `result.status === Succeeded` |
| 4 | | Measure body length | `bodyText.length` |
| 5 | | Truncate if > 32000 chars | Keep first 32000 chars, set `isTruncated = true` |
| 6 | | Store in module-level variable | Available for OEHA-3, OEHA-4 |
| 7 | | Update UI indicator | Show "📝 {bodyLength} ký tự" or "📝 {bodyLength} ký tự (đã cắt)" |

**Alternative Flows:**

| ID | Condition | Steps |
|----|-----------|-------|
| AF-01 | Body text coercion fails | Try `Office.CoercionType.Html` → strip HTML tags manually → use result |
| AF-02 | Body is very short (< 50 chars) | Still process normally, no special handling |

**Exception Flows:**

| ID | Condition | Steps |
|----|-----------|-------|
| EF-01 | `result.status !== Succeeded` | Display: "Không thể đọc nội dung email. Vui lòng thử lại." + Retry |
| EF-02 | Body null or empty string | Display: "Email không có nội dung." |
| EF-03 | Timeout > 5 seconds | Display: "Đang tải nội dung email..." + auto-retry 1 time |

#### 3.2.3 Business Rules

| Rule ID | Rule | Source |
|---------|------|--------|
| BR-05 | Body extraction < 3 giây (timeout 5s max) | BRD NFR |
| BR-06 | Max body length: 32,000 ký tự | BRD Story 2 |
| BR-07 | Fallback: HTML → strip tags if Text coercion fails | BRD Story 2 |
| BR-08 | Unicode/special characters MUST be preserved | BRD Story 2 |
| BR-09 | Include entire thread content (quoted replies) | BRD Story 2 |

#### 3.2.4 Data Specifications

**Input Data:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| Office.CoercionType | enum | Yes | Text (preferred) or Html (fallback) | Coercion type for body |

**Output Data (stored in memory):**

| Field | Type | Description |
|-------|------|-------------|
| bodyText | string | Plain text email content (max 32000 chars) |
| bodyLength | number | Character count of bodyText |
| isTruncated | boolean | true if original > 32000 chars |
| originalLength | number | Original length before truncation (if truncated) |

#### 3.2.5 API Contract (Functional View)

**Office.js Async Method:**

```typescript
item.body.getAsync(
  Office.CoercionType.Text,
  { asyncContext: "body-extraction" },
  (result: Office.AsyncResult<string>) => {
    // result.status: Succeeded | Failed
    // result.value: string (body text)
    // result.error: Office.Error (if failed)
  }
);
```

**Business Error Scenarios:**

| Scenario | User Message | Trigger Condition |
|----------|-------------|-------------------|
| Extraction timeout | "Đang tải nội dung email..." | > 5 seconds wait |
| Empty body | "Email không có nội dung." | result.value is empty string |
| Permission error | "Add-in chưa có quyền đọc email." | result.error indicates permission |

---

### 3.3 Feature: Error Handling & Edge Cases

**Source:** BRD Story 3

#### 3.3.1 Description

Xử lý tất cả error states có thể xảy ra khi add-in không thể đọc email content, cung cấp feedback rõ ràng bằng tiếng Việt.

#### 3.3.2 Use Case

**Use Case ID:** UC-03  
**Actor:** Office User  
**Preconditions:** User mở Taskpane trong trạng thái bất thường

**Main Flow:**

| Step | Actor | System | Description |
|------|-------|--------|-------------|
| 1 | User opens Taskpane | | Any context |
| 2 | | Check Office.onReady result | Verify host is Outlook |
| 3 | | Check mailbox.item | Verify email is selected |
| 4 | | Detect item type | Read mode vs Compose mode |
| 5 | | Show appropriate error OR proceed | Branch based on state |

#### 3.3.3 Error State Matrix

| State | Detection Logic | UI Message | Action Available |
|-------|----------------|------------|-----------------|
| Office.js not ready | `info.host !== Outlook` | "Không thể kết nối Outlook. Vui lòng tải lại add-in." | Refresh page |
| No email selected | `mailbox.item === null` | "Vui lòng chọn một email để bắt đầu" | Retry button |
| Compose mode | item exists but no `from` property | "Tính năng này chỉ hoạt động khi đọc email" | None (info only) |
| Body extraction failed | `result.status !== Succeeded` | "Không thể đọc nội dung email. Vui lòng thử lại." | Retry button |
| Permission denied | API throws permission error | "Add-in chưa có quyền đọc email. Vui lòng kiểm tra cấu hình." | Link to docs |

#### 3.3.4 Business Rules

| Rule ID | Rule | Source |
|---------|------|--------|
| BR-10 | All error messages in Vietnamese | BRD NFR |
| BR-11 | Every error state has recovery action (retry/refresh) | BRD Story 3 |
| BR-12 | Retry = re-run entire initialization flow | BRD Story 3 |

#### 3.3.5 UI Specifications — Error States

| No. | Element | Type | Required | Behavior |
|-----|---------|------|----------|----------|
| 1 | Error Icon | Emoji/Icon | Yes | ⚠️ warning icon, centered |
| 2 | Error Message | p text | Yes | Vietnamese error description |
| 3 | Retry Button | button | Conditional | "🔄 Thử lại" — triggers re-initialization |

---

## 4. Data Model

> **Note:** Story này không có persistent data model. Data chỉ tồn tại trong memory (TypeScript variables) trong session.

### 4.1 In-Memory Data Structure

```typescript
interface EmailData {
  // Metadata (from UC-01)
  subject: string;
  from: { name: string; email: string };
  to: Array<{ name: string; email: string }>;
  dateTimeCreated: Date;
  
  // Body content (from UC-02)
  bodyText: string;
  bodyLength: number;
  isTruncated: boolean;
  originalLength?: number;
}

interface AppState {
  isLoading: boolean;
  error: string | null;
  emailData: EmailData | null;
  isReady: boolean;
}
```

### 4.2 Data Lifecycle

| Event | Data Action | Persistence |
|-------|-------------|-------------|
| Taskpane opens | Initialize empty state | Memory only |
| Email metadata read | Populate emailData metadata fields | Memory only |
| Body extracted | Populate emailData body fields | Memory only |
| User clicks Refresh | Re-read all, replace state | Memory only |
| Taskpane closes | All data lost | None |
| User switches email | Data stale until Refresh | Memory only |

---

## 5. Integration Specifications

### 5.1 External System: Office.js Mailbox API

| Attribute | Value |
|-----------|-------|
| Purpose | Read email content from Outlook |
| Direction | Inbound (read-only) |
| Data Format | JavaScript objects |
| Frequency | On-demand (user action) |
| Version Required | Mailbox API 1.3+ |

**Data Exchange:**

| Our Data | Office.js Property | Direction | Business Rule |
|----------|-------------------|-----------|---------------|
| subject | item.subject | Receive | BR-02: No strip prefix |
| from | item.from | Receive | Map to {name, email} |
| to | item.to | Receive | BR-03: Collapse if >3 |
| date | item.dateTimeCreated | Receive | BR-04: Format dd/MM/yyyy |
| bodyText | item.body.getAsync(Text) | Receive | BR-06: Max 32K |

### 5.2 Internal Integration: Downstream Modules

| Consumer | Data Needed | Access Method | When |
|----------|------------|---------------|------|
| OEHA-3 (Summarize) | subject + bodyText | Read from shared module variable | User clicks "Tóm tắt" |
| OEHA-4 (Suggest Reply) | subject + bodyText | Read from shared module variable | User clicks "Gợi ý trả lời" |

**Shared Data Contract (exported from email-reader module):**

```typescript
export function getEmailData(): EmailData | null;
export function isEmailLoaded(): boolean;
export function refreshEmail(): Promise<void>;
```

---

## 6. Processing Logic

### 6.1 Email Read Process

**Trigger:** Taskpane opens OR user clicks Refresh  
**Input:** Current selected email in Outlook  
**Output:** Populated EmailData object

**Processing Steps:**

| Step | Description | Error Handling |
|------|-------------|----------------|
| 1 | Verify Office.js ready | Show "Không thể kết nối" if not |
| 2 | Check `mailbox.item` not null | Show "Chọn email" if null |
| 3 | Read metadata synchronously | subject, from, to, date |
| 4 | Call body.getAsync(Text) | Timeout 5s, retry 1x |
| 5 | Validate body not empty | Show warning if empty |
| 6 | Truncate if > 32000 chars | Set isTruncated flag |
| 7 | Store in EmailData | Update AppState |
| 8 | Render UI | Show metadata + body indicator |

### 6.2 HTML Tag Stripping (Fallback)

**Trigger:** `body.getAsync(CoercionType.Text)` fails  
**Input:** HTML body string  
**Output:** Plain text string

**Pseudocode:**

```
function stripHtmlTags(html: string): string:
    1. Remove <script>...</script> elements entirely
    2. Remove <style>...</style> elements entirely
    3. Replace <br> and <br/> with \n
    4. Replace </p> with \n\n
    5. Remove all remaining HTML tags via regex
    6. Decode HTML entities (&amp; → &, &lt; → <, etc.)
    7. Normalize whitespace (collapse 3+ newlines → 2)
    8. Trim leading/trailing whitespace
    9. Return cleaned text
```

### 6.3 Date Formatting

**Input:** JavaScript Date object  
**Output:** "dd/MM/yyyy HH:mm" string

```
function formatDate(date: Date): string:
    day = date.getDate().toString().padStart(2, '0')
    month = (date.getMonth() + 1).toString().padStart(2, '0')
    year = date.getFullYear()
    hours = date.getHours().toString().padStart(2, '0')
    minutes = date.getMinutes().toString().padStart(2, '0')
    return `${day}/${month}/${year} ${hours}:${minutes}`
```

---

## 7. Security Requirements

### 7.1 Authentication & Authorization

| Role | Permissions | Screens/Features |
|------|-------------|-------------------|
| Any Outlook User | ReadItem (manifest permission) | Read email metadata + body |

### 7.2 Data Sensitivity Classification

| Data Type | Classification | Business Requirement |
|-----------|---------------|---------------------|
| Email body content | Confidential | Not sent outside of local memory in this story |
| Email metadata | Internal | Displayed only in Taskpane |
| Recipient emails | Internal | Displayed in Taskpane, not stored persistently |

### 7.3 Security Constraints

| Constraint | Implementation |
|-----------|---------------|
| No external data transmission | bodyText stays in browser memory only |
| XSS prevention | All dynamic content inserted via textContent, not innerHTML |
| Permission minimum | ReadItem only (not ReadWriteMailbox) |
| HTTPS required | Add-in served via https://localhost:3000 |

---

## 8. Non-Functional Requirements

| Category | Business Requirement | Acceptance Criteria |
|----------|---------------------|---------------------|
| Performance | Metadata loads instantly | < 1 second from Taskpane open to metadata visible |
| Performance | Body extraction fast | < 3 seconds for normal emails, timeout at 5s |
| Compatibility | Multi-platform | Outlook Desktop (Win/Mac) + Outlook Web |
| UX | Vietnamese error messages | All user-facing text in Vietnamese |
| Security | Data stays local | No network calls in this story |
| Reliability | Graceful error handling | Every error state has clear message + recovery action |

---

## 9. Error Handling (User-Facing)

### 9.1 Error Scenarios

| Scenario | Severity | User Message | Expected Behavior |
|----------|----------|-------------|-------------------|
| No email selected | Warning | "Vui lòng chọn một email để bắt đầu" | Show retry button |
| Compose mode active | Info | "Tính năng này chỉ hoạt động khi đọc email" | No action available |
| Office.js init failure | Critical | "Không thể kết nối Outlook. Vui lòng tải lại add-in." | Refresh page |
| Body extraction fails | Warning | "Không thể đọc nội dung email. Vui lòng thử lại." | Retry button |
| Body empty | Info | "Email không có nội dung." | Inform only |
| Body truncated | Info | "📝 Nội dung email quá dài, đã cắt bớt ({truncatedLength}/{originalLength} ký tự)" | Inform only |

---

## 10. Testing Considerations

### 10.1 Test Scenarios

| ID | Scenario | Input | Expected Output | Priority |
|----|----------|-------|-----------------|----------|
| TC-01 | Read metadata from normal email | Email with subject, from, 2 recipients | All fields displayed correctly | High |
| TC-02 | Read metadata with >3 recipients | Email with 5 To recipients | Shows 3 + "và 2 người khác" | Medium |
| TC-03 | Read body - normal length | Email 2000 chars | Full body stored, isTruncated=false | High |
| TC-04 | Read body - over 32K chars | Email 45000 chars | Truncated to 32000, isTruncated=true | High |
| TC-05 | No email selected | Open Taskpane without selecting email | Error message + Retry button | High |
| TC-06 | Compose mode | Open Taskpane while composing | Compose mode message | Medium |
| TC-07 | Email with HTML body (fallback) | HTML email, Text coercion fails | Plain text extracted via HTML strip | High |
| TC-08 | Email thread (reply chain) | Reply email with quoted thread | Full thread content extracted | High |
| TC-09 | Unicode/Vietnamese content | Email with Vietnamese characters | Characters preserved correctly | High |
| TC-10 | Refresh button | Click refresh after switching email | New email data loaded | Medium |

---

## 11. Appendix

### 11.1 Sequence Diagram — Email Read Flow

```
User          Taskpane UI        Office.js API        Outlook
 │                │                    │                 │
 │  Open Taskpane │                    │                 │
 ├───────────────►│                    │                 │
 │                │  Office.onReady()  │                 │
 │                ├───────────────────►│                 │
 │                │  {host: Outlook}   │                 │
 │                │◄───────────────────┤                 │
 │                │                    │                 │
 │                │  mailbox.item      │                 │
 │                ├───────────────────►│  Get current    │
 │                │                    ├────────────────►│
 │                │  item (subject,    │  email ref      │
 │                │  from, to, date)   │◄────────────────┤
 │                │◄───────────────────┤                 │
 │                │                    │                 │
 │  Show metadata │                    │                 │
 │◄───────────────┤                    │                 │
 │                │                    │                 │
 │                │  body.getAsync     │                 │
 │                │  (CoercionType.    │  Extract body   │
 │                │   Text)            ├────────────────►│
 │                ├───────────────────►│                 │
 │                │                    │  Plain text     │
 │                │  AsyncResult       │◄────────────────┤
 │                │  {status, value}   │                 │
 │                │◄───────────────────┤                 │
 │                │                    │                 │
 │  Show body     │                    │                 │
 │  indicator     │                    │                 │
 │◄───────────────┤                    │                 │
```

### 11.2 State Diagram — App States

```
[Loading] ──Office.onReady()──► [Ready]
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
            [No Email]     [Compose Mode]   [Reading Email]
                    │                             │
                    │   User selects              ▼
                    │   email + Refresh     [Email Loaded]
                    └─────────────────────►       │
                                                  ▼
                                           [Ready for AI]
```

### 11.3 Change Log from BRD

| BRD Item | FSD Clarification |
|----------|-------------------|
| "Refresh mechanism" | Manual refresh via button only (no auto-detect item change in v1) |
| "Conversation topic" | Deferred — not available via standard Office.js item properties |
| "Avatar display" | Deferred — using emoji icons + text-only for v1 |

