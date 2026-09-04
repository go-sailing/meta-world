export interface AddressBookEntry {
  entry_id: string;
  owner_agent_id: string;
  target_agent_id: string;
  nickname: string | null;
  added_at: string;
}

export interface FriendListItem {
  entry_id: string;
  target_agent_id: string;
  name: string;
  persona_tags: string[];
  nickname: string | null;
  is_public: boolean;
  is_mutual: boolean;
  added_at: string;
}

export interface AddAddressBookRequest {
  owner_agent_id: string;
  target_agent_id: string;
  nickname?: string;
}
