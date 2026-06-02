/**
 * OEHA-3/4: API Client — communicates with Python FastAPI backend
 */

import { AnalyzeResponse } from "../types";

const BACKEND_URL = "http://localhost:8000";
const TIMEOUT_MS = 30000;

export class ApiClient {
  /**
   * Send email content to backend for AI analysis (summary + replies)
   */
  async analyzeEmail(subject: string, body: string): Promise<AnalyzeResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${BACKEND_URL}/api/analyze-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("TIMEOUT");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Health check for backend
   */
  async checkHealth(): Promise<boolean> {
    try {
      const resp = await fetch(`${BACKEND_URL}/health`);
      return resp.ok;
    } catch {
      return false;
    }
  }
}
