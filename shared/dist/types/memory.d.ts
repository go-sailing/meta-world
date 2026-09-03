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
