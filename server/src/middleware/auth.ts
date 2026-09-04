import type { FastifyRequest, FastifyReply } from 'fastify';

/** 断言 req.user 为登录后的 JWT payload 结构 */
function getUser(req: FastifyRequest): { sub: string; email: string; iat: number; exp: number } {
  return req.user as { sub: string; email: string; iat: number; exp: number };
}

export async function verifyAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
    // 让后续 handlers 可以通过 getUser() 拿到正确类型
    (req as any)._authUser = getUser(req);
  } catch (err: any) {
    if (err.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: '未登录' });
    }
    if (err.code === 'FST_JWT_AUTHORIZATION_FAILED') {
      return reply.code(401).send({ error: 'TOKEN_EXPIRED', message: '登录已过期' });
    }
    return reply.code(401).send({ error: 'UNAUTHORIZED', message: err.message });
  }
}

/**
 * 中间件使用 req.user.sub 时，统一通过这个 helper 拿值
 * 避免在业务代码中到处写类型断言
 */
export function getAuthUser(req: FastifyRequest): { sub: string; email: string; iat: number; exp: number } {
  return (req as any)._authUser as { sub: string; email: string; iat: number; exp: number };
}
