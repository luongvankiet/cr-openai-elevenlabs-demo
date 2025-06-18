import twilioService from "../services/twilioService.js";
import sessionService from "../services/sessionService.js";
import studentService from "../services/studentService.js";
import { isValidPhoneNumber, cleanPhoneNumber } from "../utils/callUtils.js";
import config from "../config/index.js";
import googleSheetsService from '../services/googleSheetsService.js';

class CallController {
  /**
   * Generate TwiML response
   * @param {Object} request - Fastify request
   * @param {Object} reply - Fastify reply
   */
  async generateTwiML(request, reply) {
    const wsUrl = config.websocket.url();
    const welcomeGreeting = config.call.welcomeGreeting;
    
    const twiml = twilioService.generateTwiML(wsUrl, welcomeGreeting);
    
    // send first message to websocket to force assisstant to start
     
    reply.type("text/xml").send(twiml);
  }

  /**
   * Make an outbound call
   * @param {Object} request - Fastify request
   * @param {Object} reply - Fastify reply
   */
  async makeOutboundCall(request, reply) {
    try {
      

    const studentsWithSchedule =
      await googleSheetsService.getTomorrowScheduleForAllStudents();

      if (studentsWithSchedule.length === 0) {
        return reply.code(400).send({
          error: "No students with schedule found",
          code: "NO_STUDENTS_WITH_SCHEDULE",
        });
      }

      // // Validate and clean phone number
      // const cleanTo = cleanPhoneNumber(to);
      // if (!isValidPhoneNumber(cleanTo)) {
      //   return reply.code(400).send({ 
      //     error: "Invalid 'to' phone number format",
      //     code: "INVALID_TO_NUMBER"
      //   });
      // }

      // const fromNumber = from || config.twilio.fromNumber;
      // if (!fromNumber) {
      //   return reply.code(400).send({ 
      //     error: "Missing 'from' phone number in request or TWILIO_FROM_NUMBER in environment",
      //     code: "MISSING_FROM_NUMBER"
      //   });
      // }

      // // Validate from number
      // const cleanFrom = cleanPhoneNumber(fromNumber);
      // if (!isValidPhoneNumber(cleanFrom)) {
      //   return reply.code(400).send({ 
      //     error: "Invalid 'from' phone number format",
      //     code: "INVALID_FROM_NUMBER"
      //   });
      // }

      const twimlUrl = `https://${config.domain}/twiml`;
      const call = await twilioService.makeCall(cleanTo, cleanFrom, twimlUrl);

      reply.send({
        success: true,
        callSid: call.sid,
        status: call.status,
        message: `Outbound call initiated to ${cleanTo}`,
        callDetails: {
          to: call.to,
          from: call.from,
          sid: call.sid,
          status: call.status,
          dateCreated: call.dateCreated
        }
      });
      
    } catch (error) {
      console.error("Error making outbound call:", error);
      
      // Handle specific Twilio errors
      if (error.code) {
        return reply.code(400).send({
          error: "Twilio API error",
          details: error.message,
          code: error.code,
          moreInfo: error.moreInfo
        });
      }
      
      reply.code(500).send({
        error: "Failed to make outbound call",
        details: error.message,
        code: "INTERNAL_ERROR"
      });
    }
  }

  /**
   * Get call details
   * @param {Object} request - Fastify request
   * @param {Object} reply - Fastify reply
   */
  async getCallDetails(request, reply) {
    try {
      const { callSid } = request.params;
      
      if (!callSid || !callSid.startsWith('CA')) {
        return reply.code(400).send({
          error: "Invalid call SID format",
          code: "INVALID_CALL_SID"
        });
      }

      const callDetails = await twilioService.getCallDetails(callSid);
      
      reply.send({
        success: true,
        callDetails
      });
      
    } catch (error) {
      console.error("Error fetching call details:", error);
      
      if (error.status === 404) {
        return reply.code(404).send({
          error: "Call not found",
          details: "The specified call SID does not exist",
          code: "CALL_NOT_FOUND"
        });
      }
      
      reply.code(500).send({
        error: "Failed to fetch call details",
        details: error.message,
        code: "INTERNAL_ERROR"
      });
    }
  }

