import callController from '../../../src/controllers/callController.js';

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

    const url = new URL(req.url, `http://${req.headers.host}`);
    const mockRequest = {
      ...req,
      params: {},
      query: Object.fromEntries(url.searchParams),
      body: req.body
    };

    await callController.getAllStudents(mockRequest, mockReply);
  } catch (error) {
    console.error('Students API error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
} 
