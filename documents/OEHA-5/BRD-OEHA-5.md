# Business Requirements Document (BRD)

## Outlook Email Helper Agent — OEHA-5: Auto-Insert Reply - Tự động chèn nội dung reply vào Outlook Reply All form

---

## Document Information

| Field | Value |
|-------|-------|
| Jira Ticket | OEHA-5 |
| Title | Auto-Insert Reply - Tự động chèn nội dung reply vào Outlook Reply All form |
| Author | BA Agent |
| Version | 1.0 |
| Date | 2025-01-20 |
| Status | Draft |
| Parent Epic | OEHA-1: Outlook Email Helper Agent - AI Mail Assistant |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-20 | BA Agent | Initiate document — auto-generated from Jira ticket OEHA-5 |

---

## 1. Introduction

### 1.1 Scope

Story này implement tính năng **tự động chèn nội dung reply đã chọn** (từ OEHA-4) vào Outlook Reply All form. Khi user đã chọn phương án trả lời, một click sẽ mở Outlook Reply All window với nội dung reply đã được điền sẵn, user chỉ cần review và click Send.

**Phạm vi bao gồm:**
- Nhận reply content từ OEHA-4 (selected suggestion)
- Mở Outlook Reply All form qua Office.js `displayReplyAllForm()`
- Chèn nội dung reply dưới dạng HTML vào body form
- Format HTML đúng (line breaks, paragraphs)
- Confirm state sau khi chèn thành công

### 1.2 Out of Scope

- Tự động gửi email (user phải click Send manually)
- Reply đơn (Reply) — chỉ support Reply All trước
- Forward email
- Chỉnh sửa recipients sau khi mở form
- Rich text formatting (bold, italic, images) — chỉ plain text + line breaks
- Lưu draft tự động

### 1.3 Preliminary Requirement

- OEHA-4 hoàn thành (user đã chọn reply option với content)
- Office.js permission: ReadWriteItem hoặc ReadItem (displayReplyAllForm chỉ cần ReadItem)
- Manifest configured đúng permissions

---

## 2. Business Requirements

### 2.1 High Level Process Map

User chọn phương án reply (OEHA-4) -> Click "Chèn vào Reply All" -> Add-in gọi `displayReplyAllForm()` với HTML body -> Outlook mở Reply All window với content đã điền -> User review, edit nếu cần -> User click Send (manual).

### 2.2 List of User Stories / Use Cases

| # | Story / Use Case | Priority | Source Ticket |
|---|------------------|----------|---------------|
| 1 | As a user, I want to insert the selected AI reply into Outlook Reply All form with one click | MUST HAVE | OEHA-5 |
| 2 | As a user, I want the inserted reply to be properly formatted (paragraphs, line breaks) | MUST HAVE | OEHA-5 |
| 3 | As a user, I want confirmation that the reply was inserted successfully | SHOULD HAVE | OEHA-5 |
| 4 | As a user, I want to be able to insert reply even if I edited the preview text | SHOULD HAVE | OEHA-5 |

---

### 2.3 Details of User Stories

---

#### Business Flow

**Step 1:** User đã chọn phương án reply từ OEHA-4, preview hiển thị content

**Step 2:** User click nút "Chèn vào Reply All" (primary button)

**Step 3:** Add-in convert plain text content sang HTML (thay `\n` bằng `<br>` hoặc `<p>`)

**Step 4:** Add-in gọi `Office.context.mailbox.item.displayReplyAllForm({ htmlBody: ... })`

**Step 5:** Outlook mở Reply All compose window với nội dung đã chèn sẵn

**Step 6:** Taskpane hiển thị thông báo "Đã chèn nội dung vào Reply All"

**Step 7:** User review nội dung trong Reply All form, edit nếu cần, rồi click Send

> **Note:** `displayReplyAllForm()` mở popup/compose window mới. Nếu đang ở Outlook Web, behavior có thể khác desktop (inline reply vs popup). Cần test cả hai.

---

#### STORY 1: One-Click Insert Reply

> As a user, I want to insert the selected AI reply into Outlook Reply All form with one click.

**Requirement Details:**

1. Nút "Chèn vào Reply All" chỉ enable khi user đã chọn 1 phương án (có preview content)
2. Click nút -> gọi `displayReplyAllForm()` ngay lập tức
3. Content được wrap trong HTML tags cơ bản: `<p>...</p>` với line breaks
4. Reply All form mở với ALL original recipients (Reply All, không phải Reply)
5. Original email quoted phía dưới (Outlook tự handle)

