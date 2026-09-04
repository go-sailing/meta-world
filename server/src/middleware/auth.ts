import type { FastifyRequest, FastifyReply } from 'fastify';
import { userRepo } from '../db/repositories/user.repo.js';

/** 断言 req.user 为登录后的 JWT payload 结构 */
function getUser(req: FastifyRequest): { sub: string; email: string; iat: number; exp: number } {
  return req.user as { sub: string; email: string; iat: number; exp: number };
}

export async function verifyAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
    // 让后续 handlers 可以通过 getUser() 拿到正确类型
    const payload = getUser(req);
    (req as any)._authUser = payload;

    // 额外校验：JWT 里的 user_id 必须在 DB 里真实存在
    // 防止 DB 重建后旧 token 还能过签名校验导致 FK constraint 错误
    const user = userRepo.findById(payload.sub);
    if (!user) {
      return reply.code(401).send({
        error: 'USER_NOT_FOUND',
        message: '账号不存在，请重新登录',
      });
    }
  } catch (err: any) {
    if (err.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
      return reply.code(401).send({ error: 'UNAUTHORIZED', message: '未登录' });
    }
    if (err.code === 'FST_JWT_AUTHORIZATION_FAILED') {
      return reply.code(401).send({ error: 'TOKEN_EXPIRED', message: '登录已过期' });
    }
    // 如果已经回复过（上面的 USER_NOT_FOUND 分支），不重复回复
    if (reply.sent) return;
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
