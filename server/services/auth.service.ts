// Compatibility exports for older modules. The active implementation lives
// in server/auth.ts so JWT verification and password checks share one source.
export {
  authenticateToken,
  authorizeRoles,
  comparePassword,
  generateToken,
  verifyToken,
} from '../auth.js';
export type { Role, UserTokenPayload, AuthenticatedRequest } from '../auth.js';

export const AUTH_SERVICE_READY = true;
