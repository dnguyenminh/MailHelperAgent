/**
 * ReplyStateManager — State management for reply suggestions
 * OEHA-4: Suggest Reply Options
 */

import { ReplyOption } from "../types";

const MAX_REGENERATE = 3;

export class ReplyStateManager {
  private options: ReplyOption[] = [];
  private selectedIndex: number | null = null;
  private previewContent: string = "";
  private regenerateCount: number = 0;

  setOptions(opts: ReplyOption[]): void {
    this.options = opts;
    this.selectedIndex = null;
    this.previewContent = "";
  }

  getOptions(): ReplyOption[] {
    return this.options;
  }

  selectOption(index: number): void {
    if (index >= 0 && index < this.options.length) {
      this.selectedIndex = index;
      this.previewContent = this.options[index].content;
    }
  }

  getSelectedIndex(): number | null {
    return this.selectedIndex;
  }

  getSelectedContent(): string {
    return this.previewContent;
  }

  updatePreview(text: string): void {
    this.previewContent = text;
  }

  canRegenerate(): boolean {
    return this.regenerateCount < MAX_REGENERATE;
  }

  incrementRegenerate(): void {
    this.regenerateCount++;
  }

  getRegenerateCount(): number {
    return this.regenerateCount;
  }

  getMaxRegenerate(): number {
    return MAX_REGENERATE;
  }

  hasOptions(): boolean {
    return this.options.length > 0;
  }

  reset(): void {
    this.options = [];
    this.selectedIndex = null;
    this.previewContent = "";
    this.regenerateCount = 0;
  }
}

export const replyState = new ReplyStateManager();
