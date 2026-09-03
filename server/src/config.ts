import 'dotenv/config';

export const config = {
  llm: {
    baseUrl: process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
    apiKey: process.env.LLM_API_KEY || '',
    model: process.env.LLM_MODEL || 'gpt-4o-mini',
  },
  embedding: {
    mode: (process.env.EMBEDDING_MODE || 'local') as 'local' | 'remote',
    localModel: process.env.EMBEDDING_LOCAL_MODEL || 'Xenova/all-MiniLM-L6-v2',
    model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
    baseUrl: process.env.EMBEDDING_BASE_URL || process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
    apiKey: process.env.EMBEDDING_API_KEY || process.env.LLM_API_KEY || '',
    dim: Number(process.env.EMBEDDING_DIM || 384),
    hfEndpoint: process.env.HF_ENDPOINT || 'https://huggingface.co',
  },
  db: {
    path: process.env.DB_PATH || './meta-agent.db',
  },
  port: Number(process.env.PORT || 3000),
  logLevel: process.env.LOG_LEVEL || 'info',
} as const;
