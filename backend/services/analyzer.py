"""
OEHA-3/4: Email analyzer — Embedded GGUF model via llama-cpp-python
No Ollama dependency. Model runs in-process.
"""

import json
import os
from pathlib import Path
from llama_cpp import Llama
from .preprocessor import TextPreprocessor


# Model path — relative to project root
MODEL_PATH = os.getenv(
    "MODEL_PATH",
    str(Path(__file__).parent.parent.parent / "models" / "qwen2.5-3b-instruct-q4_k_m.gguf")
)

# Lazy-loaded model singleton
_llm_instance = None


def get_llm() -> Llama:
    """Lazy-load the LLM model (takes a few seconds on first call)."""
    global _llm_instance
    if _llm_instance is None:
        if not Path(MODEL_PATH).exists():
            raise FileNotFoundError(
                f"Model not found at: {MODEL_PATH}\n"
                "Download: huggingface-cli download Qwen/Qwen2.5-3B-Instruct-GGUF "
                "qwen2.5-3b-instruct-q4_k_m.gguf --local-dir models/"
            )
        _llm_instance = Llama(
            model_path=MODEL_PATH,
            n_ctx=4096,       # Context window
            n_threads=4,      # CPU threads (adjust to your machine)
            n_gpu_layers=0,   # 0 = CPU only
            verbose=False,
        )
    return _llm_instance


class EmailAnalyzer:
    """Analyze email content using embedded GGUF model."""

    def __init__(self):
        self.preprocessor = TextPreprocessor()

    def analyze(self, subject: str, body: str) -> dict:
        """Generate summary + suggested replies for an email."""
        # Pre-process body
        cleaned_body = self.preprocessor.clean(body, max_length=4000)  # Smaller for 3B model

        # Build prompt
        prompt = self._build_prompt(subject, cleaned_body)

        # Get model
        llm = get_llm()

        # Generate
        response = llm.create_chat_completion(
            messages=[
                {"role": "system", "content": "You are a professional email assistant. Always respond in valid JSON."},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=1500,
        )

        raw_content = response["choices"][0]["message"]["content"]
        result = self._parse_response(raw_content)
        return result

    def _build_prompt(self, subject: str, body: str) -> str:
        return f"""Phân tích chuỗi email và trả về JSON:

1. TÓM TẮT: 3-5 bullet points bằng Tiếng Việt, giữ tên riêng/số liệu.
2. GỢI Ý TRẢ LỜI: 2-3 phương án reply (label + content + tone).

Tiêu đề: {subject}
Nội dung:
{body}

JSON format:
{{"summary": ["..."], "suggestedReplies": [{{"label": "...", "content": "...", "tone": "positive|negative|neutral"}}]}}"""

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
