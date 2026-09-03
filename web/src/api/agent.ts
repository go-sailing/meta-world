import type { CreateAgentRequest, Agent } from '@meta-world/shared';

export async function createAgent(req: CreateAgentRequest): Promise<Agent> {
  const res = await fetch('/api/agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function getAgent(id: string): Promise<Agent> {
  const res = await fetch(`/api/agents/${id}`);
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}
