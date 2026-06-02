Để tạo một plugin (Add-in) cho ứng dụng Outlook với các tính năng đọc mail mới, tóm tắt chuỗi hội thoại (mail loop/thread) và gợi ý mail trả lời bằng AI, bạn có hai hướng tiếp cận chính:

1. **Modern Office Add-ins (Khuyên dùng):** Sử dụng HTML, JavaScript/TypeScript và Office.js. Chạy được trên mọi nền tảng (Outlook Desktop, Web, Mac, Mobile).
2. **VSTO (Visual Studio Tools for Office) Add-ins:** Sử dụng C#/.NET Framework. Chỉ chạy được trên Outlook Desktop chạy Windows (Công nghệ cũ, Microsoft không còn ưu tiên phát triển).

Dưới đây là hướng dẫn chi tiết theo hướng **Modern Office Add-ins** kết hợp với một Backend xử lý AI (LLM).

---

## 1. Kiến trúc tổng quan của Hệ thống

Để xử lý AI (Summary & Suggestion), bạn cần một mô hình client-server:

* **Frontend (Outlook Add-in):** Giao diện hiển thị (Taskpane) dạng HTML/CSS/JS nằm bên phải màn hình Outlook. Sử dụng `Office.js` để đọc nội dung email hiện tại.
* **Backend API (Spring Boot/Python):** Nhận nội dung mail từ Add-in, gửi đến LLM (như OpenAI, Ollama, Qwen, v.v.) để xử lý tóm tắt và tạo văn bản gợi ý, sau đó trả kết quả về Add-in.

---

## 2. Các bước triển khai chi tiết

### Bước 1: Khởi tạo Project Add-in

Sử dụng công cụ chính thức của Microsoft là **Yeoman Generator for Office Add-ins** để scaffold project nhanh chóng.

1. Cài đặt Node.js và Yeoman:
```bash
npm install -g yo generator-office

```


2. Tạo project mới:
```bash
yo office

```


* Chọn loại dự án: `Office Add-in Task Pane project using React` hoặc `Vanilla TypeScript`.
* Chọn ứng dụng: `Outlook`.



Project sẽ tạo ra file quan trọng nhất là `manifest.xml` (định nghĩa quyền truy cập, nút bấm trên Toolbar) và thư mục `/src` chứa mã nguồn giao diện.

### Bước 2: Đọc dữ liệu Email (Mail Loop) từ Outlook

Trong file code giao diện (ví dụ: `taskpane.ts` hoặc `taskpane.tsx`), bạn sử dụng `Office.context.mailbox.item` để lấy thông tin email người dùng đang chọn.

Để tóm tắt chính xác một **mail loop**, bạn cần lấy toàn bộ nội dung body hoặc chuỗi hội thoại:

```typescript
// Kiểm tra nếu Office đã sẵn sàng
Office.onReady((info) => {
  if (info.host === Office.HostType.Outlook) {
    getMailContext();
  }
});

async function getMailContext() {
  const item = Office.context.mailbox.item;

  // 1. Lấy thông tin cơ bản
  const subject = item.subject;
  const from = item.from;

  // 2. Lấy nội dung body (Thường chứa toàn bộ chuỗi mail loop phía dưới nếu là mail Reply)
  item.body.getAsync(Office.CoercionType.Text, (result) => {
    if (result.status === Office.AsyncResultStatus.Succeeded) {
      const mailBody = result.value;
      
      // Gọi Backend API xử lý AI
      processAIContent(subject, mailBody);
    }
  });
}

```

### Bước 3: Xử lý AI tại Backend (Summary & Suggestion)

Gửi `subject` và `mailBody` lên API Backend của bạn. Tại đây, bạn xây dựng Prompt phù hợp để ép cấu trúc dữ liệu trả về (JSON).

**Ví dụ Prompt cho LLM:**

> "Bạn là một trợ lý email thông minh. Hãy phân tích chuỗi email sau đây:
> Subject: {subject}
> Body: {mailBody}
> Hãy trả về định dạng JSON gồm 2 trường:
> 1. 'summary': Tóm tắt ngắn gọn các ý chính của cuộc hội thoại dưới dạng bullet points.
> 2. 'suggestedReplies': Mảng gồm 3 tùy chọn phản hồi nhanh (ví dụ: Đồng ý, Từ chối, Hẹn lịch lại) kèm theo nội dung chi tiết của mail trả lời."
> 
> 

### Bước 4: Hiển thị và Đẩy Gợi ý ngược lại Outlook

Sau khi nhận kết quả JSON từ Backend, hiển thị phần Tóm tắt (Summary) lên giao diện Taskpane.

Đối với các **Suggested Replies**, khi người dùng click vào một nút gợi ý, bạn có thể tự động tạo một bản nháp phản hồi (Reply/Reply All) và chèn nội dung gợi ý vào mail đó bằng Office.js:

```typescript
function insertSuggestedReply(replyText: string) {
  // Tạo một cửa sổ Reply tự động
  Office.context.mailbox.item.displayReplyAllForm({
    htmlBody: `<p>${replyText}</p>`
  });
}

```

---

## 3. Quá trình Debug & Triển khai (Deployment)

### Sideloading (Debug cục bộ)

1. Chạy lệnh `npm start` trong thư mục dự án. Lệnh này sẽ khởi động một web server cục bộ (`localhost:3000`) chứa giao diện Add-in và tự động mở Outlook (Web hoặc Desktop) để cài thử nghiệm file `manifest.xml`.
2. Nếu debug trên Outlook Web (Outlook Web App - OWA): Vào phần cài đặt Add-ins -> Chọn **My Add-ins** -> **Custom Add-ins** -> **Add from file** -> Chọn file `manifest.xml` của bạn.

### Deploy production

* **Hosting:** Bản chất Add-in là một ứng dụng Web tĩnh (HTML/JS). Bạn chỉ cần deploy thư mục `/dist` lên bất kỳ dịch vụ web hosting nào (Azure Web Apps, AWS S3, Cloudflare Pages, v.v.) hỗ trợ **HTTPS** (bắt buộc).
* **Cập nhật Manifest:** Sửa toàn bộ đường dẫn `localhost:3000` trong file `manifest.xml` thành domain production của bạn.
* **Phân phối:** Quản trị viên hệ thống (IT Admin) của doanh nghiệp có thể upload file `manifest.xml` này lên Microsoft 365 Admin Center để triển khai đồng loạt xuống ứng dụng Outlook của tất cả nhân viên trong công ty mà không cần cài đặt thủ công từng máy.

---

## 4. Một số lưu ý quan trọng về bảo mật

* **Giới hạn kích thước mã nguồn:** Đối với các chuỗi mail loop quá dài (vượt quá giới hạn Context Window của LLM hoặc kích thước request body), bạn nên xử lý cắt tỉa (truncate) văn bản hoặc lọc bỏ các chữ ký email thừa trước khi gửi lên AI.
* **Quyền hạn (Permissions):** Trong file `manifest.xml`, hãy đảm bảo bạn cấu hình quyền `<Permissions>ReadWriteItem</Permissions>` hoặc `<Permissions>ReadItem</Permissions>` để add-in có quyền đọc nội dung thư.

Bạn dự định sẽ xây dựng phần Backend xử lý AI bằng ngôn ngữ nào (ví dụ: Java/Spring Boot hay Python) và sẽ sử dụng mô hình LLM chạy Local (Ollama) hay Cloud API (OpenAI/Azure) để tôi có thể hỗ trợ chi tiết hơn phần cấu hình Prompt xử lý chuỗi hội thoại?