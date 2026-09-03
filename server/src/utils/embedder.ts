import { config } from '../config.js';
import { logger } from './logger.js';

/**
 * 文本 → 向量 embedding
 * 失败时返回 null（让上层决定如何降级）
 */
export async function embed(text: string): Promise<number[] | null> {
  const url = `${config.llm.baseUrl}/embeddings`;

  try {
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
      const err = await res.text().catch(() => '');
      logger.warn(
        { status: res.status, err: err.slice(0, 200), model: config.embedding.model },
        'Embedding API error, will fallback to null embedding'
      );
      return null;
    }

    const json = await res.json();
    return json.data[0].embedding as number[];
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Embedding fetch error');
    return null;
  }
}

export async function embedBatch(texts: string[]): Promise<(number[] | null)[]> {
  return Promise.all(texts.map(t => embed(t)));
}
