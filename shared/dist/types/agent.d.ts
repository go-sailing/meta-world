export interface Agent {
    agent_id: string;
    name: string;
    persona_tags: string[];
    created_at: string;
    status: 'active' | 'disabled';
}
export interface CreateAgentRequest {
    name: string;
    persona_tags: string[];
}
