export type MemoryLayer = 'self' | 'world' | 'other';
export type MemorySource = 'dialogue' | 'letter_receive' | 'letter_send';

export interface MemoryItem {
  memory_id: string;
  agent_id: string;
  layer: MemoryLayer;
  target_agent_id?: string;
  content: string;
  confidence: number;
  source_type: MemorySource;
  source_id: string;
  created_at: string;
}

export interface MemoryVecRow {
  rowid: string;
  embedding: number[];
}

/** v0.3.0 新增：列表查询的增强项（带目标智能体名称） */
export interface MemoryListItem extends MemoryItem {
  target_agent_name: string | null;
}

/** v0.3.0 新增：列表响应 */
export interface MemoryListResponse {
  total: number;
  items: MemoryListItem[];
}
