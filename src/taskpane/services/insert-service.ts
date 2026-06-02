/**
 * OEHA-5: Insert reply into Outlook Reply All form
 */

export class InsertService {
  /**
   * Insert reply content into Outlook Reply All form via Office.js
   */
  insertReply(content: string): void {
    const htmlBody = this.textToHtml(content);

    try {
      Office.context.mailbox.item.displayReplyAllForm({
        htmlBody,
      });
      this.showToast("success", "Đã chèn nội dung vào Reply All. Kiểm tra và nhấn Send.");
    } catch (err) {
      // Fallback: copy to clipboard
      this.copyFallback(content);
    }
  }

  /**
   * Convert plain text to safe HTML for Outlook
   */
  private textToHtml(text: string): string {
    // Strip any existing HTML tags (security)
    let clean = text.replace(/<[^>]*>/g, "");
    clean = clean.trim();

    // Split by double newlines into paragraphs
    const paragraphs = clean.split(/\n\s*\n/);

    return paragraphs
      .filter((p) => p.trim().length > 0)
      .map((p) => `<p>${p.trim().replace(/\n/g, "<br>")}</p>`)
      .join("");
  }

  /**
   * Clipboard fallback when displayReplyAllForm is unsupported
   */
  private async copyFallback(content: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(content);
      this.showToast("info", "Đã copy nội dung. Paste vào Reply All (Ctrl+V).");
    } catch {
      this.showToast("error", "Không thể copy. Vui lòng copy thủ công từ preview.");
    }
  }

  /**
   * Show toast notification
   */
  private showToast(type: "success" | "error" | "info", message: string): void {
    const el = document.getElementById("toast");
    if (!el) return;

    el.className = `toast toast-${type} visible`;
    el.textContent = message;

    setTimeout(() => {
      el.classList.remove("visible");
    }, 5000);
  }
}
