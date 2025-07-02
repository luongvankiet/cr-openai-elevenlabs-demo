/**
 * End Call Tool
 * Allows the AI to end phone calls when conversations are complete
 */

import googleSheetsService from '../services/googleSheetsService.js';

const endCallTool = {
  name: "end_call",
  description: "End the phone call when the conversation is complete and student is satisfied",
  parameters: {
    type: "object",
    properties: {
      reason: {
        type: "string",
        description: "Reason for ending the call (e.g., 'task_completed', 'customer_satisfied', 'goodbye_received')",
        enum: [
          "task_completed",
          "customer_satisfied", 
          "goodbye_received",
          "student_confirmed_attendance",
          "student_not_attending",
          "no_response",
          "technical_issue"
        ]
      },
      summary: {
        type: "string", 
        description: "Brief summary of what was accomplished in the call"
      },
      studentResponse: {
        type: "string",
        description: "How the student responded (e.g., 'confirmed attendance', 'requested reschedule', 'not available')"
      }
    },
    required: ["reason"]
  },

  /**
   * Execute the end call tool
   * @param {Object} args - Tool arguments
   * @param {Object} context - Context with session data, services, etc.
   * @returns {Promise<Object>} Execution result
   */
  async execute(args, context) {
    const { reason, summary, studentResponse } = args;
    const { sessionData, twilioService, ws } = context;

    console.log(`AI ending call - Reason: ${reason}, Summary: ${summary || 'None'}`);

    // Log the call end reason and summary
    if (sessionData) {
      const callEndInfo = {
        reason,
        summary: summary || 'No summary provided',
        studentResponse: studentResponse || 'No response recorded',
        timestamp: new Date().toISOString(),
        callDuration: Date.now() - sessionData.startTime
      };

      // Add to session for tracking
      sessionData.callEndInfo = callEndInfo;
    }

    // Update attendance if reason is related to attendance
    if (["student_confirmed_attendance", "class_rescheduled"].includes(reason) && sessionData.studentInfo) {
      const status = reason === "student_confirmed_attendance" ? "Attending" : "Pending";
      const attendanceUpdateResult = await googleSheetsService.updateAttendanceStatus(sessionData.studentInfo, status, reason === "class_rescheduled" ? "Class rescheduled" : undefined);
      
      if (!attendanceUpdateResult.success) {
        console.log(`Failed to update attendance status for ${sessionData.studentInfo.name}: ${attendanceUpdateResult.reason}`);
      }
    }

    return {
      success: true,
      action: "end_call",
      reason,
      summary,
      studentResponse,
      message: "Call will be ended after AI finishes speaking"
    };
  }
};

export default endCallTool;
