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

  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Only GET requests are allowed for this endpoint',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const { callSid } = req.query;
    
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
      query: {},
      body: req.body
    };

    await callController.getSessionDetails(mockRequest, mockReply);
  } catch (error) {
    console.error('Session detail API error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
} 
