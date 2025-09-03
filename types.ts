
export interface UIMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  attachments: UIAttachment[];
  isStreaming?: boolean;
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
