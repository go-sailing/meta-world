import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { config } from '../../config.js';
import { userRepo } from '../../db/repositories/user.repo.js';
import { validateEmail, validatePassword } from '../../utils/validator.js';

/**
 * 只接收 sign 函数，避免对 FastifyJWT 整个类型的依赖
 */
type JwtSignFn = (payload: object, options?: { expiresIn?: string | number }) => string;

export const authService = {
  async register(input: { email: string; password: string }) {
    if (!validateEmail(input.email)) {
      throw { code: 'INVALID_EMAIL', message: '邮箱格式不正确' };
    }
    if (!validatePassword(input.password)) {
      throw { code: 'INVALID_PASSWORD', message: '密码需 8-32 字符且同时包含字母和数字' };
    }

    const existing = userRepo.findByEmail(input.email.toLowerCase());
    if (existing) {
      throw { code: 'EMAIL_EXISTS' };
    }

    const passwordHash = await bcrypt.hash(input.password, config.bcryptRounds);
    const userId = randomUUID();
    userRepo.insert({
      user_id: userId,
      email: input.email.toLowerCase(),
      password_hash: passwordHash,
    });

    return { user_id: userId, email: input.email };
  },

  async login(input: { email: string; password: string }, sign: JwtSignFn) {
    const user = userRepo.findByEmail(input.email.toLowerCase());
    if (!user) {
      throw { code: 'INVALID_CREDENTIALS' };
    }

    const ok = await bcrypt.compare(input.password, user.password_hash);
    if (!ok) {
      throw { code: 'INVALID_CREDENTIALS' };
    }

    userRepo.updateLastLoginAt(user.user_id);

    const token = sign(
      { sub: user.user_id, email: user.email },
      { expiresIn: config.jwt.expiresIn }
    );

    return { token, user_id: user.user_id, email: user.email };
  },
};
