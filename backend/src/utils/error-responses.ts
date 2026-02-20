/**
 * Standardized Error Response Utility
 * 
 * Provides consistent error response formatting across all routes
 * Includes proper logging and error tracking
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import Logger from './logger.js';

class ErrorResponses {
  /**
   * Send a standardized 404 Not Found response
   * @param {Object} reply - Fastify reply object
   * @param {string} resource - The resource that was not found
   * @param {string} message - Custom error message (optional)
   * @param {Object} context - Additional context for logging (optional)
   * @returns {Object} Standardized error response
   */
  static notFound(reply: FastifyReply, resource: string, message: string | null = null, context: Record<string, unknown> = {}): FastifyReply {
    const requestId = Logger.generateRequestId('error');
    const errorMessage = message || `${resource} not found`;
    
    // Log the error for debugging
    console.log(`❌ [${requestId}] 404 Error: ${errorMessage}`, {
      resource,
      context,
      url: reply.request?.url,
      method: reply.request?.method,
      userContext: reply.request?.userContext ? {
        userId: reply.request.userContext.userId,
        tenantId: reply.request.userContext.tenantId,
        email: reply.request.userContext.email
      } : null
    });

    return reply.code(404).send({
      success: false,
      error: 'Not Found',
      message: errorMessage,
      resource,
      statusCode: 404,
      requestId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send a standardized 401 Unauthorized response
   * @param {Object} reply - Fastify reply object
   * @param {string} message - Custom error message (optional)
   * @param {Object} context - Additional context for logging (optional)
   * @returns {Object} Standardized error response
   */
  static unauthorized(reply: FastifyReply, message = 'Unauthorized access', context: Record<string, unknown> = {}): FastifyReply {
    const requestId = Logger.generateRequestId('error');
    
    console.log(`❌ [${requestId}] 401 Error: ${message}`, {
      context,
      url: reply.request?.url,
      method: reply.request?.method
    });

    return reply.code(401).send({
      success: false,
      error: 'Unauthorized',
      message,
      statusCode: 401,
      requestId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send a standardized 403 Forbidden response
   * @param {Object} reply - Fastify reply object
   * @param {string} message - Custom error message (optional)
   * @param {Object} context - Additional context for logging (optional)
   * @returns {Object} Standardized error response
   */
  static forbidden(reply: FastifyReply, message = 'Access forbidden', context: Record<string, unknown> = {}): FastifyReply {
    const requestId = Logger.generateRequestId('error');
    
    console.log(`❌ [${requestId}] 403 Error: ${message}`, {
      context,
      url: reply.request?.url,
      method: reply.request?.method,
      userContext: reply.request?.userContext ? {
        userId: reply.request.userContext.userId,
        tenantId: reply.request.userContext.tenantId,
        email: reply.request.userContext.email
      } : null
    });

    return reply.code(403).send({
      success: false,
      error: 'Forbidden',
      message,
      statusCode: 403,
      requestId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send a standardized 400 Bad Request response
   * @param {Object} reply - Fastify reply object
   * @param {string} message - Error message
   * @param {Object} details - Validation details (optional)
   * @param {Object} context - Additional context for logging (optional)
   * @returns {Object} Standardized error response
   */
  static badRequest(reply: FastifyReply, message: string, details: unknown = null, context: Record<string, unknown> = {}): FastifyReply {
    const requestId = Logger.generateRequestId('error');
    
    console.log(`❌ [${requestId}] 400 Error: ${message}`, {
      details,
      context,
      url: reply.request?.url,
      method: reply.request?.method,
      body: reply.request?.body
    });

    return reply.code(400).send({
      success: false,
      error: 'Bad Request',
      message,
      details,
      statusCode: 400,
      requestId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send a standardized 409 Conflict response
   * @param {Object} reply - Fastify reply object
   * @param {string} message - Error message
   * @param {Object} context - Additional context for logging (optional)
   * @returns {Object} Standardized error response
   */
  static conflict(reply: FastifyReply, message: string, context: Record<string, unknown> = {}): FastifyReply {
    const requestId = Logger.generateRequestId('error');
    
    console.log(`❌ [${requestId}] 409 Error: ${message}`, {
      context,
      url: reply.request?.url,
      method: reply.request?.method,
      body: reply.request?.body
    });

    return reply.code(409).send({
      success: false,
      error: 'Conflict',
      message,
      statusCode: 409,
      requestId,
      timestamp: new Date().toISOString(),
      ...context
    });
  }

  /**
   * Send a standardized 500 Internal Server Error response
   * @param {Object} reply - Fastify reply object
   * @param {string} message - Error message
   * @param {Error} error - The actual error object (optional)
   * @param {Object} context - Additional context for logging (optional)
   * @returns {Object} Standardized error response
   */
  static internalError(reply: FastifyReply, message = 'Internal server error', error: Error | null = null, context: Record<string, unknown> = {}): FastifyReply {
    const requestId = Logger.generateRequestId('error');
    
    console.error(`❌ [${requestId}] 500 Error: ${message}`, {
      error: error ? {
        message: error.message,
        stack: error.stack,
        code: (error as Error & { code?: string }).code
      } : null,
      context,
      url: reply.request?.url,
      method: reply.request?.method,
      userContext: reply.request?.userContext ? {
        userId: reply.request.userContext.userId,
        tenantId: reply.request.userContext.tenantId,
        email: reply.request.userContext.email
      } : null
    });

    return reply.code(500).send({
      success: false,
      error: 'Internal Server Error',
      message,
      statusCode: 500,
      requestId,
      timestamp: new Date().toISOString(),
      // Only include error details in development
      ...(process.env.NODE_ENV === 'development' && error ? {
        details: {
          message: error.message,
          stack: error.stack
        }
      } : {})
    });
  }

  /**
   * Send a standardized 503 Service Unavailable response
   * @param {Object} reply - Fastify reply object
   * @param {string} message - Error message
   * @param {Object} context - Additional context for logging (optional)
   * @returns {Object} Standardized error response
   */
  static serviceUnavailable(reply: FastifyReply, message = 'Service temporarily unavailable', context: Record<string, unknown> = {}): FastifyReply {
    const requestId = Logger.generateRequestId('error');
    
    console.error(`❌ [${requestId}] 503 Error: ${message}`, {
      context,
      url: reply.request?.url,
      method: reply.request?.method
    });

    return reply.code(503).send({
      success: false,
      error: 'Service Unavailable',
      message,
      statusCode: 503,
      requestId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send a standardized success response
   * @param {Object} reply - Fastify reply object
   * @param {Object} data - Response data
   * @param {string} message - Success message (optional)
   * @param {number} statusCode - HTTP status code (default: 200)
   * @returns {Object} Standardized success response
   */
  static success(reply: FastifyReply, data: unknown = null, message = 'Success', statusCode = 200): FastifyReply {
    const response: { success: boolean; message: string; timestamp: string; data?: unknown } = {
      success: true,
      message,
      timestamp: new Date().toISOString()
    };

    if (data !== null) {
      response.data = data;
    }

    return reply.code(statusCode).send(response);
  }

  /**
   * Check if user has required tenantId and return standardized error if not
   * @param {Object} request - Fastify request object
   * @param {Object} reply - Fastify reply object
   * @returns {boolean} True if tenantId exists, false if error was sent
   */
  static requireTenantId(request: FastifyRequest, reply: FastifyReply): boolean {
    if (!request.userContext?.tenantId) {
      this.unauthorized(reply, 'User is not associated with any organization', {
        missingField: 'tenantId',
        userContext: request.userContext
      });
      return false;
    }
    return true;
  }

  /**
   * Check if user is authenticated and return standardized error if not
   * @param {Object} request - Fastify request object
   * @param {Object} reply - Fastify reply object
   * @returns {boolean} True if authenticated, false if error was sent
   */
  static requireAuth(request: FastifyRequest, reply: FastifyReply): boolean {
    if (!request.userContext?.isAuthenticated) {
      this.unauthorized(reply, 'Authentication required', {
        isAuthenticated: request.userContext?.isAuthenticated || false
      });
      return false;
    }
    return true;
  }
}

export default ErrorResponses;
