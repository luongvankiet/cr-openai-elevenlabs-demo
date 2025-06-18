/**
 * Check if user message indicates they want to end the call
 * @param {string} message - User message
 * @returns {boolean} Whether call should end
 */
export function shouldEndCall(message) {
  const endPhrases = [
    'goodbye', 'bye', 'thank you', 'thanks', 'hang up', 
    'end call', 'disconnect', 'we\'re done', 'that helps', 
    'have a good day'
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
  const aiEndPhrases = [
    'goodbye', 'good bye', 'have a great day', 'take care',
    'call us anytime', 'thank you for calling', 'feel free to call back',
     'that should take care of everything', 'have a great day',
    'take care', 'call us anytime', 'thank you for calling', 'feel free to call back',
    'hope this helps', 'that should take care of everything', 'have a great day',
  ];
  
  const lowerResponse = aiResponse.toLowerCase();
  
  // Check for ending phrases
  const hasEndPhrase = aiEndPhrases.some(phrase => lowerResponse.includes(phrase));
  
  // Check for question patterns that suggest conversation is complete
  const hasCompletionQuestion = lowerResponse.includes('anything else') || 
                                lowerResponse.includes('is that all') ||
                                lowerResponse.includes('does that help');
  
  return hasEndPhrase || hasCompletionQuestion;
}

/**
 * Generate a unique session ID
 * @returns {string} Session ID
 */
export function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
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
