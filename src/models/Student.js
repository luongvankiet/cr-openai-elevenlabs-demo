/**
 * Student model representing data from Google Sheets
 */
class Student {
  constructor(data) {
    this.studentId = data["Student Id"] || data.studentId || "";
    this.name = data["Name"] || data.name || "";
    this.phoneNumber = data["Phone Number"] || data.phoneNumber || "";
    this.email = data["Email"] || data.email || "";
    this.className = data["Class Name"] || data.className || "";
    this.classDate = data["Class Date"] || data.classDate || "";
    this.classTime = data["Class Time"] || data.classTime || "";
    this.status = data["Status"] || data.status || "";
    this.reason = data["Reason"] || data.reason || "";
    this.lastReminderCallStatus = data["Last Reminder Call Status"] || data.lastReminderCallStatus || "";
    this.rescheduledCallAt = data["Rescheduled Call At"] || data.rescheduledCallAt || "";
    this.notes = data["Notes"] || data.notes || "";
  }

  /**
   * Check if student has an upcoming class
   * @param {number} daysAhead - Number of days to look ahead (default: 7)
   * @returns {boolean}
   */
  hasUpcomingClass(daysAhead = 7) {
    if (!this.classDate) return false;

    try {
      // Parse the class date (assuming format like "06/02/2025" or "2025-02-06")
      const classDate = this.parseClassDate(this.classDate);
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + daysAhead);

      // Check if class is between today and future date
      return classDate >= today && classDate <= futureDate;
    } catch (error) {
      console.error(`Error parsing date for student ${this.name}:`, error);
      return false;
    }
  }

  /**
   * Parse class date from various formats
   * @param {string} dateString 
   * @returns {Date}
   */
  parseClassDate(dateString) {
    // Handle different date formats
    if (dateString.includes('/')) {
      // Format: MM/DD/YYYY or DD/MM/YYYY
      const parts = dateString.split('/');
      if (parts.length === 3) {
        // Assuming MM/DD/YYYY format
        return new Date(parts[2], parts[0] - 1, parts[1]);
      }
    } else if (dateString.includes('-')) {
      // Format: YYYY-MM-DD
      return new Date(dateString);
    }
    
    // Try direct parsing
    return new Date(dateString);
  }

  /**
   * Check if student needs a reminder call
   * @returns {boolean}
   */
  needsReminderCall(daysAhead = 7) {
    return this.status === "scheduled" && 
           this.lastReminderCallStatus !== "completed" &&
           this.hasUpcomingClass(daysAhead);
  }

  /**
   * Get formatted class date and time
   * @returns {string}
   */
  getFormattedClassInfo() {
    return `${this.className} on ${this.classDate} at ${this.classTime}`;
  }

  /**
   * Validate student data
   * @returns {Object} Validation result
   */
  validate() {
    const errors = [];

    if (!this.name) errors.push("Name is required");
    if (!this.phoneNumber) errors.push("Phone number is required");
    if (!this.className) errors.push("Class name is required");
    if (!this.classDate) errors.push("Class date is required");

    // Validate phone number format
    if (this.phoneNumber && !this.isValidPhoneNumber(this.phoneNumber)) {
      errors.push("Invalid phone number format");
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Basic phone number validation
   * @param {string} phone 
   * @returns {boolean}
   */
  isValidPhoneNumber(phone) {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    // Check if it's a valid length (10-15 digits)
    return cleanPhone.length >= 10 && cleanPhone.length <= 15;
  }

  /**
   * Convert to plain object
   * @returns {Object}
   */
  toObject() {
    return {
      studentId: this.studentId,
      name: this.name,
      phoneNumber: this.phoneNumber,
      email: this.email,
      className: this.className,
      classDate: this.classDate,
      classTime: this.classTime,
      status: this.status,
      reason: this.reason,
      lastReminderCallStatus: this.lastReminderCallStatus,
      rescheduledCallAt: this.rescheduledCallAt,
      notes: this.notes
    };
  }

  /**
   * Create Student instances from Google Sheets data
   * @param {Array} sheetsData - Raw data from Google Sheets
   * @returns {Array<Student>} Array of Student instances
   */
  static fromSheetsData(sheetsData) {
    if (!Array.isArray(sheetsData) || sheetsData.length === 0) {
      return [];
    }

    // First row should be headers, rest are data
    const headers = sheetsData[0];
    const dataRows = sheetsData.slice(1);

    return dataRows.map(row => {
      const studentData = {};
      headers.forEach((header, index) => {
        studentData[header] = row[index] || "";
      });
      return new Student(studentData);
    });
  }
}

export default Student; 
