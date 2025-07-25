import { FastifyRequest } from 'fastify';

/**
 * Interface for authentication strategies.
 * A strategy is responsible for validating credentials and returning a user object.
 */
export interface AuthStrategy<TUser = any, TPayload = any> {
  /**
   * Validates the incoming request and returns the user object if authentication is successful.
   * @param request - The Fastify request object.
   * @param payload - The payload extracted from the request (e.g., a decoded JWT).
   * @returns The authenticated user object, or null/false if authentication fails.
   */
  validate(request: FastifyRequest, payload: TPayload): Promise<TUser | null | false>;
}

/**
 * Options for configuring an authentication strategy.
 */
export interface StrategyOptions {
  /**
   * A unique name for the strategy instance.
   */
  name?: string;
} 