  /**
   * End a call
   * @param {Object} request - Fastify request
   * @param {Object} reply - Fastify reply
   */
  async endCall(request, reply) {
    try {
      const { callSid } = request.params;
      
      if (!callSid || !callSid.startsWith('CA')) {
        return reply.code(400).send({
          error: "Invalid call SID format",
          code: "INVALID_CALL_SID"
        });
      }

      console.log(`Ending call: ${callSid}`);
      
      const call = await twilioService.endCall(callSid);

      // Clean up session if it exists
      const session = sessionService.getSession(callSid);
      if (session) {
        sessionService.deleteSession(callSid);
      }

      reply.send({
        success: true,
        message: `Call ${callSid} has been ended`,
        callDetails: {
          sid: call.sid,
          status: call.status,
          endTime: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error("Error ending call:", error);
      
      if (error.status === 404) {
        return reply.code(404).send({
          error: "Call not found",
          details: "The specified call SID does not exist",
          code: "CALL_NOT_FOUND"
        });
      }
      
      reply.code(500).send({
        error: "Failed to end call",
        details: error.message,
        code: "INTERNAL_ERROR"
      });
    }
  }

  /**
   * Get active sessions
   * @param {Object} request - Fastify request
   * @param {Object} reply - Fastify reply
   */
  async getActiveSessions(request, reply) {
    try {
      const sessions = sessionService.getAllSessions();
      const sessionCount = sessionService.getSessionCount();
      
      const sanitizedSessions = sessions.map(session => ({
        callSid: session.callSid,
        startTime: session.startTime,
        lastActivity: session.lastActivity,
        messageCount: session.conversation.length,
        errorCount: session.errors?.length || 0,
        hasTimeout: !!session.timeoutId
      }));

      reply.send({
        success: true,
        sessionCount,
        sessions: sanitizedSessions
      });
      
    } catch (error) {
      console.error("Error fetching active sessions:", error);
      reply.code(500).send({
        error: "Failed to fetch active sessions",
        details: error.message,
        code: "INTERNAL_ERROR"
      });
    }
  }

  /**
   * Get session details
   * @param {Object} request - Fastify request
   * @param {Object} reply - Fastify reply
   */
  async getSessionDetails(request, reply) {
    try {
      const { callSid } = request.params;
      const session = sessionService.getSession(callSid);
      
      if (!session) {
        return reply.code(404).send({
          error: "Session not found",
          code: "SESSION_NOT_FOUND"
        });
      }

      // Return sanitized session data (exclude sensitive info)
      const sessionDetails = {
        callSid: session.callSid,
        startTime: session.startTime,
        lastActivity: session.lastActivity,
        messageCount: session.conversation.length,
        messages: session.conversation.filter(msg => msg.role !== 'system'),
        errors: session.errors || [],
        hasTimeout: !!session.timeoutId,
        metadata: session.metadata
      };

      reply.send({
        success: true,
        session: sessionDetails
      });
      
    } catch (error) {
      console.error("Error fetching session details:", error);
      reply.code(500).send({
        error: "Failed to fetch session details",
        details: error.message,
        code: "INTERNAL_ERROR"
      });
    }
  }

  /**
   * Health check endpoint
   * @param {Object} request - Fastify request
   * @param {Object} reply - Fastify reply
   */
  async healthCheck(request, reply) {
    const activeSessionCount = sessionService.getSessionCount();
    
    reply.send({
      success: true,
      status: "healthy",
      timestamp: new Date().toISOString(),
      activeSessions: activeSessionCount,
      version: process.env.npm_package_version || "unknown",
      uptime: process.uptime()
    });
  }

  /**
   * Make reminder calls to all students with upcoming classes
   * POST /api/call/reminder-calls
   */
  async makeReminderCalls(request, reply) {
    try {
      const { daysAhead = 7 } = request.body;

      console.log(`Initiating reminder calls for students with classes in the next ${daysAhead} days`);
      
      const result = await studentService.makeReminderCalls(daysAhead);
      
      reply.send(result);
      
    } catch (error) {
      console.error("Error making reminder calls:", error);
      reply.code(500).send({
        error: "Failed to make reminder calls",
        details: error.message,
        code: "REMINDER_CALLS_ERROR"
      });
    }
  }

  /**
   * Get students with upcoming classes
   * GET /api/call/students/upcoming
   */
  async getStudentsWithUpcomingClasses(request, reply) {
    try {
      const { daysAhead = 7 } = request.query;
      
      const students = await studentService.getStudentsWithUpcomingClasses(parseInt(daysAhead));
      
      reply.send({
        success: true,
        daysAhead: parseInt(daysAhead),
        studentsCount: students.length,
        students: students.map(student => student.toObject())
      });
      
    } catch (error) {
      console.error("Error getting students with upcoming classes:", error);
      reply.code(500).send({
        error: "Failed to get students with upcoming classes",
        details: error.message,
        code: "GET_STUDENTS_ERROR"
      });
    }
  }

  /**
   * Get students who need reminder calls
   * GET /api/call/students/reminders
   */
  async getStudentsNeedingReminders(request, reply) {
    try {
      const { daysAhead = 7 } = request.query;
      
      const students = await studentService.getStudentsNeedingReminders(parseInt(daysAhead));
      
      reply.send({
        success: true,
        daysAhead: parseInt(daysAhead),
        studentsCount: students.length,
        students: students.map(student => student.toObject())
      });
      
    } catch (error) {
      console.error("Error getting students needing reminders:", error);
      reply.code(500).send({
        error: "Failed to get students needing reminders",
        details: error.message,
        code: "GET_REMINDERS_ERROR"
      });
    }
  }

  /**
   * Get all students from Google Sheets
   * GET /api/call/students
   */
  async getAllStudents(request, reply) {
    try {
      const { refresh = false } = request.query;
      
      const students = await studentService.getAllStudents(refresh === 'true');
      
      reply.send({
        success: true,
        studentsCount: students.length,
        students: students.map(student => student.toObject()),
        lastUpdated: studentService.lastFetchTime ? new Date(studentService.lastFetchTime).toISOString() : null
      });
      
    } catch (error) {
      console.error("Error getting all students:", error);
      reply.code(500).send({
        error: "Failed to get students",
        details: error.message,
        code: "GET_ALL_STUDENTS_ERROR"
      });
    }
  }

  /**
   * Get student statistics
   * GET /api/call/students/stats
   */
  async getStudentStatistics(request, reply) {
    try {
      const stats = await studentService.getStatistics();
      
      reply.send({
        success: true,
        statistics: stats
      });
      
    } catch (error) {
      console.error("Error getting student statistics:", error);
      reply.code(500).send({
        error: "Failed to get student statistics",
        details: error.message,
        code: "GET_STATS_ERROR"
      });
    }
  }

  /**
   * Make a reminder call to a specific student
   * POST /api/call/student/:studentId/remind
   */
  async makeStudentReminderCall(request, reply) {
    try {
      const { studentId } = request.params;
      
      const student = await studentService.getStudentById(studentId);
      if (!student) {
        return reply.code(404).send({
          error: "Student not found",
          code: "STUDENT_NOT_FOUND"
        });
      }

      const result = await studentService.makeReminderCall(student);
      
      reply.send({
        success: true,
        message: `Reminder call ${result.status === 'success' ? 'initiated' : 'failed'} for ${student.name}`,
        result: result
      });
      
    } catch (error) {
      console.error("Error making student reminder call:", error);
      reply.code(500).send({
        error: "Failed to make reminder call",
        details: error.message,
        code: "STUDENT_REMINDER_ERROR"
      });
    }
  }
}

export default new CallController(); 
