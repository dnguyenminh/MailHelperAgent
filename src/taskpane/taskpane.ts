/**
 * Outlook Email Helper Agent — Main Entry Point
 * Implements: OEHA-2, OEHA-3, OEHA-4, OEHA-5
 */

/* global document, Office */

import { EmailService } from "./services/email-service";
import { ApiClient } from "./services/api-client";
import { InsertService } from "./services/insert-service";
import { appState } from "./state/app-state";
import { UIRenderer } from "./ui/renderer";
import { ReplyOption } from "./types";

let emailService: EmailService;
let apiClient: ApiClient;
let insertService: InsertService;
let renderer: UIRenderer;

// Reply state
let replyOptions: ReplyOption[] = [];
let selectedReplyIndex: number | null = null;
let regenerateCount = 0;
const MAX_REGENERATE = 3;

// OEHA-11: Guard flag to prevent duplicate event handler binding
let actionButtonsBound = false;

// OEHA-13: Debounce helper to prevent rapid duplicate API calls
function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delayMs: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: unknown[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  }) as unknown as T;
}

// OEHA-13: Debounced version of onAnalyzeClick (500ms)
const debouncedAnalyze = debounce(() => onAnalyzeClick(), 500);

Office.onReady((info) => {
  if (info.host === Office.HostType.Outlook) {
    initialize();
  } else {
    appState.update({ error: "OFFICE_INIT_FAILED" });
  }
});

function initialize(): void {
  emailService = new EmailService();
  apiClient = new ApiClient();
  insertService = new InsertService();
  renderer = new UIRenderer("app-body");

  // Subscribe renderer to state changes
  appState.subscribe((state) => {
    renderer.render(state);
    // OEHA-11: Reset bound flag when DOM re-renders, then rebind once
    actionButtonsBound = false;
    bindActionButtons();
  });

  // Show app body, hide sideload message
  const sideloadEl = document.getElementById("sideload-msg");
  const appBodyEl = document.getElementById("app-body");
  if (sideloadEl) sideloadEl.style.display = "none";
  if (appBodyEl) appBodyEl.style.display = "flex";

  // Auto-load email on init
  loadEmail();
}

async function loadEmail(): Promise<void> {
  appState.update({ isLoading: true, error: null });

  try {
    const emailData = await emailService.readEmail();
    appState.update({ isLoading: false, isReady: true, emailData, error: null });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    appState.update({ isLoading: false, error: errorMsg });
  }
}

function bindActionButtons(): void {
  // OEHA-11: Only bind once per render cycle to prevent duplicate handlers
  if (actionButtonsBound) return;
  actionButtonsBound = true;

  // Retry button
  const retryBtn = document.getElementById("btn-retry");
  if (retryBtn) {
    retryBtn.onclick = () => loadEmail();
  }

  // Summarize button (OEHA-3) — OEHA-13: debounced to prevent double-click spam
  const summarizeBtn = document.getElementById("btn-summarize");
  if (summarizeBtn) {
    summarizeBtn.onclick = () => debouncedAnalyze();
  }

  // Suggest reply button (OEHA-4) — OEHA-13: debounced
  const suggestBtn = document.getElementById("btn-suggest");
  if (suggestBtn) {
    suggestBtn.onclick = () => debouncedAnalyze();
  }
}

