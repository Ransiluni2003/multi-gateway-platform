// backend/src/middleware/requestId.js
const { v4: uuidv4 } = require('uuid');

/**
 * Request ID Middleware
 * Generates or uses existing correlation ID for request tracking
 */
module.exports = function requestIdMiddleware(req, res, next) {
  // Use existing request ID from header or generate a new UUID
  const requestId = req.headers['x-request-id'] || 
                    req.headers['x-correlation-id'] || 
                    uuidv4();
  
  req.requestId = requestId;
  
  // Set response headers for correlation
  res.setHeader('x-request-id', requestId);
  res.setHeader('x-correlation-id', requestId);
  
  next();
};
