/**
 * Check if user message indicates they want to end the call
 * @param {string} message - User message
 * @returns {boolean} Whether call should end
 */
export function shouldEndCall(message) {
  const endPhrases = [
    'goodbye', 'bye', 'have a good day'
  ];

  const lowerMessage = message.toLowerCase();
  return endPhrases.some(phrase => lowerMessage.includes(phrase));
}

/**
 * Check if AI response indicates it wants to end the call
 * @param {string} aiResponse - AI response text
 * @returns {boolean} Whether AI wants to end call
 */
export function shouldAIEndCall(aiResponse) {
  const aiEndPhrases = ['goodbye', 'good bye', 'have a great day', 'take care'];
  const completionPhrases = ['anything else', 'is that all', 'does that help'];

  const lowerResponse = aiResponse.toLowerCase();

  // Check for ending phrases
  const hasEndPhrase = aiEndPhrases.some(phrase => {
    // Only match if the phrase appears at the end of the response
    const phraseIndex = lowerResponse.indexOf(phrase);
    return phraseIndex !== -1 && 
           phraseIndex >= lowerResponse.length - phrase.length - 10; // Allow some flexibility for punctuation
  });

  // Check for question patterns that suggest conversation is complete
  // Only match if they appear as complete questions, not partial matches
  const hasCompletionQuestion = completionPhrases.some(phrase => {
    const phraseWithQuestion = phrase + '?';
    return lowerResponse.includes(phraseWithQuestion);
  });

  // Require both an end phrase and a completion question to end the call
  return hasEndPhrase && hasCompletionQuestion;
}

/**
 * Generate a unique session ID
 * @returns {string} Session ID
 */
export function generateSessionId() {
  return `session_${ Date.now() }_${ Math.random().toString(36).substr(2, 9) }`;
}

/**
 * Format call duration for display
 * @param {number} startTime - Start timestamp
 * @param {number} endTime - End timestamp (optional)
 * @returns {string} Formatted duration
 */
