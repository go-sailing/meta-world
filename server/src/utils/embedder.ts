import { config } from '../config.js';
import { logger } from './logger.js';

/**
 * 文本 → 向量 embedding
 * DEMO 阶段直接用 OpenAI Embeddings API 或兼容接口
 */
export async function embed(text: string): Promise<number[]> {
  const url = `${config.llm.baseUrl}/embeddings`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.llm.apiKey}`,
    },
    body: JSON.stringify({
      model: config.embedding.model,
      input: text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    logger.error({ status: res.status, err }, 'Embedding API error');
    throw new Error(`Embedding API failed: ${res.status} ${err}`);
  }

  const json = await res.json();
  return json.data[0].embedding as number[];
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map(t => embed(t)));
}
