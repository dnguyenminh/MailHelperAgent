# Business Requirements Document (BRD)

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
| Parent Epic | OEHA-1: Outlook Email Helper Agent - AI Mail Assistant |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-20 | BA Agent | Initiate document — auto-generated from Jira ticket OEHA-2 |

---

## 1. Introduction

### 1.1 Scope

Story này implement tính năng cốt lõi đầu tiên của Outlook Email Helper Agent: **đọc nội dung email hiện tại** mà user đang xem trong Outlook thông qua Office.js API. Đây là foundation cho toàn bộ các tính năng AI phía sau (tóm tắt, gợi ý reply).

**Phạm vi bao gồm:**
- Đọc subject, sender, recipients, date của email đang được chọn
- Đọc toàn bộ body content (plain text) của email/mail thread
- Hiển thị thông tin email lên Taskpane UI
- Xử lý các trường hợp lỗi (không có email được chọn, permission denied)

### 1.2 Out of Scope

- Xử lý AI (tóm tắt, gợi ý) — thuộc OEHA-3, OEHA-4
- Ghi/chỉnh sửa nội dung email
- Đọc attachments
- Đọc calendar items
- Xử lý email draft (chỉ đọc received/sent mail)

### 1.3 Preliminary Requirement

- Project Outlook Add-in đã được scaffold (Yeoman generator)
- Node.js environment đã sẵn sàng
- Outlook Desktop hoặc Outlook Web có sẵn để sideload testing
- Office.js library đã được include trong project (đã có)

---

## 2. Business Requirements

### 2.1 High Level Process Map

User mở Outlook → Chọn email → Click "Show Task Pane" trên ribbon → Add-in Taskpane hiển thị → Tự động đọc email hiện tại → Hiển thị metadata + body content lên Taskpane.

### 2.2 List of User Stories / Use Cases

| # | Story / Use Case | Priority | Source Ticket |
|---|------------------|----------|---------------|
| 1 | As a user, I want to see the current email's subject and sender displayed in the Taskpane so that I can confirm which email is being processed | MUST HAVE | OEHA-2 |
| 2 | As a user, I want the full email body (including thread/conversation) to be extracted as plain text so that it can be processed by AI features later | MUST HAVE | OEHA-2 |
| 3 | As a user, I want to see a clear error message when no email is selected or when the add-in cannot access email content | MUST HAVE | OEHA-2 |

---

### 2.3 Details of User Stories

---

#### Business Flow

**Step 1:** User mở Outlook application (Desktop hoặc Web)

**Step 2:** User chọn (click) một email trong Inbox hoặc bất kỳ folder nào

**Step 3:** User click nút "Show Task Pane" trên ribbon tab của Add-in

**Step 4:** Taskpane mở ra bên phải, Office.js initialize

**Step 5:** Add-in tự động detect email đang được chọn qua `Office.context.mailbox.item`

**Step 6:** Add-in đọc metadata (subject, from, to, date) và body content

**Step 7:** Hiển thị thông tin lên Taskpane UI với format rõ ràng

> **Note:** Nếu user chuyển sang email khác khi Taskpane đang mở, cần có cơ chế refresh (manual hoặc auto-detect item change).

---

#### STORY 1: Display Email Metadata

> As a user, I want to see the current email's subject and sender displayed in the Taskpane so that I can confirm which email is being processed.

**Requirement Details:**

1. Khi Taskpane mở, tự động đọc email hiện tại đang được chọn trong Outlook
2. Hiển thị các metadata fields: Subject, From (tên + email), To (danh sách recipients), Date
3. Nếu email là một phần của conversation/thread, hiển thị conversation topic
4. UI phải responsive và theo Microsoft Fluent UI design guidelines

**Data Fields:**

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| subject | string | Yes | Tiêu đề email | "Re: Project Timeline Update" |
| from | object | Yes | Sender info (name + email) | { name: "John", email: "john@company.com" } |
| to | array | Yes | Danh sách recipients | [{ name: "Team", email: "team@company.com" }] |
| dateTimeCreated | DateTime | Yes | Thời gian email được gửi | "2025-01-20T10:30:00Z" |
| conversationId | string | No | ID conversation (mail thread) | "AAQkAGI2..." |

**Acceptance Criteria:**

