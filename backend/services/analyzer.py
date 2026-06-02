"""
OEHA-3/4: Email analyzer — Supports 2 modes:
- AI_MODE=ollama  → Call Ollama API (requires ollama serve running)
- AI_MODE=embedded → Embedded GGUF model via llama-cpp-python (no Ollama needed)
"""

import json
import os
from pathlib import Path
from .preprocessor import TextPreprocessor


AI_MODE = os.getenv("AI_MODE", "ollama")  # "ollama" or "embedded"
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b-instruct-q4_K_M")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
MODEL_PATH = os.getenv(
    "MODEL_PATH",
    str(Path(__file__).parent.parent.parent / "models" / "qwen2.5-3b-instruct-q4_k_m.gguf")
)

# Lazy-loaded embedded model
_llm_instance = None


def _get_embedded_llm():
    """Lazy-load embedded GGUF model."""
    global _llm_instance
    if _llm_instance is None:
        from llama_cpp import Llama
        if not Path(MODEL_PATH).exists():
            raise FileNotFoundError(
                f"Model not found at: {MODEL_PATH}\n"
                "Download: huggingface-cli download Qwen/Qwen2.5-3B-Instruct-GGUF "
                "qwen2.5-3b-instruct-q4_k_m.gguf --local-dir models/"
            )
        _llm_instance = Llama(
            model_path=MODEL_PATH,
            n_ctx=4096,
            n_threads=4,
            n_gpu_layers=0,
            verbose=False,
        )
    return _llm_instance


def _call_ollama(prompt: str) -> str:
    """Call Ollama API."""
    import ollama
    response = ollama.generate(
        model=OLLAMA_MODEL,
        prompt=prompt,
        format="json",
        options={"temperature": 0.3, "num_predict": 2048},
    )
    return response["response"]


def _call_embedded(prompt: str) -> str:
    """Call embedded GGUF model."""
    llm = _get_embedded_llm()
    response = llm.create_chat_completion(
        messages=[
            {"role": "system", "content": "You are a professional email assistant. Always respond in valid JSON."},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.3,
        max_tokens=1500,
    )
    return response["choices"][0]["message"]["content"]


class EmailAnalyzer:
    """Analyze email content using either Ollama API or embedded GGUF model."""

    def __init__(self):
        self.preprocessor = TextPreprocessor()
        self.mode = AI_MODE

    def get_mode_info(self) -> dict:
        """Return current mode and model info."""
        if self.mode == "embedded":
            return {"mode": "embedded", "model": Path(MODEL_PATH).name, "model_path": MODEL_PATH}
        else:
            return {"mode": "ollama", "model": OLLAMA_MODEL, "host": OLLAMA_HOST}

    def analyze(self, subject: str, body: str) -> dict:
        """Generate summary + suggested replies for an email."""
        max_body = 4000 if self.mode == "embedded" else 8000
        cleaned_body = self.preprocessor.clean(body, max_length=max_body)

        prompt = self._build_prompt(subject, cleaned_body)

        # Call appropriate backend
        if self.mode == "embedded":
            raw_response = _call_embedded(prompt)
        else:
            raw_response = _call_ollama(prompt)

        return self._parse_response(raw_response)

    def _build_prompt(self, subject: str, body: str) -> str:
        return f"""Bạn là một trợ lý email thông minh chuyên nghiệp.
Hãy phân tích chuỗi email dưới đây và thực hiện 2 nhiệm vụ:

1. TÓM TẮT: Tóm tắt các ý chính thành 3-7 bullet points ngắn gọn bằng Tiếng Việt.
   - Giữ nguyên tên riêng, số liệu, ngày tháng
   - Mỗi bullet tối đa 100 ký tự

2. GỢI Ý TRẢ LỜI: Đề xuất 2-3 phương án trả lời email với tone khác nhau:
   - Mỗi phương án có label ngắn mô tả (vd: "Đồng ý", "Từ chối", "Hỏi thêm")
   - Nội dung reply phải professional, lịch sự, có greeting và closing
   - Reply cùng ngôn ngữ với email gốc

Tiêu đề: {subject}
Nội dung chuỗi email:
{body}

Trả về JSON có cấu trúc chính xác sau:
{{"summary": ["Ý chính 1", "Ý chính 2", "..."], "suggestedReplies": [{{"label": "Mô tả ngắn", "content": "Nội dung email trả lời đầy đủ", "tone": "positive hoặc negative hoặc neutral"}}]}}"""

    def _parse_response(self, raw_response: str) -> dict:
        """Parse and validate JSON response."""
        try:
            data = json.loads(raw_response)
        except json.JSONDecodeError:
            start = raw_response.find("{")
            end = raw_response.rfind("}") + 1
            if start >= 0 and end > start:
                try:
                    data = json.loads(raw_response[start:end])
                except json.JSONDecodeError:
                    return {"summary": ["Không thể phân tích email"], "suggestedReplies": []}
            else:
                return {"summary": ["Không thể phân tích email"], "suggestedReplies": []}

        if "summary" not in data:
            data["summary"] = ["Không có tóm tắt"]
        if "suggestedReplies" not in data:
            data["suggestedReplies"] = []
        if not isinstance(data["summary"], list):
            data["summary"] = [str(data["summary"])]

        return data
