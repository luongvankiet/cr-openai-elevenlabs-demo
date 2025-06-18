import sheetsController from '../controllers/sheetsController.js';

const sheetsRoutes = async (fastify) => {
  // GET routes for fetching sheet data
  fastify.get('/api/sheets/data', {
    schema: {
      description: 'Fetch raw data from Google Sheet',
      tags: ['sheets'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            spreadsheetId: { type: 'string' },
            range: { type: 'string' },
            rowCount: { type: 'number' },
            data: { type: 'array' }
          }
        }
      }
    }
  }, sheetsController.fetchSheetData);

  // GET route for fetching data as objects
  fastify.get('/api/sheets/objects', {
    schema: {
      description: 'Fetch data from Google Sheet as objects with headers as keys',
      tags: ['sheets'],
      querystring: {
        type: 'object',
        properties: {
          spreadsheetId: { type: 'string', description: 'Google Sheet ID' },
          url: { type: 'string', description: 'Full Google Sheets URL' },
          range: { type: 'string', description: 'Range to fetch (e.g., Sheet1!A1:D10)', default: 'Sheet1!A:Z' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            spreadsheetId: { type: 'string' },
            range: { type: 'string' },
            recordCount: { type: 'number' },
            data: { type: 'array' }
          }
        }
      }
    }
  }, sheetsController.fetchSheetObjects);


  // POST route for fetching sheet data
  fastify.post('/api/sheets/fetch', {
    schema: {
      description: 'Fetch data from Google Sheet via POST request',
      tags: ['sheets'],
      body: {
        type: 'object',
        properties: {
          spreadsheetId: { type: 'string', description: 'Google Sheet ID' },
          url: { type: 'string', description: 'Full Google Sheets URL' },
          range: { type: 'string', description: 'Range to fetch (e.g., Sheet1!A1:D10)', default: 'Sheet1!A:Z' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            spreadsheetId: { type: 'string' },
            range: { type: 'string' },
            recordCount: { type: 'number' },
            data: { type: 'array' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, sheetsController.fetchSheetDataPost);
};

export default sheetsRoutes; 
