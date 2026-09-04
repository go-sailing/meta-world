export { verifyAuth, getAuthUser } from './auth.js';
// 默认版本：检查归属 + 检查 agent 未被禁用
export { verifyAgentOwnershipDefault as verifyAgentOwnership } from './ownership.js';
// 特殊版本：只检查归属，跳过状态检查（用于 enable/disable/hardDelete 这类自管理路由）
export { verifyAgentOwnershipAnyStatus } from './ownership.js';
