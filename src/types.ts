
export interface UIMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  attachments?: Attachment[];
  isStreaming?: boolean;
  options?: MCQOption[];
  showOptions?: boolean; // Control whether to show MCQ options
}
export interface UIAttachment {
  name: string;
  type: string; 
  size: number;
}

export interface Attachment extends UIAttachment {
  data: string; // base64
}

export type MessagePart = {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // base64
  };
};