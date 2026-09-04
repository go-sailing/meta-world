/**
 * 代理初始化：检测代理是否可用，导出可复用的 ProxyAgent
 * 不全局覆盖 fetch，让各模块显式使用
 */

let _proxyAgent: any = null;
let _proxyAvailable = false;

export async function setupGlobalFetch() {
  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy;

  if (!proxyUrl) {
    console.log('[global-fetch] no proxy configured');
    return;
  }

  try {
    const { ProxyAgent, fetch: undiciFetch } = await import('undici');
    const proxyAgent = new ProxyAgent(proxyUrl);

    // 测试代理
    try {
      await Promise.race([
        undiciFetch('https://api.deepseek.com/v1/models', {
          dispatcher: proxyAgent,
          headers: { Authorization: 'Bearer test' },
        }),
        new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 5000)),
      ]);
      _proxyAgent = proxyAgent;
      _proxyAvailable = true;
      console.log(`[global-fetch] proxy available at ${proxyUrl}`);
    } catch {
      console.warn(`[global-fetch] proxy ${proxyUrl} not reachable, direct mode only`);
    }
  } catch {
    console.warn('[global-fetch] undici not available');
  }
}

/** 获取 ProxyAgent（可用时），否则 null */
export function getProxyAgent(): any {
  return _proxyAvailable ? _proxyAgent : null;
}

/** 初始化 transformers.js 环境（模型下载源） */
export function setupTransformers(hfEndpoint: string) {
  process.env.HF_ENDPOINT = hfEndpoint;
}
