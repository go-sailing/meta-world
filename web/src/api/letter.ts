import { request } from './request';
import type { SendLetterRequest, LetterListItem, Letter, SentLetterListItem, LetterLogsResponse } from '@meta-world/shared';

export async function sendLetter(req: SendLetterRequest) {
  return request('/mail/send', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function listInbox(agentId: string): Promise<LetterListItem[]> {
  return request<LetterListItem[]>(`/mail/inbox?agent_id=${agentId}`);
}

/** v0.3.0 新增：查询已发送信件 */
export async function listSent(agentId: string): Promise<SentLetterListItem[]> {
  return request<SentLetterListItem[]>(`/mail/sent?agent_id=${agentId}`);
}

export async function readLetter(id: string): Promise<Letter> {
  return request<Letter>(`/mail/${id}`);
}

/** v0.3.0 新增：查询信件处理日志 */
export async function getLetterLogs(id: string): Promise<LetterLogsResponse> {
  return request<LetterLogsResponse>(`/mail/${id}/logs`);
}