**Data Fields:**

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| replyContent | string | Yes | Nội dung reply plain text (từ OEHA-4) | "Hi anh/chị,\n\nTôi xác nhận..." |
| htmlBody | string | Yes | Nội dung đã convert sang HTML | "<p>Hi anh/chị,</p><p>Tôi xác nhận...</p>" |

**Acceptance Criteria:**

1. GIVEN user selected a reply option, WHEN clicks "Chèn vào Reply All", THEN Outlook Reply All form opens within 1 second
2. GIVEN Reply All form opened, THEN body contains the selected reply content
3. GIVEN Reply All form opened, THEN all original recipients are included (To + CC)
4. GIVEN Reply All form opened, THEN original email is quoted below the inserted reply
5. GIVEN no reply option selected, WHEN looking at Insert button, THEN button is disabled

**Error Handling:**

- `displayReplyAllForm()` not supported: Hiển thị "Phiên bản Outlook này không hỗ trợ tự động chèn reply. Vui lòng copy nội dung thủ công."
- Permission denied: Hiển thị "Add-in không có quyền tạo reply. Kiểm tra cấu hình manifest."
- No current item: Hiển thị "Không có email đang xem. Vui lòng chọn email trước."

---

#### STORY 2: Proper HTML Formatting

> As a user, I want the inserted reply to be properly formatted (paragraphs, line breaks).

**Requirement Details:**

1. Plain text content phải được convert sang HTML trước khi insert
2. Mỗi dòng mới (`\n`) -> `<br>` hoặc wrapped trong `<p>` tags
3. Đoạn trống (double `\n\n`) -> paragraph break (`</p><p>`)
4. Không inject script hoặc style tags (security)
5. Output HTML clean, không excessive whitespace

**Conversion Rules:**

| Input Pattern | Output HTML | Example |
|---------------|-------------|---------|
| Single `\n` | `<br>` | "Dòng 1\nDòng 2" -> "Dòng 1<br>Dòng 2" |
| Double `\n\n` | `</p><p>` | "Đoạn 1\n\nĐoạn 2" -> "<p>Đoạn 1</p><p>Đoạn 2</p>" |
| Leading/trailing whitespace | Trimmed | " text " -> "text" |

**Acceptance Criteria:**

1. GIVEN reply content has line breaks, WHEN inserted, THEN line breaks visible in Reply All form
2. GIVEN reply content has paragraphs (double newlines), WHEN inserted, THEN paragraphs separated visually
3. GIVEN reply content, WHEN converted to HTML, THEN no script/style tags present
4. GIVEN Vietnamese text with diacritics, WHEN inserted, THEN characters display correctly (UTF-8)

---

#### STORY 3: Success Confirmation

> As a user, I want confirmation that the reply was inserted successfully.

**Requirement Details:**

1. Sau khi gọi `displayReplyAllForm()` thành công, hiển thị toast/message trên Taskpane
2. Message: "Đã chèn nội dung vào Reply All. Kiểm tra và nhấn Send khi sẵn sàng."
3. Message tự hide sau 5 giây hoặc user dismiss
4. Reset state: buttons trở về trạng thái ban đầu, sẵn sàng cho lần tiếp theo

**Acceptance Criteria:**

1. GIVEN displayReplyAllForm() called successfully, WHEN completed, THEN success message shown on Taskpane
2. GIVEN success message displayed, WHEN 5 seconds pass, THEN message auto-hides
3. GIVEN insertion complete, WHEN Taskpane state resets, THEN user can select new email and repeat flow

**UI Specifications:**

| No. | Name | Type | Required | Description | Note |
|-----|------|------|----------|-------------|------|
| 1 | Success Toast | Notification bar | Yes | Green background, success icon | Auto-hide 5s |
| 2 | Error Toast | Notification bar | Yes | Red background, error icon | Has dismiss button |
| 3 | Copy Fallback Button | Button | No | "Copy nội dung" | Fallback nếu insert fail |

---

#### STORY 4: Insert Edited Content

> As a user, I want to be able to insert reply even if I edited the preview text.

**Requirement Details:**

1. Nếu preview area là editable textarea, user có thể modify content trước khi insert
2. Khi click "Chèn vào Reply All", lấy current content từ preview (có thể đã edit)
3. Không phải lấy original AI suggestion — lấy giá trị hiện tại của preview

**Acceptance Criteria:**

