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

/** v0.3.0 新增：已发送信件列表项 */
export interface SentLetterListItem {
  letter_id: string;
  to_agent_id: string;
  to_name: string;
  subject?: string;
  status: LetterStatus;
  sent_at: string;
  has_reply: boolean;
  reply_preview?: string | null;
}

/** v0.3.0 新增：处理日志事件类型 */
export type LetterProcessEventType =
  | 'letter_received'
  | 'llm_called'
  | 'memories_extracted'
  | 'reply_decision'
  | 'reply_sent'
  | 'processing_error';

/** v0.3.0 新增：单条处理日志 */
export interface LetterProcessLogItem {
  seq: number;
  event_type: LetterProcessEventType;
  detail: Record<string, unknown> | null;
  created_at: string;
}

/** v0.3.0 新增：处理日志响应 */
export interface LetterLogsResponse {
  letter: {
    letter_id: string;
    from_name: string;
    to_name: string;
    subject?: string;
    status: LetterStatus;
    sent_at: string;
  };
  logs: LetterProcessLogItem[];
}
