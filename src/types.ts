export type ApiProvider = 'gemini' | 'doubao';
export type InterviewMode = 'tech' | 'module';
export type OutputMode = 'voice' | 'text';

export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export interface ContextSource {
  type: 'url' | 'file' | 'folder' | 'none';
  value: string | File | FileList | null;
  name?: string;
}
