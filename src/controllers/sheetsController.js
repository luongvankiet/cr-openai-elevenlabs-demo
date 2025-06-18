import config from '../config/index.js';
import googleSheetsService from '../services/googleSheetsService.js';

class SheetsController {
  /**
   * Fetch data from Google Sheet
   * GET /api/sheets/data
   */
  async fetchSheetData(request, reply) {
    try {
      const { spreadsheetId, range } = request.query;
      
      // Extract spreadsheet ID from URL if provided
      let sheetId = config.googleSheets.spreadsheetId;
      
      const data = await googleSheetsService.fetchData(sheetId, range);
      
      reply.send({
        success: true,
        spreadsheetId: sheetId,
        range: range || 'Sheet1!A:Z',
        rowCount: data.length,
        data: data
      });
      
    } catch (error) {
      console.error('Error fetching sheet data:', error);
      reply.code(500).send({
        error: 'Failed to fetch sheet data',
        details: error.message,
        code: 'FETCH_ERROR'
      });
    }
  }

  /**
   * Fetch data from Google Sheet as objects
   * GET /api/sheets/objects
   */
  async fetchSheetObjects(request, reply) {
    try {
      // Extract spreadsheet ID from URL if provided
      let sheetId = config.googleSheets.spreadsheetId;
      
      if (!sheetId) {
        return reply.code(400).send({
          error: 'Missing spreadsheetId parameter in config',
          code: 'MISSING_SHEET_ID'
        });
      }

      const objects = await googleSheetsService.fetchDataAsObjects(sheetId);
      
      reply.send({
        success: true,
        spreadsheetId: sheetId,
        range: 'Sheet1!A:Z',
        recordCount: objects.length,
        data: objects
      });
      
    } catch (error) {
      console.error('Error fetching sheet objects:', error);
      reply.code(500).send({
        error: 'Failed to fetch sheet objects',
        details: error.message,
        code: 'FETCH_ERROR'
      });
    }
  }


  /**
   * POST endpoint for fetching sheet data with body parameters
   * POST /api/sheets/fetch
   */
  async fetchSheetDataPost(request, reply) {
    try {
      const { spreadsheetId, range, url } = request.body;
      
      // Extract spreadsheet ID from URL if provided
      let sheetId = spreadsheetId;
      if (url && !sheetId) {
        sheetId = googleSheetsService.extractSpreadsheetId(url);
      }
      
      if (!sheetId) {
        return reply.code(400).send({
          error: 'Missing spreadsheetId or url in request body',
          code: 'MISSING_SHEET_ID'
        });
      }

      const data = await googleSheetsService.fetchDataAsObjects(sheetId, range);
      
      reply.send({
        success: true,
        spreadsheetId: sheetId,
        range: range || 'Sheet1!A:Z',
        recordCount: data.length,
        data: data,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error fetching sheet data via POST:', error);
      reply.code(500).send({
        error: 'Failed to fetch sheet data',
        details: error.message,
        code: 'FETCH_ERROR'
      });
    }
  }
}

export default new SheetsController(); 
