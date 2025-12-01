// backend/src/middleware/requestId.js
const { v4: uuidv4 } = require('uuid');

module.exports = function requestIdMiddleware(req, res, next) {
  // Use existing request ID or generate a new UUID
  const requestId = req.headers['x-request-id'] || uuidv4();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  // Optionally, add to OpenTelemetry context here
  next();
};