/** OEHA-3 + OEHA-4: Call backend for summary + replies */
async function onAnalyzeClick(): Promise<void> {
  const emailData = appState.getEmailData();
  if (!emailData) return;

  const summarySection = document.getElementById("summary-section");
  const replySection = document.getElementById("reply-section");

  // Show loading
  if (summarySection) {
    summarySection.innerHTML = `
      <div class="loading-container">
        <div class="spinner"></div>
        <p class="loading-text">Đang phân tích email...</p>
      </div>
    `;
  }

  try {
    const result = await apiClient.analyzeEmail(emailData.subject, emailData.bodyText);

    // Render summary (OEHA-3)
    if (summarySection && result.summary && result.summary.length > 0) {
      const bullets = result.summary.map((s) => `<li>${escapeHtml(s)}</li>`).join("");
      summarySection.innerHTML = `
        <div class="summary-container">
          <h3 class="summary-header">📋 Tóm tắt</h3>
          <ol class="summary-list">${bullets}</ol>
          ${result.processingTime ? `<small style="color:#605e5c">⏱ ${result.processingTime}ms • ${result.model || ""}</small>` : ""}
        </div>
      `;
    }

    // Render reply options (OEHA-4)
    if (replySection && result.suggestedReplies && result.suggestedReplies.length > 0) {
      replyOptions = result.suggestedReplies;
      selectedReplyIndex = null;
      renderReplySection(replySection);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định";
    if (summarySection) {
      summarySection.innerHTML = `
        <div class="error-container" role="alert" aria-live="assertive">
          <p class="error-text">${getAIErrorMessage(message)}</p>
          <button id="btn-retry-ai" class="btn btn-secondary" aria-label="Thử phân tích lại">Thử lại</button>
        </div>
      `;
      const retryAI = document.getElementById("btn-retry-ai");
      if (retryAI) retryAI.onclick = () => onAnalyzeClick();
    }
  }
}

/** OEHA-4: Render reply buttons + preview */
function renderReplySection(container: HTMLElement): void {
  const buttons = replyOptions
    .map((opt, i) => {
      const active = i === selectedReplyIndex ? "active" : "";
      return `<button class="reply-option-btn ${active}" data-index="${i}">${escapeHtml(opt.label)}</button>`;
    })
    .join("");

  const previewHtml =
    selectedReplyIndex !== null
      ? `<textarea class="reply-preview" id="reply-preview-text">${escapeHtml(replyOptions[selectedReplyIndex].content)}</textarea>`
      : "";

  const insertBtnDisabled = selectedReplyIndex === null ? "disabled" : "";
  const regenDisabled = regenerateCount >= MAX_REGENERATE ? "disabled" : "";
  const regenLabel =
    regenerateCount >= MAX_REGENERATE
      ? "Đã hết lượt tạo lại"
      : `🔄 Tạo gợi ý khác (còn ${MAX_REGENERATE - regenerateCount} lượt)`;

  container.innerHTML = `
    <div class="summary-container">
      <h3 class="summary-header">💬 Gợi ý trả lời</h3>
      <div class="reply-btn-group">${buttons}</div>
      ${previewHtml}
      <div class="action-buttons" style="margin-top:12px">
        <button id="btn-insert-reply" class="btn btn-primary" ${insertBtnDisabled}>Chèn vào Reply All</button>
        <button id="btn-regenerate" class="btn btn-secondary" ${regenDisabled}>${regenLabel}</button>
      </div>
    </div>
  `;

  // Bind option buttons
  const optBtns = container.querySelectorAll(".reply-option-btn");
  optBtns.forEach((btn) => {
    (btn as HTMLElement).onclick = () => {
      selectedReplyIndex = parseInt((btn as HTMLElement).dataset.index, 10);
      renderReplySection(container);
    };
  });

  // Bind insert button (OEHA-5)
  const insertBtn = document.getElementById("btn-insert-reply");
  if (insertBtn) {
    insertBtn.onclick = () => {
      if (selectedReplyIndex === null) return;
      // Use current textarea value (may have been edited)
      const textarea = document.getElementById("reply-preview-text") as HTMLTextAreaElement;
      const content = textarea ? textarea.value : replyOptions[selectedReplyIndex].content;
      insertService.insertReply(content);
    };
  }

  // Bind regenerate button
  const regenBtn = document.getElementById("btn-regenerate");
  if (regenBtn) {
    regenBtn.onclick = () => {
      if (regenerateCount < MAX_REGENERATE) {
        regenerateCount++;
        onAnalyzeClick();
      }
    };
  }
}

function getAIErrorMessage(error: string): string {
  if (error === "TIMEOUT") return "Phân tích quá lâu. Email có thể quá dài. Vui lòng thử lại.";
  if (error.includes("unavailable")) return "Model AI chưa sẵn sàng. Kiểm tra Ollama đang chạy.";
  if (error.includes("Failed to fetch") || error.includes("NetworkError"))
    return "Không thể kết nối server AI. Kiểm tra backend đang chạy (port 8000).";
  return error;
}

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
