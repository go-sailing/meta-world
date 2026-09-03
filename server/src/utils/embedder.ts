import { config } from '../config.js';
import { logger } from './logger.js';

// ---- 本地 pipeline 懒加载（第一次 embed 时才初始化） ----
let localPipeline: any = null;
let initPromise: Promise<void> | null = null;

async function getLocalPipeline() {
  if (localPipeline) return localPipeline;
  if (initPromise) {
    await initPromise;
    return localPipeline;
  }

  initPromise = (async () => {
    const { env, pipeline } = await import('@xenova/transformers');
    // 设置镜像源（如果配了 HF_ENDPOINT）
    if (config.embedding.hfEndpoint && config.embedding.hfEndpoint !== 'https://huggingface.co') {
      env.remoteHost = config.embedding.hfEndpoint.replace(/\/?$/, '/');
      logger.info({ remoteHost: env.remoteHost }, 'transformers.js remoteHost set');
    }
    logger.info({ model: config.embedding.localModel }, 'Loading local embedding model...');
    localPipeline = await pipeline('feature-extraction', config.embedding.localModel);
    logger.info('Local embedding model ready');
  })();

  await initPromise;
  return localPipeline;
}

// ---- 远程 API ----
async function embedRemote(text: string): Promise<number[] | null> {
  const url = `${config.embedding.baseUrl}/embeddings`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.embedding.apiKey}`,
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
        'Remote embedding failed'
      );
      return null;
    }
    const json = await res.json();
    return json.data[0].embedding as number[];
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Remote embedding fetch error');
    return null;
  }
}

// ---- 本地 transformers.js ----
async function embedLocal(text: string): Promise<number[] | null> {
  try {
    const pipe = await getLocalPipeline();
    const out = await pipe(text, { pooling: 'mean', normalize: true });
    return Array.from(out.data) as number[];
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Local embedding failed');
    return null;
  }
}

// ---- 对外统一接口 ----
export async function embed(text: string): Promise<number[] | null> {
  if (config.embedding.mode === 'local') {
    return embedLocal(text);
  }
  return embedRemote(text);
}

export async function embedBatch(texts: string[]): Promise<(number[] | null)[]> {
  return Promise.all(texts.map(t => embed(t)));
}
