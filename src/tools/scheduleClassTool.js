/**
 * Schedule Class Tool
 * Allows the AI to help students with their class attendance
 */

const scheduleClassTool = {
  name: "schedule_class",
  description:
    "Help student confirm attendance or mark as not attending",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        description: "Type of attendance action",
        enum: ["confirm", "not_attending"],
      },
      // newDate: {
      //   type: "string",
      //   description: "New date for the class (format: YYYY-MM-DD)",
      // },
      // newTime: {
      //   type: "string",
      //   description: "New time for the class (format: HH:MM AM/PM)",
      // },
      reason: {
        type: "string",
        description:
          "Reason for the action. REQUIRED for 'not_attending' action - must be specific reason from student (e.g., 'scheduling conflict', 'illness', 'work emergency', 'family commitment', 'transportation issue')",
      },
      // studentPreference: {
      //   type: "string",
      //   description: "Student's preferred time/date if they mentioned one",
      // },
    },
    required: ["action"],
  },

  /**
   * Execute the schedule class tool
   * @param {Object} args - Tool arguments
   * @param {Object} context - Context with session data, services, etc.
   * @returns {Promise<Object>} Execution result
   */
  async execute(args, context) {
    const { action, newDate, newTime, reason, studentPreference } = args;
    const { sessionData, studentService, googleSheetsService } = context;

    console.log(`AI scheduling action: ${action}`, args);

    // Get current student info from session
    const currentStudent = sessionData?.studentInfo;

    // Simulate scheduling logic
    const schedulingResult = {
      action,
      originalDate: sessionData?.studentInfo?.classDate,
      originalTime: sessionData?.studentInfo?.classTime,
      // newDate: newDate || null,
      // newTime: newTime || null,
      reason: reason || "Not specified",
      // studentPreference: studentPreference || "None mentioned",
      timestamp: new Date().toISOString(),
    };

    // Log the scheduling request
    if (sessionData) {
      if (!sessionData.schedulingRequests) {
        sessionData.schedulingRequests = [];
      }
      sessionData.schedulingRequests.push(schedulingResult);
    }

    // Generate response based on action
    let responseMessage = "";
    let availableSlots = [];
    let sheetUpdateResult = null;

    try {
      switch (action) {
        // case "reschedule":
        //   if (newDate && newTime && currentStudent) {
        //     // Actually reschedule in Google Sheets
        //     sheetUpdateResult = await this.updateStudentScheduleInSheets(
        //       currentStudent,
        //       newDate,
        //       newTime,
        //       reason,
        //       googleSheetsService
        //     );

        //     if (sheetUpdateResult.success) {
        //       responseMessage = `Great! I've successfully rescheduled your ${currentStudent.className} class from ${currentStudent.classDate} at ${currentStudent.classTime} to ${newDate} at ${newTime}. You should receive a confirmation email shortly.`;

        //       // Update session data with new schedule
        //       if (sessionData.studentInfo) {
        //         sessionData.studentInfo.classDate = newDate;
        //         sessionData.studentInfo.classTime = newTime;
        //         sessionData.studentInfo.status = "rescheduled";
        //         sessionData.studentInfo.rescheduledCallAt =
        //           new Date().toISOString();
        //         sessionData.studentInfo.notes = `Rescheduled via phone call: ${
        //           reason || "No reason provided"
        //         }`;
        //       }
        //     } else {
        //       responseMessage = `I've noted your request to reschedule to ${newDate} at ${newTime}. However, I couldn't update the system right now. Someone from our team will follow up with you to confirm the new schedule.`;
        //     }
        //   } else {
        //     // Show available slots and ask for preference
        //     availableSlots = await this.getAvailableTimeSlots(
        //       currentStudent?.className
        //     );
        //     responseMessage = `I can help you reschedule your class. Here are some available options: ${availableSlots.join(
        //       ", "
        //     )}. Which date and time works best for you?`;
        //   }
        //   break;

        // case "cancel":
        //   if (currentStudent) {
        //     sheetUpdateResult = await this.cancelStudentClassInSheets(
        //       currentStudent,
        //       reason,
        //       googleSheetsService
        //     );

        //     if (sheetUpdateResult.success) {
        //       responseMessage = `I've cancelled your ${currentStudent.className} class scheduled for ${currentStudent.classDate} at ${currentStudent.classTime}. Someone from our team will contact you about makeup options and any refund policies.`;

        //       // Update session data
        //       if (sessionData.studentInfo) {
        //         sessionData.studentInfo.status = "cancelled";
        //         sessionData.studentInfo.reason =
        //           reason || "Cancelled via phone call";
        //         sessionData.studentInfo.notes = `Cancelled via phone call: ${
        //           reason || "No reason provided"
        //         }`;
        //       }
        //     } else {
        //       responseMessage =
        //         "I've noted your cancellation request. Someone from our team will follow up with you about the cancellation and any makeup options.";
        //     }
        //   } else {
        //     responseMessage =
        //       "I've noted your cancellation request and someone will follow up with you soon.";
        //   }
        //   break;

        case "confirm":
          if (currentStudent) {
            sheetUpdateResult = await this.confirmStudentAttendanceInSheets(
              currentStudent,
              googleSheetsService
            );

            if (sheetUpdateResult.success) {
              responseMessage = `Perfect! I've confirmed your attendance for ${currentStudent.className} on ${currentStudent.classDate} at ${currentStudent.classTime}. We look forward to seeing you in class!`;

              // Update session data
              if (sessionData.studentInfo) {
                sessionData.studentInfo.status = "confirmed";
                sessionData.studentInfo.lastReminderCallStatus = "confirmed";
                sessionData.studentInfo.notes =
                  "Attendance confirmed via phone call";
              }
            } else {
              responseMessage =
                "Thanks for confirming! We look forward to seeing you in class. If you have any questions, feel free to reach out.";
            }
          } else {
            responseMessage =
              "Thank you for confirming your attendance! We look forward to seeing you in class.";
          }
          break;

        case "not_attending":
          if (currentStudent) {
            sheetUpdateResult = await this.markStudentNotAttendingInSheets(
              currentStudent,
              reason,
              googleSheetsService
            );

            if (sheetUpdateResult.success) {
              responseMessage = `I've marked you as not attending for your ${currentStudent.className} class scheduled for ${currentStudent.classDate} at ${currentStudent.classTime}. Thank you for letting us know. Someone from our team may follow up with you about makeup options.`;

              // Update session data
              if (sessionData.studentInfo) {
                sessionData.studentInfo.status = "not_attending";
                sessionData.studentInfo.reason =
                  reason || "Not attending - informed via phone call";
                sessionData.studentInfo.notes = `Marked as not attending via phone call: ${
                  reason || "No reason provided"
                }`;
              }
            } else {
              responseMessage =
                "I've noted that you won't be able to attend your class. Someone from our team will follow up with you about this.";
            }
          } else {
            responseMessage =
              "I've noted that you won't be able to attend your class. Thank you for letting us know.";
          }
          break;

        default:
          responseMessage =
            "I've noted your scheduling request and someone will follow up with you soon.";
      }
    } catch (error) {
      console.error(`Error in schedule tool action ${action}:`, error);
      responseMessage =
        "I've noted your request, but couldn't update the system right now. Someone from our team will follow up with you shortly.";
    }

    return {
      success: true,
      action: "schedule_class",
      schedulingAction: action,
      availableSlots,
      responseMessage,
      schedulingResult,
      sheetUpdateResult,
    };
  },

  /**
   * Update student schedule in Google Sheets
   * @param {Object} student - Current student info
   * @param {string} newDate - New class date
   * @param {string} newTime - New class time
   * @param {string} reason - Reason for rescheduling
   * @param {Object} googleSheetsService - Google Sheets service
   * @returns {Promise<Object>} Update result
   */
  async updateStudentScheduleInSheets(
    student,
    newDate,
    newTime,
    reason,
    googleSheetsService
  ) {
    try {
      if (!googleSheetsService) {
        console.log(
          "Google Sheets service not available, skipping sheet update"
        );
        return { success: false, reason: "Service unavailable" };
      }

      // Find the student row in the sheet
      const allData = await googleSheetsService.getSheetData();
      const studentRowIndex = allData.findIndex(
        (row) =>
          row["Student Id"] === student.studentId ||
          (row["Name"] === student.name &&
            row["Phone Number"] === student.phoneNumber)
      );

      if (studentRowIndex === -1) {
        console.log(`Student not found in sheet: ${student.name}`);
        return { success: false, reason: "Student not found" };
      }

      // Prepare update data
      const updateData = {
        "Class Date": newDate,
        "Class Time": newTime,
        Status: "rescheduled",
        Reason: reason || "Rescheduled via phone call",
        "Last Reminder Call Status": "rescheduled",
        "Rescheduled Call At": new Date().toISOString(),
        Notes: `Rescheduled via phone call on ${new Date().toLocaleDateString()}: ${
          reason || "No reason provided"
        }`,
      };

      // Update the sheet (row index + 2 because sheets are 1-indexed and have header row)
      const result = await googleSheetsService.updateRow(
        studentRowIndex + 2,
        updateData
      );

      console.log(
        `Successfully updated student ${student.name} schedule in Google Sheets`
      );
      return { success: true, result };
    } catch (error) {
      console.error("Error updating student schedule in Google Sheets:", error);
      return { success: false, error: error.message };
    }
  },

  // /**
  //  * Cancel student class in Google Sheets
  //  * @param {Object} student - Current student info
  //  * @param {string} reason - Reason for cancellation
  //  * @param {Object} googleSheetsService - Google Sheets service
  //  * @returns {Promise<Object>} Update result
  //  */
  // async cancelStudentClassInSheets(student, reason, googleSheetsService) {
  //   try {
  //     if (!googleSheetsService) {
  //       console.log(
  //         "Google Sheets service not available, skipping sheet update"
  //       );
  //       return { success: false, reason: "Service unavailable" };
  //     }

  //     // Find the student row in the sheet
  //     const allData = await googleSheetsService.getSheetData();
  //     const studentRowIndex = allData.findIndex(
  //       (row) =>
  //         row["Student Id"] === student.studentId ||
  //         (row["Name"] === student.name &&
  //           row["Phone Number"] === student.phoneNumber)
  //     );

  //     if (studentRowIndex === -1) {
  //       console.log(`Student not found in sheet: ${student.name}`);
  //       return { success: false, reason: "Student not found" };
  //     }

  //     // Prepare update data
  //     const updateData = {
  //       Status: "cancelled",
  //       Reason: reason || "Cancelled via phone call",
  //       "Last Reminder Call Status": "cancelled",
  //       Notes: `Cancelled via phone call on ${new Date().toLocaleDateString()}: ${
  //         reason || "No reason provided"
  //       }`,
  //     };

  //     // Update the sheet
  //     const result = await googleSheetsService.updateRow(
  //       studentRowIndex + 2,
  //       updateData
  //     );

  //     console.log(
  //       `Successfully cancelled student ${student.name} class in Google Sheets`
  //     );
  //     return { success: true, result };
  //   } catch (error) {
  //     console.error("Error cancelling student class in Google Sheets:", error);
  //     return { success: false, error: error.message };
  //   }
  // },

  /**
   * Confirm student attendance in Google Sheets
   * @param {Object} student - Current student info
   * @param {Object} googleSheetsService - Google Sheets service
   * @returns {Promise<Object>} Update result
   */
  async confirmStudentAttendanceInSheets(student, googleSheetsService) {
    try {
      if (!googleSheetsService) {
        console.log(
          "Google Sheets service not available, skipping sheet update"
        );
        return { success: false, reason: "Service unavailable" };
      }

      // Find the student row in the sheet
      const allData = await googleSheetsService.getSheetData();
      const studentRowIndex = allData.findIndex(
        (row) =>
          row["Student Id"] === student.studentId ||
          (row["Name"] === student.name &&
            row["Phone Number"] === student.phoneNumber)
      );

      if (studentRowIndex === -1) {
        console.log(`Student not found in sheet: ${student.name}`);
        return { success: false, reason: "Student not found" };
      }

      // Prepare update data
      const updateData = {
        Status: "confirmed",
        "Last Reminder Call Status": "confirmed",
        Notes: `Attendance confirmed via phone call on ${new Date().toLocaleDateString()}`,
      };

      // Update the sheet
      const result = await googleSheetsService.updateRow(
        studentRowIndex + 2,
        updateData
      );

      console.log(
        `Successfully confirmed student ${student.name} attendance in Google Sheets`
      );
      return { success: true, result };
    } catch (error) {
      console.error(
        "Error confirming student attendance in Google Sheets:",
        error
      );
      return { success: false, error: error.message };
    }
  },

  /**
   * Mark student as not attending in Google Sheets
   * @param {Object} student - Current student info
   * @param {string} reason - Reason for marking as not attending
   * @param {Object} googleSheetsService - Google Sheets service
   * @returns {Promise<Object>} Update result
   */
  async markStudentNotAttendingInSheets(student, reason, googleSheetsService) {
    try {
      if (!googleSheetsService) {
        console.log(
          "Google Sheets service not available, skipping sheet update"
        );
        return { success: false, reason: "Service unavailable" };
      }

      // Find the student row in the sheet
      const allData = await googleSheetsService.getSheetData();
      const studentRowIndex = allData.findIndex(
        (row) =>
          row["Student Id"] === student.studentId ||
          (row["Name"] === student.name &&
            row["Phone Number"] === student.phoneNumber)
      );

      if (studentRowIndex === -1) {
        console.log(`Student not found in sheet: ${student.name}`);
        return { success: false, reason: "Student not found" };
      }

      // Prepare update data
      const updateData = {
        Status: "not_attending",
        Reason: reason || "Not attending - informed via phone call",
        "Last Reminder Call Status": "not_attending",
        Notes: `Marked as not attending via phone call on ${new Date().toLocaleDateString()}: ${
          reason || "No reason provided"
        }`,
      };

      // Update the sheet
      const result = await googleSheetsService.updateRow(
        studentRowIndex + 2,
        updateData
      );

      console.log(
        `Successfully marked student ${student.name} as not attending in Google Sheets`
      );
      return { success: true, result };
    } catch (error) {
      console.error("Error marking student as not attending in Google Sheets:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get available time slots for a class
   * @param {string} className - Name of the class
   * @returns {Promise<Array>} Available time slots
   */
  async getAvailableTimeSlots(className) {
    // This could be enhanced to actually check availability in Google Sheets
    // For now, return some realistic options based on class type
    const baseSlots = [
      "February 10th at 2:00 PM",
      "February 12th at 10:00 AM",
      "February 15th at 3:00 PM",
      "February 17th at 1:00 PM",
      "February 19th at 11:00 AM",
    ];

    // Could filter based on className or other criteria
    return baseSlots.slice(0, 3); // Return top 3 options
  },
};

export default scheduleClassTool; 
