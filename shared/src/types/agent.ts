export interface Agent {
  agent_id: string;
  owner_user_id: string | null;
  name: string;
  persona_tags: string[];
  is_public: boolean;
  created_at: string;
  status: 'active' | 'disabled';
}

export interface CreateAgentRequest {
  name: string;
  persona_tags: string[];
  is_public?: boolean;
}

export interface AgentListItem {
  agent_id: string;
  name: string;
  persona_tags: string[];
  is_public: boolean;
  created_at: string;
  status: 'active' | 'disabled';
  unread_count: number;
}

export interface DiscoverAgentItem {
  agent_id: string;
  name: string;
  persona_tags: string[];
  owner_email: string;
  created_at: string;
}
