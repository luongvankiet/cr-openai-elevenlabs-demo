import callController from '../src/controllers/callController.js';

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
    // Simulate Fastify request/reply structure
    const mockReply = {
      code: (statusCode) => ({
        send: (data) => {
          res.status(statusCode).send(data);
        },
        type: (contentType) => ({
          send: (data) => {
            res.setHeader('Content-Type', contentType);
            res.status(statusCode).send(data);
          }
        })
      }),
      send: (data) => {
        res.status(200).send(data);
      },
      type: (contentType) => ({
        send: (data) => {
          res.setHeader('Content-Type', contentType);
          res.status(200).send(data);
        }
      })
    };

    await callController.generateTwiML(req, mockReply);
  } catch (error) {
    console.error('TwiML error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
} 