1. GIVEN preview is editable, WHEN user modifies text, THEN changes preserved
2. GIVEN user edited preview, WHEN clicks Insert, THEN edited version is inserted (not original)
3. GIVEN user edited preview then switches to different option, WHEN switched, THEN edits lost (replaced by new option content)

---

## 3. Dependencies

| Dependency | Type | Related Ticket | Description |
|------------|------|----------------|-------------|
| OEHA-4 (Suggest Reply) | Feature | OEHA-4 | Provides selected reply content |
| Office.js displayReplyAllForm | API | N/A | Core API method for inserting reply |
| Manifest permission | Configuration | N/A | Must have ReadItem permission minimum |
| Outlook Desktop/Web | Infrastructure | N/A | Must support displayReplyAllForm API |

---

## 4. Stakeholders

| Role | Name / Team | Responsibility | Source |
|------|-------------|----------------|--------|
| Product Owner | Project Owner | Approve UX flow | Jira reporter |
| Developer | Dev Team | Implement Office.js integration | Jira assignee |
| End User | Office workers | Use one-click reply insertion | Target audience |

---

## 5. Risks and Assumptions

### 5.1 Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| displayReplyAllForm() behavior khác nhau Desktop vs Web | Medium | High | Test both, document differences |
| Outlook Mobile không support displayReplyAllForm | Medium | High | Desktop/Web only, show fallback message on Mobile |
| HTML injection nếu AI generate script tags | High | Low | Sanitize HTML, strip script/style tags |
| Form mở nhưng user không nhận ra (popup blocked) | Low | Low | Show instructions + confirmation |

### 5.2 Assumptions

- `displayReplyAllForm()` available trên Outlook Desktop (Windows/Mac) và Outlook Web
- API chỉ cần ReadItem permission (không cần ReadWriteMailbox)
- Content inserted sẽ appear ở đầu reply body (trước quoted original)
- Outlook tự handle Reply All recipients (To + CC from original)

---

## 6. Non-Functional Requirements

| Category | Requirement | Details |
|----------|-------------|---------|
| Performance | Form mở < 1 giây | displayReplyAllForm gần như instant |
| Compatibility | Outlook Desktop (Win/Mac) + Outlook Web | Minimum platforms |
| Security | No script injection | Strip all script/style/event handler from HTML |
| UX | One-click flow | Minimal friction từ select -> insert |
| Accessibility | Keyboard accessible | Tab focus to Insert button, Enter to activate |

---

## 7. Related Tickets

| Ticket Key | Summary | Status | Type | Relationship |
|------------|---------|--------|------|--------------|
| OEHA-1 | Outlook Email Helper Agent - AI Mail Assistant | To Do | Epic | Parent epic |
| OEHA-2 | Read Email Content | To Do | Story | Foundation |
| OEHA-3 | Summarize Mail Loop | To Do | Story | Related |
| OEHA-4 | Suggest Reply Options | To Do | Story | Direct prerequisite (provides content) |
| OEHA-5 | Auto-Insert Reply | To Do | Story | Main ticket |

---

## 8. Appendix

### Glossary

| Term | Definition |
|------|------------|
| displayReplyAllForm | Office.js method mở Reply All compose với pre-filled content |
| Reply All | Trả lời tất cả người nhận của email gốc |
| HTML Body | Nội dung email dạng HTML (rich text) |
| Toast | Thông báo ngắn hiển thị tạm thời rồi tự ẩn |

### Key Office.js API

```typescript
// Core method for this story:
Office.context.mailbox.item.displayReplyAllForm({
  htmlBody: "<p>Nội dung reply đã format</p>"
});

// Alternative: displayReplyForm (single reply, not Reply All)
Office.context.mailbox.item.displayReplyForm({
  htmlBody: "<p>...</p>"
});
```

### HTML Conversion Utility (Reference)

```typescript
function textToHtml(text: string): string {
  // Sanitize: remove any existing HTML/script tags
  const sanitized = text.replace(/<[^>]*>/g, '');
  
  // Convert double newlines to paragraph breaks
  const paragraphs = sanitized.split('\n\n');
  
  // Convert single newlines within paragraphs to <br>
  const html = paragraphs
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
  
  return html;
}
```

### Technical References

| Document | Link / Location |
|----------|-----------------|
| Office.js displayReplyAllForm | https://learn.microsoft.com/en-us/javascript/api/outlook/office.messageread |
| Phase 1 - Initialize | documents/Phase 1 - Initialize.md |
| OEHA-4 BRD (upstream) | documents/BRD-OEHA-4.md |