1. GIVEN user đang xem một email, WHEN Taskpane opens, THEN subject và sender name hiển thị trong vòng 1 giây
2. GIVEN email có nhiều recipients, WHEN metadata displayed, THEN tất cả recipients được hiển thị (hoặc "và N người khác" nếu >3)
3. GIVEN email là reply/forward (có prefix Re:/Fw:), WHEN displayed, THEN giữ nguyên subject line không strip prefix

**UI Specifications:**

| No. | Name | Type | Required | Description | Note |
|-----|------|------|----------|-------------|------|
| 1 | Subject Label | h2 text | Yes | Hiển thị subject email | Bold, truncate nếu quá dài |
| 2 | From Info | text + avatar | Yes | Sender name và email | Có icon envelope |
| 3 | To Info | text list | Yes | Recipients | Collapse nếu >3 người |
| 4 | Date | text | Yes | Formatted date | Format: "dd/MM/yyyy HH:mm" |
| 5 | Refresh Button | Button | Yes | Reload email data | Icon: Sync |

---

#### STORY 2: Extract Full Email Body Content

> As a user, I want the full email body (including thread/conversation) to be extracted as plain text so that it can be processed by AI features later.

**Requirement Details:**

1. Đọc toàn bộ body content của email đang được chọn
2. Convert từ HTML sang Plain Text (dùng `Office.CoercionType.Text`) để giảm tokens khi gửi AI
3. Nếu email là reply/forward chứa quoted conversation bên dưới, vẫn lấy TOÀN BỘ nội dung (bao gồm history)
4. Lưu trữ body content trong memory (biến) sẵn sàng để các module khác (OEHA-3, OEHA-4) sử dụng
5. Giới hạn max body length: 32,000 ký tự (tránh vượt context window LLM)

**Data Fields:**

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| bodyText | string | Yes | Nội dung email dạng plain text | "Hi team,\nPlease review..." |
| bodyLength | number | Yes | Số ký tự của body | 2450 |
| isTruncated | boolean | Yes | Flag nếu body bị cắt | false |
| originalLength | number | No | Chiều dài gốc nếu bị truncate | 45000 |

**Acceptance Criteria:**

1. GIVEN email có body HTML, WHEN extracted, THEN output là plain text không chứa HTML tags
2. GIVEN email body > 32,000 ký tự, WHEN extracted, THEN body bị truncate tại 32,000 chars và `isTruncated = true`
3. GIVEN email là reply có quoted thread bên dưới (pattern "From: ... Sent: ..."), WHEN extracted, THEN toàn bộ thread content được include
4. GIVEN body extracted successfully, WHEN stored, THEN các module OEHA-3/OEHA-4 có thể access được body content

**Validation Rules:**

- Body không được null hoặc empty string sau extraction
- Nếu coercion fail, retry với HTML type rồi strip tags manually
- Unicode/special characters phải được preserve đúng

**Error Handling:**

- Body extraction timeout (>5 giây): Hiển thị thông báo "Đang tải nội dung email..." và retry 1 lần
- Body null/empty: Hiển thị "Không thể đọc nội dung email. Vui lòng thử lại."
- Permission denied: Hiển thị "Add-in chưa có quyền đọc email. Vui lòng kiểm tra cấu hình."

---

#### STORY 3: Error Handling & Edge Cases

> As a user, I want to see a clear error message when no email is selected or when the add-in cannot access email content.

**Requirement Details:**

1. Xử lý trường hợp Taskpane mở khi không có email nào được chọn
2. Xử lý trường hợp Office.js chưa ready
3. Xử lý trường hợp user đang ở compose mode (viết mail mới) — không phải read mode
4. Cung cấp feedback rõ ràng cho mỗi error state

**Acceptance Criteria:**

1. GIVEN no email selected, WHEN Taskpane opens, THEN hiển thị "Vui lòng chọn một email để bắt đầu"
2. GIVEN user đang compose new email, WHEN Taskpane opened, THEN hiển thị "Tính năng này chỉ hoạt động khi đọc email"
3. GIVEN Office.js fails to initialize, WHEN Taskpane loads, THEN hiển thị "Không thể kết nối Outlook. Vui lòng tải lại add-in."
4. GIVEN all error states, WHEN displayed, THEN có nút "Thử lại" để user retry

**Error Handling:**

- `Office.context.mailbox.item === null`: No email selected state
- `info.host !== Office.HostType.Outlook`: Wrong host application
- `result.status !== Office.AsyncResultStatus.Succeeded`: API call failed
- Network timeout: Office.js library không load được

