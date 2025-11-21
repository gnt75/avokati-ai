export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string; // Base64 encoded content
  timestamp: number;
  isActive: boolean;
  category: 'law' | 'case';
  isRagAutoSelected?: boolean;
}

export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  isStreaming?: boolean;
  timestamp: number;
}

export enum ViewState {
  CHAT = 'CHAT',
  DOCUMENTS = 'DOCUMENTS'
}

// Google API Types and Process Env
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}