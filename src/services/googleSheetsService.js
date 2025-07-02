import { google } from "googleapis";
import config from '../config/index.js';

export class GoogleSheetsService {
  constructor() {
    this.initializeAuth();
  }

  async initializeAuth() {
    try {
      const sheetsConfig = config.googleSheets;

      // Initialize with service account if available
      if (sheetsConfig.serviceAccountEmail && sheetsConfig.privateKey) {
        this.auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: sheetsConfig.serviceAccountEmail,
            private_key: sheetsConfig.privateKey,
          },
          scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });
      } else if (sheetsConfig.apiKey) {
        // Use API key authentication (read-only)
        this.auth = sheetsConfig.apiKey;
      }

      this.sheets = google.sheets({
        version: "v4",
        auth: this.auth,
      });
    } catch (error) {
      console.error("Error initializing Google Sheets auth:", error);
      throw new Error("Failed to initialize Google Sheets authentication");
    }
  }

  async getFullSheetData() {
    const sheetsConfig = config.googleSheets;
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: sheetsConfig.spreadsheetId,
      range: "Sheet1!A:Z",
    });
    return response.data.values || [];
  }

  /**
   * Get bootcamp students from Google Sheets
   */
  async getBootcampStudents() {
    try {
      const sheetsConfig = config.googleSheets;

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetsConfig.spreadsheetId,
        range: "Sheet1!A:Z", // Assuming student data is in 'Students' sheet
      });

      const rows = response.data.values || [];

      if (rows.length === 0) {
        return [];
      }

      const studentMap = new Map();

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];

        const studentId = row[0] || `student-${i}`;
        const name = row[1] || "";
        const phoneNumber = row[2] || "";
        const email = row[3] || "";
        const className = row[4] || "";
        const classDate = row[5] || "";
        const classTime = row[6] || "";
        const status = row[7] || "";
        const reason = row[8] || "";
        const lastReminderStatus = row[9] || "";
        const rescheduledCallAt = row[10] || "";
        const notes = row[11] || "";

        // Create or get existing student
        if (!studentMap.has(studentId)) {
          const student = {
            id: studentId,  
            name,
            phoneNumber,
            email,
            className,
            classDate,
            classTime,
            status,
            reason,
            lastReminderStatus,
            rescheduledCallAt,
            notes,
            schedule: [],
          };

          studentMap.set(studentId, student);
        }

        // Add schedule item if class info exists
        if (className && classDate) {
          const student = studentMap.get(studentId);

          student.schedule.push({
            id: `${studentId}-${i}`,
            title: className,
            date: new Date(classDate),
            time: classTime,
          });
        }
      }

      return Array.from(studentMap.values());
    } catch (error) {
      console.error("Error getting bootcamp students:", error);
      return [];
    }
  }

  /**
   * Get schedule for a specific student
   */
  async getStudentSchedule(studentId) {
    try {
      const sheetsConfig = config.getGoogleSheetsConfig();

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetsConfig.spreadsheetId,
        range: "Sheet1!A:Z", // Using your Students sheet structure
      });

      const rows = response.data.values || [];

      if (rows.length === 0) {
        return [];
      }

      const schedules = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];

        // Skip rows that don't match the student ID
        if (row[0] !== studentId) {
          continue;
        }

        const className = row[4] || "";
        const classDate = row[5] || "";
        const classTime = row[6] || "";

        // Only add if there's class information
        if (className && classDate) {
          const schedule = {
            id: `${studentId}-${i}`,
            title: className,
            date: new Date(classDate),
            time: classTime,
          };

          schedules.push(schedule);
        }
      }

      return schedules;
    } catch (error) {
      console.error("Error getting student schedule:", error);
      return [];
    }
  }

  /**
   * Get today's schedule for all active students
   */
  async getTomorrowScheduleForAllStudents() {
    const students = await this.getBootcampStudents();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const result = [];

    for (const student of students) {
      const schedule = await this.getStudentSchedule(student.id);
      const todaySchedule = schedule.filter((item) => {
        const scheduleDate = new Date(item.date);
        scheduleDate.setHours(0, 0, 0, 0);
        return scheduleDate.getTime() === tomorrow.getTime();
      });

      if (todaySchedule.length > 0) {
        result.push({
          student,
          schedule: todaySchedule,
        });
      }
    }

    return result;
  }

  /**
   * Get sheet data as objects with column headers
   * @returns {Promise<Array>} Array of objects with column headers as keys
   */
  async getSheetData() {
    try {
      const sheetsConfig = config.googleSheets;
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetsConfig.spreadsheetId,
        range: "Sheet1!A:Z",
      });

      const rows = response.data.values || [];
      if (rows.length === 0) {
        return [];
      }

      const headers = rows[0];
      const data = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const obj = {};
        
        headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        
        data.push(obj);
      }

      return data;
    } catch (error) {
      console.error("Error getting sheet data:", error);
      return [];
    }
  }

  /**
   * Update a specific row in the sheet
   * @param {number} rowIndex - Row number (1-indexed)
   * @param {Object} updateData - Object with column headers as keys and new values
   * @returns {Promise<Object>} Update result
   */
  async updateRow(rowIndex, updateData) {
    try {
      const sheetsConfig = config.googleSheets;
      
      // First, get the headers to know which columns to update
      const headerResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetsConfig.spreadsheetId,
        range: "Sheet1!1:1",
      });

      const headers = headerResponse.data.values?.[0] || [];
      if (headers.length === 0) {
        throw new Error("No headers found in the sheet");
      }

      // Get the current row data
      const currentRowResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetsConfig.spreadsheetId,
        range: `Sheet1!${rowIndex}:${rowIndex}`,
      });

      const currentRow = currentRowResponse.data.values?.[0] || [];
      
      // Create the updated row by merging current data with updates
      const updatedRow = [...currentRow];
      
      // Extend the array if needed
      while (updatedRow.length < headers.length) {
        updatedRow.push('');
      }

      // Apply updates
      Object.keys(updateData).forEach(columnHeader => {
        const columnIndex = headers.indexOf(columnHeader);
        if (columnIndex !== -1) {
          updatedRow[columnIndex] = updateData[columnHeader];
        }
      });

      // Update the row
      const updateResponse = await this.sheets.spreadsheets.values.update({
        spreadsheetId: sheetsConfig.spreadsheetId,
        range: `Sheet1!${rowIndex}:${rowIndex}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [updatedRow]
        }
      });

      console.log(`Successfully updated row ${rowIndex} in Google Sheets`);
      return { success: true, response: updateResponse.data };

    } catch (error) {
      console.error(`Error updating row ${rowIndex} in Google Sheets:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update multiple cells in the sheet
   * @param {Array} updates - Array of {range, values} objects
   * @returns {Promise<Object>} Update result
   */
  async batchUpdate(updates) {
    try {
      const sheetsConfig = config.googleSheets;
      
      const batchUpdateRequest = {
        spreadsheetId: sheetsConfig.spreadsheetId,
        resource: {
          valueInputOption: 'RAW',
          data: updates.map(update => ({
            range: update.range,
            values: update.values
          }))
        }
      };

      const response = await this.sheets.spreadsheets.values.batchUpdate(batchUpdateRequest);
      
      console.log(`Successfully batch updated ${updates.length} ranges in Google Sheets`);
      return { success: true, response: response.data };

    } catch (error) {
      console.error("Error batch updating Google Sheets:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update student attendance status in Google Sheets
   * @param {Object} student - Student info
   * @param {string} status - New attendance status
   * @param {string} reason - Optional reason for status update
   * @returns {Promise<Object>} Update result
   */
  async updateAttendanceStatus(student, status, reason) {
    try {
      // Find the student row in the sheet
      const allData = await this.getSheetData();
      const studentRowIndex = allData.findIndex(row => 
        row['Student Id'] === student.studentId || 
        (row['Name'] === student.name && row['Phone Number'] === student.phoneNumber)
      );

      if (studentRowIndex === -1) {
        console.log(`Student not found in sheet: ${student.name}`);
        return { success: false, reason: "Student not found" };
      }

      // Prepare update data
      const updateData = {
        'Status': status,
        'Last Reminder Call Status': status,
        'Reason': reason || '',
        'Notes': `Attendance status updated to ${status} via phone call on ${new Date().toLocaleDateString()}${reason ? ': ' + reason : ''}`
      };

      // Update the sheet (row index + 2 because sheets are 1-indexed and have header row)
      const result = await this.updateRow(studentRowIndex + 2, updateData);
      
      console.log(`Successfully updated attendance status for student ${student.name} to ${status} in Google Sheets`);
      return { success: true, result };

    } catch (error) {
      console.error("Error updating attendance status in Google Sheets:", error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
const googleSheetsService = new GoogleSheetsService();
export default googleSheetsService;
