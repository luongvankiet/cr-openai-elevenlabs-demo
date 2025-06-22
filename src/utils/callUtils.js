/**
 * Check if user message indicates they want to end the call
 * @param {string} message - User message
 * @returns {boolean} Whether call should end
 */
export function shouldEndCall(message) {
  const endPhrases = [
    'goodbye', 'bye', 'thank you', 'thanks', 'hang up',
    'end call', 'have a good day'
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
