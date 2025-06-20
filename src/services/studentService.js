import googleSheetsService from './googleSheetsService.js';
import twilioService from './twilioService.js';
import Student from '../models/Student.js';
import config from '../config/index.js';

class StudentService {
  constructor() {
    this.students = [];
    this.lastFetchTime = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  }

  /**
   * Fetch all students from Google Sheets
   * @param {boolean} forceRefresh - Force refresh from Google Sheets
   * @returns {Promise<Array<Student>>}
   */
  async getAllStudents(forceRefresh = false) {
    try {
      // Check if we need to refresh cache
      const shouldRefresh = forceRefresh || 
        !this.lastFetchTime || 
        (Date.now() - this.lastFetchTime) > this.cacheTimeout;

      if (!shouldRefresh && this.students.length > 0) {
        console.log('Returning cached students data');
        return this.students;
      }

      console.log('Fetching students from Google Sheets...');
      // const sheetsData = await googleSheetsService.getBootcampStudents(
      //   config.googleSheets.spreadsheetId,
      //   'Sheet1!A:M' // Adjust range based on your sheet structure
      // );

      const sheetsData = await googleSheetsService.getFullSheetData();
      this.students = Student.fromSheetsData(sheetsData);
      this.lastFetchTime = Date.now();

      console.log(`Fetched ${this.students.length} students from Google Sheets`);
      return this.students;
    } catch (error) {
      console.error('Error fetching students:', error);
      throw new Error(`Failed to fetch students: ${error.message}`);
    }
  }

  /**
   * Get students with upcoming classes
   * @param {number} daysAhead - Number of days to look ahead
   * @returns {Promise<Array<Student>>}
   */
  async getStudentsWithUpcomingClasses(daysAhead = 7) {
    try {
      const allStudents = await this.getAllStudents();
      const studentsWithUpcomingClasses = allStudents.filter(student => 
        student.hasUpcomingClass(daysAhead)
      );

      console.log(`Found ${studentsWithUpcomingClasses.length} students with upcoming classes`);
      return studentsWithUpcomingClasses;
    } catch (error) {
      console.error('Error getting students with upcoming classes:', error);
      throw error;
    }
  }

  /**
   * Get students who need reminder calls
   * @param {number} daysAhead - Number of days to look ahead
   * @returns {Promise<Array<Student>>}
   */
  async getStudentsNeedingReminders(daysAhead = 7) {
    try {
      const allStudents = await this.getAllStudents();
      console.log('allStudents', allStudents);
      const studentsNeedingReminders = allStudents.filter(student => 
        student.needsReminderCall(daysAhead)
      );

      console.log(`Found ${studentsNeedingReminders.length} students needing reminder calls`);
      return studentsNeedingReminders;
    } catch (error) {
      console.error('Error getting students needing reminders:', error);
      throw error;
    }
  }

  /**
   * Make reminder calls to all students with upcoming classes
   * @param {number} daysAhead - Number of days to look ahead
   * @returns {Promise<Object>} Call results summary
   */
  async makeReminderCalls(daysAhead = 7) {
    try {
      const studentsToCall = await this.getStudentsNeedingReminders(daysAhead);
      
      if (studentsToCall.length === 0) {
        return {
          success: true,
          message: 'No students need reminder calls at this time',
          totalStudents: 0,
          callsInitiated: 0,
          callsSuccessful: 0,
          callsFailed: 0,
          results: []
        };
      }

      console.log(`Initiating reminder calls to ${studentsToCall.length} students`);
      
      const callResults = [];
      let successfulCalls = 0;
      let failedCalls = 0;

      // Make calls with some delay between them to avoid rate limiting
      for (let i = 0; i < studentsToCall.length; i++) {
        const student = studentsToCall[i];
        
        try {
          // Validate student data
          const validation = student.validate();
          if (!validation.isValid) {
            console.warn(`Skipping student ${student.name} due to validation errors:`, validation.errors);
            callResults.push({
              studentId: student.studentId,
              name: student.name,
              phoneNumber: student.phoneNumber,
              status: 'skipped',
              error: `Validation failed: ${validation.errors.join(', ')}`,
              classInfo: student.getFormattedClassInfo()
            });
            failedCalls++;
            continue;
          }

          // Make the call
          const callResult = await this.makeReminderCall(student);
          callResults.push(callResult);
          
          if (callResult.status === 'success') {
            successfulCalls++;
          } else {
            failedCalls++;
          }

          // Add delay between calls (2 seconds)
          if (i < studentsToCall.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

        } catch (error) {
          console.error(`Error calling student ${student.name}:`, error);
          callResults.push({
            studentId: student.studentId,
            name: student.name,
            phoneNumber: student.phoneNumber,
            status: 'failed',
            error: error.message,
            classInfo: student.getFormattedClassInfo()
          });
          failedCalls++;
        }
      }

      return {
        success: true,
        message: `Reminder calls completed. ${successfulCalls} successful, ${failedCalls} failed`,
        totalStudents: studentsToCall.length,
        callsInitiated: studentsToCall.length,
        callsSuccessful: successfulCalls,
        callsFailed: failedCalls,
        results: callResults,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error making reminder calls:', error);
      throw new Error(`Failed to make reminder calls: ${error.message}`);
    }
  }

  /**
   * Make a reminder call to a specific student
   * @param {Student} student - Student to call
   * @returns {Promise<Object>} Call result
   */
  async makeReminderCall(student) {
    try {
      const fromNumber = config.twilio.fromNumber;
      const twimlUrl = process.env.NODE_ENV === 'production' ? `https://${ config.domain }/api/twiml` : `https://${ config.domain }/twiml`;

      console.log('twimlUrl', twimlUrl);
      
      console.log(`Making reminder call to ${student.name} at ${student.phoneNumber}`);
      
      const call = await twilioService.makeCall(
        student.phoneNumber,
        fromNumber,
        twimlUrl
      );

      return {
        studentId: student.studentId,
        name: student.name,
        phoneNumber: student.phoneNumber,
        status: 'success',
        callSid: call.sid,
        callStatus: call.status,
        classInfo: student.getFormattedClassInfo(),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`Failed to call student ${student.name}:`, error);
      return {
        studentId: student.studentId,
        name: student.name,
        phoneNumber: student.phoneNumber,
        status: 'failed',
        error: error.message,
        classInfo: student.getFormattedClassInfo(),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get student by ID
   * @param {string} studentId 
   * @returns {Promise<Student|null>}
   */
  async getStudentById(studentId) {
    try {
      const allStudents = await this.getAllStudents();
      return allStudents.find(student => student.studentId === studentId) || null;
    } catch (error) {
      console.error('Error getting student by ID:', error);
      throw error;
    }
  }

  /**
   * Clear students cache
   */
  clearCache() {
    this.students = [];
    this.lastFetchTime = null;
    console.log('Students cache cleared');
  }

  /**
   * Get summary statistics
   * @returns {Promise<Object>}
   */
  async getStatistics() {
    try {
      const allStudents = await this.getAllStudents();
      const upcomingClasses = await this.getStudentsWithUpcomingClasses();
      const needingReminders = await this.getStudentsNeedingReminders();

      return {
        totalStudents: allStudents.length,
        studentsWithUpcomingClasses: upcomingClasses.length,
        studentsNeedingReminders: needingReminders.length,
        lastUpdated: this.lastFetchTime ? new Date(this.lastFetchTime).toISOString() : null
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      throw error;
    }
  }
}

export default new StudentService(); 
