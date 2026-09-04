import { request } from './request';
import type { SendLetterRequest, LetterListItem, Letter } from '@meta-world/shared';

export async function sendLetter(req: SendLetterRequest) {
  return request('/mail/send', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function listInbox(agentId: string): Promise<LetterListItem[]> {
  return request<LetterListItem[]>(`/mail/inbox?agent_id=${agentId}`);
}

export async function readLetter(id: string): Promise<Letter> {
  return request<Letter>(`/mail/${id}`);
}
