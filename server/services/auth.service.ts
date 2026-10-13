import { pool } from '../config.js';
import { generateToken, verifyToken, comparePassword, UserTokenPayload, AuthenticatedRequest } from './auth.service.legacy.js';

// Re-export types for use by controllers
export type { Role, UserTokenPayload, AuthenticatedRequest };

// Legacy auth service - contains the original auth.ts logic
// This is kept for backward compatibility during transition
export const AUTH_SERVICE_READY = false;

// TODO: Will be fully migrated when auth module is restructured
// The original auth.ts middleware functions are referenced via the legacy file