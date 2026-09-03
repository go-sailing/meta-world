export type LetterStatus =
  | 'sent'
  | 'delivered'
  | 'read'
  | 'processing'
  | 'processing_failed'
  | 'replied'
  | 'done';

export interface Letter {
  letter_id: string;
  from_agent_id: string;
  to_agent_id: string;
  subject?: string;
  body: string;
  status: LetterStatus;
  reply_to?: string;
  sent_at: string;
  delivered_at?: string;
  read_at?: string;
  processed_at?: string;
}

export interface SendLetterRequest {
  from_agent_id: string;
  to_agent_id: string;
  subject?: string;
  body: string;
  reply_to?: string;
  /** 内部使用：自动回复时设 true 防止递归 */
  _skipAutoReply?: boolean;
}

export interface LetterListItem {
  letter_id: string;
  from_agent_id: string;
  from_name: string;
  subject?: string;
  status: LetterStatus;
  sent_at: string;
  is_unread: boolean;
}
