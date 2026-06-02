/**
 * OEHA-2: Shared TypeScript interfaces for Outlook Email Helper Agent
 */

export interface EmailAddressInfo {
  name: string;
  email: string;
}

export interface EmailData {
  subject: string;
  from: EmailAddressInfo;
  to: EmailAddressInfo[];
  dateTimeCreated: Date;
  bodyText: string;
  bodyLength: number;
  isTruncated: boolean;
  originalLength?: number;
}

export interface AppState {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  emailData: EmailData | null;
}

export type StateChangeListener = (state: AppState) => void;

/** OEHA-3/4 response from backend */
export interface ReplyOption {
  label: string;
  content: string;
  tone?: string;
}

export interface AnalyzeResponse {
  summary: string[];
  suggestedReplies: ReplyOption[];
  processingTime?: number;
  model?: string;
}
