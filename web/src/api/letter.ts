import type { SendLetterRequest, LetterListItem, Letter } from '@meta-world/shared';

export async function sendLetter(req: SendLetterRequest) {
  const res = await fetch('/api/mail/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function listInbox(agentId: string): Promise<LetterListItem[]> {
  const res = await fetch(`/api/mail/inbox?agent_id=${agentId}`);
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function readLetter(id: string): Promise<Letter> {
  const res = await fetch(`/api/mail/${id}`);
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}
