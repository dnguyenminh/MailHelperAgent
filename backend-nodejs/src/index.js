/**
 * Email Helper Agent Backend — Node.js + Embedded GGUF (node-llama-cpp)
 * No Ollama dependency. Model runs in-process.
 */

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { getLlama, LlamaChatSession } from "node-llama-cpp";
import { preprocessBody } from "./preprocessor.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8000;
const MODEL_PATH = process.env.MODEL_PATH || path.resolve(__dirname, "../../models/qwen2.5-3b-instruct-q4_k_m.gguf");

// Middleware
app.use(cors({ origin: ["https://localhost:3000", "http://localhost:3000"] }));
app.use(express.json({ limit: "1mb" }));

// Lazy-loaded model
let model = null;
let llama = null;

async function getModel() {
  if (!model) {
    console.log("Loading model from:", MODEL_PATH);
    llama = await getLlama();
    model = await llama.loadModel({ modelPath: MODEL_PATH });
    console.log("Model loaded successfully.");
  }
  return model;
}

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", model: "qwen2.5-3b-instruct (embedded GGUF)" });
});

// Main endpoint
app.post("/api/analyze-email", async (req, res) => {
  const { subject, body } = req.body;

  if (!body || !body.trim()) {
    return res.status(400).json({ error: "Email body is empty" });
  }

  const startTime = Date.now();

  try {
    const loadedModel = await getModel();
    const context = await loadedModel.createContext();
    const session = new LlamaChatSession({ contextSequence: context.getSequence() });

    // Preprocess
    const cleanedBody = preprocessBody(body, 4000);

    // Build prompt
    const prompt = buildPrompt(subject || "", cleanedBody);

    // Generate
    const response = await session.prompt(prompt, {
      maxTokens: 1500,
      temperature: 0.3,
      responseFormat: { type: "json_object" },
    });

    // Parse
    const result = parseResponse(response);
    const processingTime = Date.now() - startTime;

    await context.dispose();

    res.json({
      summary: result.summary || [],
      suggestedReplies: result.suggestedReplies || [],
      processingTime,
      model: "qwen2.5-3b-instruct (embedded)",
    });
  } catch (err) {
    const message = err.message || "Unknown error";
    if (message.includes("ENOENT") || message.includes("not found")) {
      return res.status(500).json({
        error: "Model file not found",
        detail: `Expected at: ${MODEL_PATH}. Download from HuggingFace.`,
      });
    }
    res.status(500).json({ error: "AI processing error", detail: message });
  }
});

function buildPrompt(subject, body) {
  return `Phân tích chuỗi email và trả về JSON:

1. TÓM TẮT: 3-5 bullet points bằng Tiếng Việt, giữ tên riêng/số liệu.
2. GỢI Ý TRẢ LỜI: 2-3 phương án reply (label + content + tone).

Tiêu đề: ${subject}
Nội dung:
${body}

JSON format:
{"summary": ["..."], "suggestedReplies": [{"label": "...", "content": "...", "tone": "positive|negative|neutral"}]}`;
}

function parseResponse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}") + 1;
    if (start >= 0 && end > start) {
      try { return JSON.parse(raw.substring(start, end)); } catch {}
    }
    return { summary: ["Không thể phân tích email"], suggestedReplies: [] };
  }
}

app.listen(PORT, () => {
  console.log(`Email Helper Backend (Node.js embedded) on port ${PORT}`);
  console.log(`Model path: ${MODEL_PATH}`);
});
