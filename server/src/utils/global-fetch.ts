/**
 * 统一初始化：代理 fetch + transformers.js 环境
 * 必须在 import transformers 之前调用
 */
export async function setupGlobalFetch() {
  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy;

  if (!proxyUrl) return;

  try {
    const { ProxyAgent, fetch: undiciFetch } = await import('undici');
    const proxyAgent = new ProxyAgent(proxyUrl);

    // 全局 fetch 走代理
    (globalThis as any).fetch = (url: any, opts: any = {}) =>
      undiciFetch(url, { ...opts, dispatcher: proxyAgent });

    console.log(`[global-fetch] proxy set via ${proxyUrl}`);
  } catch (err) {
    console.warn('[global-fetch] undici not available, proxy NOT applied');
  }
}

/**
 * 初始化 transformers.js 环境（模型下载源）
 */
export function setupTransformers(hfEndpoint: string) {
  process.env.HF_ENDPOINT = hfEndpoint;
}
