/**
 * Email Helper Agent Backend — Node.js
 * Supports 2 modes via AI_MODE env:
 *   - "ollama" (default) → Call Ollama API
 *   - "embedded" → Embedded GGUF via node-llama-cpp
 */

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { preprocessBody } from "./preprocessor.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8000;
const AI_MODE = process.env.AI_MODE || "ollama";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:7b-instruct-q4_K_M";
const MODEL_PATH = process.env.MODEL_PATH || path.resolve(__dirname, "../../models/qwen2.5-3b-instruct-q4_k_m.gguf");

// Middleware
app.use(cors({ origin: ["https://localhost:3000", "http://localhost:3000"] }));
app.use(express.json({ limit: "1mb" }));

// Lazy-loaded instances
let ollamaClient = null;
let llamaModel = null;

async function callOllama(prompt) {
  if (!ollamaClient) {
    const { Ollama } = await import("ollama");
    ollamaClient = new Ollama({ host: process.env.OLLAMA_HOST || "http://localhost:11434" });
  }
  const response = await ollamaClient.generate({
    model: OLLAMA_MODEL,
    prompt,
    format: "json",
    options: { temperature: 0.3, num_predict: 2048 },
  });
  return response.response;
}

async function callEmbedded(prompt) {
  const { getLlama, LlamaChatSession } = await import("node-llama-cpp");
  if (!llamaModel) {
    const llama = await getLlama();
    llamaModel = await llama.loadModel({ modelPath: MODEL_PATH });
  }
  const context = await llamaModel.createContext();
  const session = new LlamaChatSession({ contextSequence: context.getSequence() });
  const response = await session.prompt(prompt, {
    maxTokens: 1500,
    temperature: 0.3,
  });
  await context.dispose();
  return response;
}

// Health check
app.get("/health", (req, res) => {
  const info = AI_MODE === "embedded"
    ? { status: "ok", mode: "embedded", model: path.basename(MODEL_PATH) }
    : { status: "ok", mode: "ollama", model: OLLAMA_MODEL };
  res.json(info);
});

// Main endpoint
app.post("/api/analyze-email", async (req, res) => {
  const { subject, body } = req.body;
  if (!body || !body.trim()) {
    return res.status(400).json({ error: "Email body is empty" });
  }

  const startTime = Date.now();
  const maxBody = AI_MODE === "embedded" ? 4000 : 8000;

  try {
    const cleanedBody = preprocessBody(body, maxBody);
    const prompt = buildPrompt(subject || "", cleanedBody);

    const rawResponse = AI_MODE === "embedded"
      ? await callEmbedded(prompt)
      : await callOllama(prompt);

    const result = parseResponse(rawResponse);
    const processingTime = Date.now() - startTime;
    const modelName = AI_MODE === "embedded" ? path.basename(MODEL_PATH) : OLLAMA_MODEL;

    res.json({
      summary: result.summary || [],
      suggestedReplies: result.suggestedReplies || [],
      processingTime,
      model: `${modelName} (${AI_MODE})`,
    });
  } catch (err) {
    const message = err.message || "Unknown error";
    if (message.includes("ECONNREFUSED") || message.includes("connect")) {
      return res.status(500).json({ error: "AI model unavailable", detail: "Kiểm tra Ollama đang chạy." });
    }
    if (message.includes("ENOENT") || message.includes("not found")) {
      return res.status(500).json({ error: "Model file not found", detail: `Expected at: ${MODEL_PATH}` });
    }
    res.status(500).json({ error: "AI processing error", detail: message });
  }
});

function buildPrompt(subject, body) {
  return `Bạn là một trợ lý email thông minh chuyên nghiệp.
Hãy phân tích chuỗi email dưới đây và thực hiện 2 nhiệm vụ:

1. TÓM TẮT: Tóm tắt các ý chính thành 3-7 bullet points ngắn gọn bằng Tiếng Việt.
2. GỢI Ý TRẢ LỜI: Đề xuất 2-3 phương án trả lời email với tone khác nhau.

Tiêu đề: ${subject}
Nội dung: ${body}

Trả về JSON: {"summary": ["..."], "suggestedReplies": [{"label": "...", "content": "...", "tone": "positive|negative|neutral"}]}`;
}

function parseResponse(raw) {
  try { return JSON.parse(raw); } catch {}
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}") + 1;
  if (start >= 0 && end > start) {
    try { return JSON.parse(raw.substring(start, end)); } catch {}
  }
  return { summary: ["Không thể phân tích email"], suggestedReplies: [] };
}

app.listen(PORT, () => {
  console.log(`Email Helper Backend (Node.js) on port ${PORT}`);
  console.log(`Mode: ${AI_MODE} | Model: ${AI_MODE === "embedded" ? MODEL_PATH : OLLAMA_MODEL}`);
});
