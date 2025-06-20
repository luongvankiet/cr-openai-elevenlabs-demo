import callController from '../../src/controllers/callController.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Parse URL to determine the action
    const { method } = req;
    const pathSegments = req.url.split('/').filter(Boolean);
    
    // Create mock Fastify request/reply objects
    const mockReply = {
      code: (statusCode) => ({
        send: (data) => {
          res.status(statusCode).json(data);
        }
      }),
      send: (data) => {
        res.status(200).json(data);
      }
    };

    const mockRequest = {
      ...req,
      params: {},
      query: new URLSearchParams(req.url.split('?')[1] || ''),
      body: req.body
    };

    // Route based on method and path
    if (method === 'POST' && req.url === '/api/call') {
      await callController.makeOutboundCall(mockRequest, mockReply);
    } else if (method === 'GET' && req.url === '/api/call/sessions') {
      await callController.getActiveSessions(mockRequest, mockReply);
    } else {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${method} ${req.url} not found`,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Call API error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
} 
