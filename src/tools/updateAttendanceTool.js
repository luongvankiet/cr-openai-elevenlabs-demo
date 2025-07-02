import googleSheetsService from '../services/googleSheetsService.js';

const updateAttendanceTool = {
  name: "update_attendance",
  description: "Update student attendance status in Google Sheets",
  parameters: {
    type: "object",
    properties: {
      status: {
        type: "string",
        description: "Attendance status",
        enum: ["Attending", "Not Attending - Recording Requested", "Pending"]
      },
      reason: {
        type: "string",
        description: "Reason for not attending (if applicable)"
      }
    },
    required: ["status"]
  },

  async execute(args, context) {
    const { status, reason } = args;
    const { sessionData } = context;
    
    try {
      if (!sessionData?.studentInfo) {
        console.log("No student info in session");
        return { success: false, reason: "No student info" };
      }

      // Find the student row in the sheet
      const allData = await googleSheetsService.getSheetData();
      const studentRowIndex = allData.findIndex(row => 
        row['Student Id'] === sessionData.studentInfo.studentId || 
        (row['Name'] === sessionData.studentInfo.name && 
         row['Phone Number'] === sessionData.studentInfo.phoneNumber)
      );

      if (studentRowIndex === -1) {
        console.log(`Student not found in sheet: ${sessionData.studentInfo.name}`);
        return { success: false, reason: "Student not found" };
      }

      // Prepare update data
      const updateData = {
        'Status': status,
        'Last Reminder Call Status': status,
        'Reason': reason || '',
        'Notes': `Attendance ${status.toLowerCase()} via phone call on ${new Date().toLocaleDateString()}${reason ? ': ' + reason : ''}`
      };

      // Update the sheet (row index + 2 because sheets are 1-indexed and have header row)
      const result = await googleSheetsService.updateRow(studentRowIndex + 2, updateData);
      
      // Update session data
      sessionData.studentInfo.status = status;
      sessionData.studentInfo.lastReminderCallStatus = status;
      if (reason) {
        sessionData.studentInfo.reason = reason;
      }

      console.log(`Successfully updated attendance for ${sessionData.studentInfo.name} to ${status}`);
      return { success: true, result };

    } catch (error) {
      console.error("Error updating attendance in Google Sheets:", error);
      return { success: false, error: error.message };
    }
  }
};

export default updateAttendanceTool;