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
    const { callSid } = req.query;
    const { method } = req;
    
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
      params: { callSid },
      query: new URLSearchParams(req.url.split('?')[1] || ''),
      body: req.body
    };

    // Route based on method and URL pattern
    if (method === 'GET') {
      await callController.getCallDetails(mockRequest, mockReply);
    } else if (method === 'POST' && req.url.includes('/hangup')) {
      await callController.endCall(mockRequest, mockReply);
    } else {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${method} ${req.url} not found`,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Call detail API error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
} 
