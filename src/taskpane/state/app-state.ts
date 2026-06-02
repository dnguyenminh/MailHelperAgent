/**
 * OEHA-2: Singleton state manager for shared app state
 */

import { AppState, EmailData, StateChangeListener } from "../types";

export class StateManager {
  private state: AppState = {
    isLoading: false,
    isReady: false,
    error: null,
    emailData: null,
  };

  private listeners: StateChangeListener[] = [];

  getState(): AppState {
    return { ...this.state };
  }

  getEmailData(): EmailData | null {
    return this.state.emailData;
  }

  isEmailLoaded(): boolean {
    return this.state.emailData !== null;
  }

  subscribe(listener: StateChangeListener): void {
    this.listeners.push(listener);
  }

  update(partial: Partial<AppState>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((fn) => fn(this.state));
  }

  reset(): void {
    this.state = { isLoading: false, isReady: false, error: null, emailData: null };
    this.listeners.forEach((fn) => fn(this.state));
  }
}

/** Global singleton instance */
export const appState = new StateManager();
