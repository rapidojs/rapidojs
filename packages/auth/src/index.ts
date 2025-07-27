// Public API for @rapidojs/auth
export { AuthModule } from './auth.module.js';
export { JwtAuthGuard } from './guards/jwt-auth.guard.js';
export { JwtStrategy } from './strategies/jwt.strategy.js';
export type { AuthStrategy } from './interfaces/strategy.interface.js'; 