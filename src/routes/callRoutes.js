import callController from "../controllers/callController.js";

/**
 * Register call-related routes
 * @param {Object} fastify - Fastify instance
 */
export default async function callRoutes(fastify) {
  // TwiML endpoint for incoming calls
  fastify.all("/twiml", callController.generateTwiML);

  // Call management endpoints
  fastify.post("/api/call", {
    schema: {
      body: {
        type: "object",
        required: ["to"],
        properties: {
          to: { type: "string", pattern: "^\\+?[1-9]\\d{1,14}$" },
          from: { type: "string", pattern: "^\\+?[1-9]\\d{1,14}$" }
        }
      }
    }
  }, callController.makeOutboundCall);

  fastify.get("/api/call/:callSid", {
    schema: {
      params: {
        type: "object",
        required: ["callSid"],
        properties: {
          callSid: { type: "string", pattern: "^CA[a-f0-9]{32}$" }
        }
      }
    }
  }, callController.getCallDetails);

  fastify.post("/api/call/:callSid/hangup", {
    schema: {
      params: {
        type: "object",
        required: ["callSid"],
        properties: {
          callSid: { type: "string", pattern: "^CA[a-f0-9]{32}$" }
        }
      }
    }
  }, callController.endCall);

  // Session management endpoints
  fastify.get("/api/sessions", callController.getActiveSessions);
  
  fastify.get("/api/session/:callSid", {
    schema: {
      params: {
        type: "object",
        required: ["callSid"],
        properties: {
          callSid: { type: "string", pattern: "^CA[a-f0-9]{32}$" }
        }
      }
    }
  }, callController.getSessionDetails);

  // Health check endpoint
  fastify.get("/health", callController.healthCheck);
  fastify.get("/", callController.healthCheck);

  // Student reminder call endpoints
  fastify.post('/api/call/reminder-calls', {
    schema: {
      description: 'Make reminder calls to all students with upcoming classes',
      tags: ['calls', 'students'],
      body: {
        type: 'object',
        properties: {
          daysAhead: { type: 'number', default: 7, description: 'Days ahead to look for upcoming classes' }
        }
      }
    }
  }, callController.makeReminderCalls);

  fastify.get('/api/call/students/upcoming', {
    schema: {
      description: 'Get students with upcoming classes',
      tags: ['students'],
      querystring: {
        type: 'object',
        properties: {
          daysAhead: { type: 'number', default: 7, description: 'Days ahead to look for upcoming classes' }
        }
      }
    }
  }, callController.getStudentsWithUpcomingClasses);

  fastify.get('/api/call/students/reminders', {
    schema: {
      description: 'Get students who need reminder calls',
      tags: ['students'],
      querystring: {
        type: 'object',
        properties: {
          daysAhead: { type: 'number', default: 7, description: 'Days ahead to look for upcoming classes' }
        }
      }
    }
  }, callController.getStudentsNeedingReminders);

  fastify.get('/api/call/students', {
    schema: {
      description: 'Get all students from Google Sheets',
      tags: ['students'],
      querystring: {
        type: 'object',
        properties: {
          refresh: { type: 'boolean', default: false, description: 'Force refresh from Google Sheets' }
        }
      }
    }
  }, callController.getAllStudents);

  fastify.get('/api/call/students/stats', {
    schema: {
      description: 'Get student statistics',
      tags: ['students']
    }
  }, callController.getStudentStatistics);

  fastify.post('/api/call/student/:studentId/remind', {
    schema: {
      description: 'Make a reminder call to a specific student',
      tags: ['calls', 'students'],
      params: {
        type: 'object',
        properties: {
          studentId: { type: 'string', description: 'Student ID' }
        },
        required: ['studentId']
      }
    }
  }, callController.makeStudentReminderCall);
} 