---

## 3. Dependencies

| Dependency | Type | Related Ticket | Description |
|------------|------|----------------|-------------|
| Office.js API | External Library | N/A | Microsoft Office JavaScript API for reading mailbox items |
| Outlook Desktop/Web | Infrastructure | N/A | Host application — user phải có Outlook để chạy add-in |
| HTTPS hosting | Infrastructure | N/A | Add-in phải được serve qua HTTPS (localhost:3000 for dev) |
| Manifest.json | Configuration | N/A | Add-in manifest đã cấu hình permission ReadItem |

---

## 4. Stakeholders

| Role | Name / Team | Responsibility | Source |
|------|-------------|----------------|--------|
| Product Owner | Project Owner | Define requirements, approve deliverables | Jira reporter |
| Developer | Dev Team | Implement Office.js integration | Jira assignee |
| End User | Office workers | Use add-in to read email content | Target audience |

---

## 5. Risks and Assumptions

### 5.1 Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Office.js API version incompatibility | High | Low | Pin API version, test across Outlook versions |
| Large email body exceeds memory/token limits | Medium | Medium | Implement 32K char truncation |
| Outlook Mobile không support đầy đủ Office.js | Medium | Medium | Focus desktop/web first, mobile as stretch goal |
| CORS issues khi gọi backend từ Add-in | High | Medium | Configure CORS trên FastAPI backend |

### 5.2 Assumptions

- User có Outlook Desktop (Windows/Mac) hoặc Outlook Web Access
- Manifest đã được sideload hoặc deploy qua Admin Center
- Email được chọn là received/sent mail (không phải draft)
- Office.js Mailbox API version 1.3+ available

---

## 6. Non-Functional Requirements

| Category | Requirement | Details |
|----------|-------------|---------|
| Performance | Email metadata load < 1 giây | Office.js API call phải complete trong 1s |
| Performance | Body extraction < 3 giây | Kể cả email dài, timeout tối đa 5s |
| Compatibility | Outlook Desktop (Windows) + Outlook Web | Minimum supported platforms |
| UX | Error messages hiển thị bằng tiếng Việt | Target user là người Việt |
| Security | Không gửi email content ra ngoài trong story này | Content chỉ lưu local trong memory |

---

## 7. Related Tickets

| Ticket Key | Summary | Status | Type | Relationship |
|------------|---------|--------|------|--------------|
| OEHA-1 | Outlook Email Helper Agent - AI Mail Assistant | To Do | Epic | Parent epic |
| OEHA-2 | Read Email Content - Đọc mail hiện tại qua Office.js API | To Do | Story | Main ticket |
| OEHA-3 | Summarize Mail Loop - Tóm tắt chuỗi email bằng AI | To Do | Story | Depends on OEHA-2 |
| OEHA-4 | Suggest Reply Options - Gợi ý 2-3 phương án trả lời | To Do | Story | Depends on OEHA-2 |
| OEHA-5 | Auto-Insert Reply - Tự động chèn reply vào Outlook form | To Do | Story | Depends on OEHA-4 |

---

## 8. Appendix

### Glossary

| Term | Definition |
|------|------------|
| Office.js | Microsoft JavaScript API cho Office Add-ins |
| Taskpane | Panel UI hiển thị bên phải trong Outlook |
| Sideload | Cài đặt add-in thủ công để test (không qua Store) |
| Mail Loop/Thread | Chuỗi email reply qua lại giữa nhiều người |
| CoercionType | Kiểu convert data trong Office.js (Text, HTML) |

### Technical References

| Document | Link / Location |
|----------|-----------------|
| Phase 1 - Initialize | documents/Phase 1 - Initialize.md |
| Phase 2 - Apply Ollama | documents/Phase 2 - Apply Ollama |
| Office.js Mailbox API | https://learn.microsoft.com/en-us/javascript/api/outlook |
| Manifest Configuration | manifest.json |

### Key Office.js API Methods

```typescript
// Core methods sẽ được sử dụng:
Office.context.mailbox.item.subject          // Get email subject
Office.context.mailbox.item.from             // Get sender info
Office.context.mailbox.item.to               // Get recipients
Office.context.mailbox.item.dateTimeCreated  // Get date
Office.context.mailbox.item.body.getAsync()  // Get body content
```
