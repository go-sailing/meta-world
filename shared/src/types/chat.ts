export interface ChatMessage {
  msg_id: string;
  agent_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ChatRequest {
  agent_id: string;
  message: string;
}

/** SSE 事件类型 */
export type SSEEvent =
  | { event: 'token'; data: { content: string } }
  | { event: 'done'; data: { memory_refs: string[] } }
  | { event: 'error'; data: { message: string } };
