/**
 * OEHA-2: UI Renderer — DOM manipulation for email metadata display
 */

import { AppState, EmailData } from "../types";

export class UIRenderer {
  private containerEl: HTMLElement;

  constructor(containerId: string) {
    this.containerEl = document.getElementById(containerId);
  }

  /**
   * Subscribe to state changes and render accordingly
   */
  render(state: AppState): void {
    if (state.isLoading) {
      this.renderLoading();
    } else if (state.error) {
      this.renderError(state.error);
    } else if (state.emailData) {
      this.renderEmailData(state.emailData);
    } else {
      this.renderEmpty();
    }
  }

  private renderLoading(): void {
    this.containerEl.innerHTML = `
      <div class="loading-container">
        <div class="spinner"></div>
        <p class="loading-text">Đang tải email...</p>
      </div>
    `;
  }

  private renderError(error: string): void {
    const message = this.getErrorMessage(error);
    this.containerEl.innerHTML = `
      <div class="error-container" role="alert" aria-live="assertive">
        <i class="ms-Icon ms-Icon--Warning error-icon" aria-hidden="true"></i>
        <p class="error-text">${message}</p>
        <button id="btn-retry" class="btn btn-secondary" aria-label="Thử tải lại email">Thử lại</button>
      </div>
    `;
  }

  private renderEmpty(): void {
    this.containerEl.innerHTML = `
      <div class="empty-container">
        <i class="ms-Icon ms-Icon--Mail ms-font-xxl"></i>
        <p>Vui lòng chọn một email để bắt đầu</p>
      </div>
    `;
  }

  private renderEmailData(data: EmailData): void {
    const dateStr = this.formatDate(data.dateTimeCreated);
    const toStr = this.formatRecipients(data.to);
    const truncatedNote = data.isTruncated
      ? `<span class="truncated-badge">Đã cắt (${data.originalLength} → ${data.bodyLength} ký tự)</span>`
      : "";

    this.containerEl.innerHTML = `
      <div class="email-metadata">
        <h3 class="email-subject">${this.escapeHtml(data.subject)}</h3>
        <div class="email-info">
          <div class="info-row">
            <span class="info-label">Từ:</span>
            <span class="info-value">${this.escapeHtml(data.from.name)} &lt;${this.escapeHtml(data.from.email)}&gt;</span>
          </div>
          <div class="info-row">
            <span class="info-label">Đến:</span>
            <span class="info-value">${toStr}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Ngày:</span>
            <span class="info-value">${dateStr}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Độ dài:</span>
            <span class="info-value">${data.bodyLength} ký tự ${truncatedNote}</span>
          </div>
        </div>
      </div>
      <div class="action-buttons">
        <button id="btn-summarize" class="btn btn-primary" aria-label="Tóm tắt nội dung email">📋 Tóm tắt</button>
        <button id="btn-suggest" class="btn btn-primary" aria-label="Gợi ý trả lời email">💬 Gợi ý trả lời</button>
      </div>
      <div id="summary-section"></div>
      <div id="reply-section"></div>
    `;
  }

  private getErrorMessage(error: string): string {
    switch (error) {
      case "NO_EMAIL_SELECTED":
        return "Vui lòng chọn một email để bắt đầu";
      case "COMPOSE_MODE":
        return "Tính năng này chỉ hoạt động khi đọc email";
      case "OFFICE_INIT_FAILED":
        return "Không thể kết nối Outlook. Vui lòng tải lại add-in.";
      case "BODY_EXTRACTION_FAILED":
        return "Không thể đọc nội dung email. Vui lòng thử lại.";
      case "BODY_TIMEOUT":
        return "Đang tải nội dung email quá lâu. Vui lòng thử lại.";
      default:
        return error || "Đã xảy ra lỗi không xác định.";
    }
  }

  private formatDate(date: Date): string {
    if (!date) return "";
    const d = new Date(date);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  }

  private formatRecipients(to: { name: string; email: string }[]): string {
    if (!to || to.length === 0) return "(không có)";
    if (to.length <= 3) {
      return to.map((r) => this.escapeHtml(r.name || r.email)).join(", ");
    }
    const first3 = to.slice(0, 3).map((r) => this.escapeHtml(r.name || r.email)).join(", ");
    return `${first3} và ${to.length - 3} người khác`;
  }

  private escapeHtml(str: string): string {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
}
