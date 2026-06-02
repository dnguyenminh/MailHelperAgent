/**
 * ToastManager — Toast notification system
 * OEHA-5: Auto-Insert Reply
 */

import { ToastType } from "../types";

const DEFAULT_DURATION_MS = 5000;

export class ToastManager {
  private container: HTMLElement | null = null;

  private getContainer(): HTMLElement {
    if (!this.container) {
      this.container = document.getElementById("toast");
      if (!this.container) {
        // Create toast container if not exists
        this.container = document.createElement("div");
        this.container.id = "toast";
        this.container.className = "toast";
        document.body.appendChild(this.container);
      }
    }
    return this.container;
  }

  show(type: ToastType, message: string, durationMs?: number): void {
    const el = this.getContainer();
    const duration = durationMs || DEFAULT_DURATION_MS;

    // Reset classes
    el.className = "toast toast-" + type + " visible";
    el.textContent = message;

    // Auto-hide
    setTimeout(function () {
      el.classList.remove("visible");
    }, duration);
  }

  hide(): void {
    const el = this.getContainer();
    el.classList.remove("visible");
  }

  success(message: string, durationMs?: number): void {
    this.show("success", message, durationMs);
  }

  error(message: string, durationMs?: number): void {
    this.show("error", message, durationMs);
  }

  info(message: string, durationMs?: number): void {
    this.show("info", message, durationMs);
  }

  warning(message: string, durationMs?: number): void {
    this.show("warning", message, durationMs);
  }
}

// Singleton
export const toastManager = new ToastManager();
