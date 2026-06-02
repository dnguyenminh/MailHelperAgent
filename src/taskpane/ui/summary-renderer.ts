/**
 * SummaryRenderer — Render AI analysis results (summary bullets)
 * OEHA-3: Summarize Mail Loop
 */

import { AnalyzeResponse } from "../types";

export class SummaryRenderer {
  private container: HTMLElement;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) {
      throw new Error("Container element #" + containerId + " not found");
    }
    this.container = el;
  }

  renderLoading(): void {
    this.container.innerHTML = "";
    this.container.style.display = "block";

    const div = document.createElement("div");
    div.className = "summary-loading";

    const spinner = document.createElement("div");
    spinner.className = "spinner";

    const text = document.createElement("p");
    text.className = "loading-text";
    text.textContent = "AI đang phân tích email...";

    div.appendChild(spinner);
    div.appendChild(text);
    this.container.appendChild(div);
  }

  renderSummary(response: AnalyzeResponse): void {
    this.container.innerHTML = "";
    this.container.style.display = "block";

    const div = document.createElement("div");
    div.className = "summary-result";

    // Header
    const header = document.createElement("h3");
    header.className = "summary-header ms-font-m";
    header.textContent = "Tóm tắt";

    // Bullet list
    const ul = document.createElement("ul");
    ul.className = "summary-list";
    response.summary.forEach(function (bullet) {
      const li = document.createElement("li");
      li.className = "summary-item";
      li.textContent = bullet;
      ul.appendChild(li);
    });

    // Processing info
    const info = document.createElement("div");
    info.className = "summary-info";
    const timeSeconds = (response.processingTime / 1000).toFixed(1);
    info.textContent = "Model: " + response.model + " | " + timeSeconds + "s";

    div.appendChild(header);
    div.appendChild(ul);
    div.appendChild(info);
    this.container.appendChild(div);
  }

  renderError(message: string): void {
    this.container.innerHTML = "";
    this.container.style.display = "block";

    const div = document.createElement("div");
    div.className = "summary-error";

    const icon = document.createElement("i");
    icon.className = "ms-Icon ms-Icon--Warning";

    const text = document.createElement("p");
    text.textContent = message;

    const retryBtn = document.createElement("button");
    retryBtn.className = "ms-Button retry-btn";
    const label = document.createElement("span");
    label.className = "ms-Button-label";
    label.textContent = "Thử lại";
    retryBtn.appendChild(label);
    retryBtn.onclick = function () {
      document.dispatchEvent(new CustomEvent("retry-analyze"));
    };

    div.appendChild(icon);
    div.appendChild(text);
    div.appendChild(retryBtn);
    this.container.appendChild(div);
  }

  hide(): void {
    this.container.style.display = "none";
    this.container.innerHTML = "";
  }
}
