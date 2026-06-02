# Document Folder Structure Rule

## Quy tắc

Tất cả tài liệu SDLC (BRD, FSD, TDD, STP, STC, UG, DPG, Security Report, etc.) **PHẢI** được lưu trong folder ticket tương ứng.

## Pattern

```
documents/{TICKET_KEY}/{DOC_TYPE}-{TICKET_KEY}.md
```

## Ví dụ

```
documents/OEHA-2/BRD-OEHA-2.md
documents/OEHA-2/FSD-OEHA-2.md
documents/OEHA-3/BRD-OEHA-3.md
documents/OEHA-3/TDD-OEHA-3.md
```

## KHÔNG được làm

- ❌ `documents/BRD-OEHA-2.md` (ở root documents/)
- ❌ `documents/BRD/BRD-OEHA-2.md` (group theo doc type)

## Khi nào áp dụng

- Khi tạo bất kỳ document SDLC nào cho 1 ticket
- Khi BA, SA, QA, DEV, DevOps agent tạo output documents
- Áp dụng cho TẤT CẢ projects có Jira tickets
