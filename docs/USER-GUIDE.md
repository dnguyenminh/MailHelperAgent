# 📧 Hướng dẫn sử dụng — Email Helper Agent

## Mục lục

1. [Cài đặt](#1-cài-đặt)
2. [Cấu hình AI Mode](#2-cấu-hình-ai-mode)
3. [Sử dụng Add-in trong Outlook](#3-sử-dụng-add-in-trong-outlook)
4. [Khắc phục sự cố](#4-khắc-phục-sự-cố)

---

## 1. Cài đặt

### 1.1 Yêu cầu hệ thống

| Thành phần | Yêu cầu |
|-----------|----------|
| OS | Windows 10+, macOS 12+ |
| RAM | Tối thiểu 4GB free (embedded) hoặc 8GB (ollama) |
| Node.js | v18+ |
| Outlook | Desktop (Windows/Mac) hoặc Outlook Web (OWA) |
| Python | 3.11+ (nếu dùng backend Python) |

### 1.2 Cài đặt Frontend

```bash
git clone https://github.com/dnguyenminh/MailHelperAgent.git
cd MailHelperAgent
npm install
```

### 1.3 Cài đặt Backend (chọn 1 trong 3)

#### Python (khuyên dùng)
```bash
cd backend
pip install -r requirements.txt
```

#### Node.js
```bash
cd backend-nodejs
npm install
```

#### Java
```bash
cd backend-java
mvn compile
```

---

## 2. Cấu hình AI Mode

Add-in hỗ trợ 2 chế độ AI. Chọn mode phù hợp với máy của bạn:

### Mode A: Ollama API (chất lượng cao)

**Khi nào dùng:** Máy có GPU hoặc RAM >= 8GB, cần chất lượng summary/reply tốt nhất.

```bash
# 1. Cài Ollama (https://ollama.ai)
# 2. Pull model
ollama pull qwen2.5:7b-instruct-q4_K_M

# 3. Chạy Ollama server
ollama serve

# 4. Chạy backend (default mode = ollama)
cd backend
python run.py
```

### Mode B: Embedded GGUF (không cần Ollama)

**Khi nào dùng:** Máy không có GPU, muốn đơn giản (không cần cài thêm Ollama), chấp nhận chất lượng thấp hơn.

```bash
# 1. Download model (~1.9 GB)
cd models
huggingface-cli download Qwen/Qwen2.5-3B-Instruct-GGUF qwen2.5-3b-instruct-q4_k_m.gguf --local-dir .
cd ..

# 2. Cài thêm llama-cpp-python
cd backend
pip install llama-cpp-python

# 3. Chạy backend ở embedded mode (Windows CMD)
set AI_MODE=embedded
python run.py
```

### Cấu hình qua file .env

Copy `backend/.env.example` → `backend/.env` và chỉnh:

```env
# Chọn mode
AI_MODE=ollama          # hoặc "embedded"

# Ollama settings
OLLAMA_MODEL=qwen2.5:7b-instruct-q4_K_M
OLLAMA_HOST=http://localhost:11434

# Embedded settings
# MODEL_PATH=../models/qwen2.5-3b-instruct-q4_k_m.gguf
```

---

## 3. Sử dụng Add-in trong Outlook

### 3.1 Khởi động

1. **Chạy backend** (Terminal 1):
   ```bash
   cd backend && python run.py
   ```

2. **Chạy frontend** (Terminal 2):
   ```bash
   npm run dev-server
   ```

3. **Sideload vào Outlook:**
   - Outlook Desktop: `npm start` (tự động sideload)
   - Outlook Web: Settings → Manage Add-ins → Custom Add-ins → Add from file → chọn `manifest.json`

### 3.2 Đọc Email (tự động)

Khi bạn mở Taskpane (click icon add-in trên ribbon), add-in sẽ:
- Tự động đọc email đang được chọn
- Hiển thị: Tiêu đề, Người gửi, Người nhận, Ngày, Độ dài

### 3.3 Tóm tắt Email

1. Click nút **📋 Tóm tắt**
2. Chờ 5-10 giây (AI đang phân tích)
3. Kết quả hiển thị dạng bullet points

### 3.4 Gợi ý trả lời

1. Click nút **💬 Gợi ý trả lời** (hoặc sẽ hiển thị cùng lúc với tóm tắt)
2. Xem 2-3 phương án trả lời với tone khác nhau
3. Click vào phương án muốn xem → preview hiển thị nội dung đầy đủ
4. Chỉnh sửa nội dung trong preview nếu cần
5. Click **Chèn vào Reply All** → Outlook mở form Reply All với nội dung đã điền

### 3.5 Tạo lại gợi ý

- Nếu không hài lòng, click **🔄 Tạo gợi ý khác**
- Tối đa 3 lần tạo lại mỗi email

---

## 4. Khắc phục sự cố

### "Không thể kết nối server AI"

**Nguyên nhân:** Backend chưa chạy hoặc port 8000 bị chiếm.

**Fix:**
```bash
# Kiểm tra backend đang chạy
curl http://localhost:8000/health

# Nếu chưa chạy
cd backend && python run.py
```

### "Model AI chưa sẵn sàng"

**Nguyên nhân (Ollama mode):** Ollama server chưa chạy hoặc model chưa pull.

**Fix:**
```bash
ollama serve
ollama pull qwen2.5:7b-instruct-q4_K_M
```

### "Model not found" (Embedded mode)

**Nguyên nhân:** File GGUF chưa download vào thư mục `models/`.

**Fix:**
```bash
cd models
huggingface-cli download Qwen/Qwen2.5-3B-Instruct-GGUF qwen2.5-3b-instruct-q4_k_m.gguf --local-dir .
```

### "Phân tích quá lâu"

**Nguyên nhân:** Email quá dài hoặc máy chậm.

**Fix:**
- Thử lại (click "Thử lại")
- Nếu dùng embedded mode trên máy yếu: chờ 15-30 giây là bình thường
- Nếu quá chậm: chuyển sang Ollama mode với GPU

### "Vui lòng chọn một email"

**Nguyên nhân:** Chưa click vào email nào trong Outlook.

**Fix:** Click chọn 1 email trong inbox trước khi dùng add-in.

### Taskpane không hiển thị

**Fix:**
- Outlook Desktop: Home ribbon → Show Task Pane
- Outlook Web: Kiểm tra add-in đã được sideload

---

## Thông tin liên hệ

- **Repository:** https://github.com/dnguyenminh/MailHelperAgent
- **Issues:** https://github.com/dnguyenminh/MailHelperAgent/issues
