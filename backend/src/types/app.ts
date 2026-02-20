import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

/**
 * Typed Fastify instance with Zod type provider.
 * Use this instead of raw FastifyInstance in route plugins and services
 * to get full type inference on request.body, request.query, etc.
 */
export type AppInstance = FastifyInstance<
  import('http').Server,
  import('http').IncomingMessage,
  import('http').ServerResponse,
  import('fastify').FastifyBaseLogger,
  ZodTypeProvider
>;
