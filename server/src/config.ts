import 'dotenv/config';

export const config = {
  llm: {
    baseUrl: process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
    apiKey: process.env.LLM_API_KEY || '',
    model: process.env.LLM_MODEL || 'gpt-4o-mini',
  },
  embedding: {
    model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
    dim: Number(process.env.EMBEDDING_DIM || 1536),
  },
  db: {
    path: process.env.DB_PATH || './meta-agent.db',
  },
  port: Number(process.env.PORT || 3000),
  logLevel: process.env.LOG_LEVEL || 'info',
} as const;