export function formatCallDuration(startTime, endTime = null) {
  const end = endTime || Date.now();
  const durationMs = end - startTime;
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${ minutes }m ${ remainingSeconds }s`;
  }
  return `${ seconds }s`;
}

/**
 * Validate phone number format
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} Whether phone number is valid
 */
export function isValidPhoneNumber(phoneNumber) {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber?.replace(/[\s\-\(\)]/g, ''));
}

/**
 * Clean and format phone number
 * @param {string} phoneNumber - Raw phone number
 * @returns {string} Cleaned phone number
 */
export function cleanPhoneNumber(phoneNumber) {
  if (!phoneNumber) return '';

  // Remove all non-digit characters except +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');

  // Add + if not present and number doesn't start with it
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }

  return cleaned;
}

/**
 * Validate tool call context and parameters
 * @param {string} toolName - Name of the tool being called
 * @param {Object} toolArgs - Arguments passed to the tool
 * @param {Object} sessionData - Current session data
 * @param {string} userMessage - The user's last message
 * @returns {Object} Validation result with success flag and error message
 */
export function validateToolCall(toolName, toolArgs, sessionData, userMessage) {
  const validation = {
    success: true,
    error: null,
    warnings: []
  };

  // Validate based on tool type
  switch (toolName) {
    case "get_class_info":
      validation.success = validateGetClassInfoCall(
        toolArgs,
        userMessage,
        validation
      );
      break;

    case "update_attendance":
    case "schedule_class":
      validation.success = validateScheduleClassCall(
        toolArgs,
        sessionData,
        userMessage,
        validation
      );
      break;

    case "end_call":
      validation.success = validateEndCallTool(
        toolArgs,
        sessionData,
        validation
      );
      break;

    default:
      validation.success = false;
      validation.error = `Unknown tool: ${toolName}`;
  }

  return validation;
}

/**
 * Validate get_class_info tool call
 * @param {Object} toolArgs - Tool arguments
 * @param {string} userMessage - User's message
 * @param {Object} validation - Validation object to update
 * @returns {boolean} Whether validation passed
 */
function validateGetClassInfoCall(toolArgs, userMessage, validation) {
  // Check if user actually asked for class information
  const infoKeywords = ['class', 'course', 'material', 'requirement', 'location', 'preparation', 'instructor', 'schedule', 'syllabus', 'homework', 'what do i need', 'when is', 'where is', 'who is teaching'];
  const hasInfoRequest = infoKeywords.some(keyword => 
    userMessage.toLowerCase().includes(keyword.toLowerCase())
  );

  if (!hasInfoRequest) {
    validation.warnings.push("User may not have explicitly requested class information");
  }

  // Validate required parameters
  if (!toolArgs.infoType) {
    validation.error = "Missing required parameter: infoType";
    return false;
  }

  const validInfoTypes = ['name', 'description', 'requirements', 'materials', 'location', 'preparation', 'schedule', 'instructor', 'syllabus', 'homework', 'all'];
  if (!validInfoTypes.includes(toolArgs.infoType)) {
    validation.error = `Invalid infoType: ${toolArgs.infoType}. Must be one of: ${validInfoTypes.join(', ')}`;
    return false;
  }

  return true;
}

/**
 * Validate schedule_class tool call
 * @param {Object} toolArgs - Tool arguments
 * @param {Object} sessionData - Session data
 * @param {string} userMessage - User's message
 * @param {Object} validation - Validation object to update
 * @returns {boolean} Whether validation passed
 */
function validateScheduleClassCall(toolArgs, sessionData, userMessage, validation) {
  // Check if user actually mentioned scheduling/attendance
  const scheduleKeywords = ['confirm', 'attend', 'can\'t make', 'cannot make', 'won\'t make', 'conflict', 'busy', 'available', 'not attending', 'cannot attend', 'can\'t attend', 'unable to attend'];
  const hasScheduleRequest = scheduleKeywords.some(keyword => 
    userMessage.toLowerCase().includes(keyword.toLowerCase())
  );

  // Check for uncertain responses that should be motivated first
  const uncertainKeywords = ['not sure', 'don\'t know', 'maybe', 'unsure', 'uncertain', 'i think', 'possibly', 'might'];
  const hasUncertainResponse = uncertainKeywords.some(keyword => 
    userMessage.toLowerCase().includes(keyword.toLowerCase())
  );

  if (hasUncertainResponse && toolArgs.action === 'not_attending') {
    validation.warnings.push("Student gave uncertain response - should motivate first before marking as not attending");
  }

  if (!hasScheduleRequest) {
    validation.warnings.push("User may not have explicitly requested attendance/scheduling changes");
  }

  // Validate required parameters
  if (!toolArgs.action) {
    validation.error = "Missing required parameter: action";
    return false;
  }

  const validActions = ['confirm', 'not_attending'];
  if (!validActions.includes(toolArgs.action)) {
    validation.error = `Invalid action: ${toolArgs.action}. Must be one of: ${validActions.join(', ')}`;
    return false;
  }

  // Require reason for not_attending action
  if (toolArgs.action === 'not_attending' && !toolArgs.reason) {
    validation.error = "Missing required reason for 'not_attending' action. Must ask student for their reason first.";
    return false;
  }

  // Validate reason is meaningful (not just generic responses)
  if (toolArgs.action === 'not_attending' && toolArgs.reason) {
    const genericReasons = ['not specified', 'no reason', 'none', 'n/a', 'unknown', 'busy', 'can\'t make it', 'cannot attend'];
    const reason = toolArgs.reason.toLowerCase();
    
    if (genericReasons.some(generic => reason.includes(generic)) || reason.length < 3) {
      validation.error = "Reason is too generic. Must collect specific reason from student (examples: 'work conflict', 'doctor appointment', 'family emergency', 'car trouble', 'prior commitment')";
      return false;
    }
  }

  // Check if student info is available for scheduling operations
  if (!sessionData?.studentInfo) {
    validation.warnings.push("No student information available for scheduling operations");
  }

  return true;
}

/**
 * Validate end_call tool call
 * @param {Object} toolArgs - Tool arguments
 * @param {Object} sessionData - Session data
 * @param {Object} validation - Validation object to update
 * @returns {boolean} Whether validation passed
 */
function validateEndCallTool(toolArgs, sessionData, validation) {
  // Validate required parameters
  if (!toolArgs.reason) {
    validation.error = "Missing required parameter: reason";
    return false;
  }

  const validReasons = ['task_completed', 'customer_satisfied', 'goodbye_received', 'student_confirmed_attendance', 'student_not_attending', 'no_response', 'technical_issue'];
  if (!validReasons.includes(toolArgs.reason)) {
    validation.error = `Invalid reason: ${toolArgs.reason}. Must be one of: ${validReasons.join(', ')}`;
    return false;
  }

  // Check if conversation has been substantial enough to warrant ending
  const conversationLength = sessionData?.conversation?.length || 0;
  if (conversationLength < 4) { // At least 2 exchanges (4 messages including system)
    validation.warnings.push("Call may be ending too early - consider if the student's needs have been fully addressed");
  }

  return true;
}

/**
 * Validate date string format (YYYY-MM-DD)
 * @param {string} dateString - Date string to validate
 * @returns {boolean} Whether date is valid
 */
function isValidDate(dateString) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

/**
 * Validate time string format (HH:MM AM/PM)
 * @param {string} timeString - Time string to validate
 * @returns {boolean} Whether time is valid
 */
function isValidTime(timeString) {
  const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;
  return timeRegex.test(timeString);
}

/**
 * Check if a tool call should be logged for review
 * @param {string} toolName - Name of the tool
 * @param {Object} validation - Validation result
 * @param {Object} toolArgs - Tool arguments
 * @returns {boolean} Whether this call should be logged for review
 */
export function shouldLogToolCallForReview(toolName, validation, toolArgs) {
  // Log failed validations
  if (!validation.success) return true;
  
  // Log calls with warnings
  if (validation.warnings.length > 0) return true;
  
  // Log end_call with early termination
  if (toolName === 'end_call' && toolArgs.reason === 'no_response') return true;
  
  // Log schedule operations that may need review
  if (toolName === 'schedule_class' && !toolArgs.reason) return true;
  if (toolName === 'update_attendance' && !toolArgs.reason) return true;
  
  // Log not_attending actions without specific reasons
  if (toolName === 'schedule_class' && toolArgs.action === 'not_attending' && !toolArgs.reason) return true;
  if (toolName === 'update_attendance' && toolArgs.action === 'not_attending' && !toolArgs.reason) return true;
  
  return false;
} 
