import { SYSTEM_PROMPT } from "../constants/prompts.js";
import config from "../config/index.js";

class SessionService {
  constructor() {
    this.sessions = new Map();
  }

  /**
   * Create a new session
   * @param {string} callSid - Call SID
   * @returns {Object} Session data
   */
  createSession(callSid) {
    const sessionData = {
      callSid,
      conversation: [{ role: "system", content: SYSTEM_PROMPT }],
      startTime: Date.now(),
      lastActivity: Date.now(),
      timeout: null,
      toolCallHistory: [], // Track tool calls to prevent loops
      consecutiveToolCalls: 0, // Track consecutive tool calls
      maxConsecutiveToolCalls: 1, // Limit consecutive tool calls
    };
    
    this.sessions.set(callSid, sessionData);
    console.log(`Session created for call: ${callSid}`);
    
    return sessionData;
  }

  /**
   * Get session data
   * @param {string} callSid - Call SID
   * @returns {Object|null} Session data
   */
  getSession(callSid) {
    return this.sessions.get(callSid);
  }

  /**
   * Update session activity
   * @param {string} callSid - Call SID
   */
  updateActivity(callSid) {
    const session = this.sessions.get(callSid);
    if (session) {
      session.lastActivity = Date.now();
      this.sessions.set(callSid, session);
    }
  }

  /**
   * Add message to conversation
   * @param {string} callSid - Call SID
   * @param {string} role - Message role (user/assistant)
   * @param {string} content - Message content
   */
  addMessage(callSid, role, content) {
    const session = this.sessions.get(callSid);
    if (session) {
      session.conversation.push({ role, content });
      this.updateActivity(callSid);
      this.sessions.set(callSid, session);
    }
  }

  /**
   * Add error to session
   * @param {string} callSid - Call SID
   * @param {Object} error - Error object
   */
  addError(callSid, error) {
    const session = this.sessions.get(callSid);
    if (session) {
      if (!session.errors) {
        session.errors = [];
      }
      
      session.errors.push({
        ...error,
        timestamp: new Date().toISOString()
      });
      
      this.sessions.set(callSid, session);
    }
  }

  /**
   * Set session timeout
   * @param {string} callSid - Call SID
   * @param {Function} timeoutCallback - Callback to execute on timeout
   * @returns {NodeJS.Timeout} Timeout ID
   */
  setSessionTimeout(callSid, timeoutCallback) {
    const session = this.sessions.get(callSid);
    if (!session) return null;

    // Clear existing timeout
    if (session.timeout) {
      clearTimeout(session.timeout);
    }

    // Set new timeout
    const timeoutId = setTimeout(() => {
      console.log(`Call ${callSid} timed out due to inactivity`);
      timeoutCallback(callSid);
    }, config.call.timeoutDuration);

    session.timeout = timeoutId;
    this.sessions.set(callSid, session);

    return timeoutId;
  }

  /**
   * Clear session timeout
   * @param {string} callSid - Call SID
   */
  clearSessionTimeout(callSid) {
    const session = this.sessions.get(callSid);
    if (session && session.timeout) {
      clearTimeout(session.timeout);
      session.timeout = null;
      this.sessions.set(callSid, session);
    }
  }

  /**
   * Handle conversation interruption
   * @param {string} callSid - Call SID
   * @param {string} utteranceUntilInterrupt - Partial utterance
   */
  handleInterrupt(callSid, utteranceUntilInterrupt) {
    const session = this.sessions.get(callSid);
    if (!session) return;

    const conversation = session.conversation;
    let updatedConversation = [...conversation];

    const interruptedIndex = updatedConversation.findLastIndex(
      (message) =>
        message.role === "assistant" &&
        message.content.includes(utteranceUntilInterrupt)
    );

    if (interruptedIndex !== -1) {
      const interruptedMessage = updatedConversation[interruptedIndex];

      const interruptPosition = interruptedMessage.content.indexOf(
        utteranceUntilInterrupt
      );
      const truncatedContent = interruptedMessage.content.substring(
        0,
        interruptPosition + utteranceUntilInterrupt.length
      );

      updatedConversation[interruptedIndex] = {
        ...interruptedMessage,
        content: truncatedContent,
      };

      updatedConversation = updatedConversation.filter(
        (message, index) =>
          !(index > interruptedIndex && message.role === "assistant")
      );
    }

    session.conversation = updatedConversation;
    this.updateActivity(callSid);
    this.sessions.set(callSid, session);
  }

  /**
   * Delete session
   * @param {string} callSid - Call SID
   * @returns {Object|null} Deleted session data
   */
  deleteSession(callSid) {
    const session = this.sessions.get(callSid);
    if (session) {
      // Clear any active timeout
      if (session.timeout) {
        clearTimeout(session.timeout);
      }
      
      // Clear any greeting timeout
      if (session.greetingTimeout) {
        clearTimeout(session.greetingTimeout);
      }
      
      console.log(`Session deleted for call: ${callSid}`);
      console.log("Final conversation:", session.conversation);
      
      this.sessions.delete(callSid);
      return session;
    }
    return null;
  }

  /**
   * Get all active sessions
   * @returns {Array} Array of session data
   */
  getAllSessions() {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session count
   * @returns {number} Number of active sessions
   */
  getSessionCount() {
    return this.sessions.size;
  }

  /**
   * Clean up expired sessions
   * @param {number} maxAge - Max age in milliseconds
   */
  cleanupExpiredSessions(maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
    const now = Date.now();
    const expiredSessions = [];

    for (const [callSid, session] of this.sessions.entries()) {
      if (now - session.lastActivity > maxAge) {
        expiredSessions.push(callSid);
      }
    }

    expiredSessions.forEach(callSid => {
      console.log(`Cleaning up expired session: ${callSid}`);
      this.deleteSession(callSid);
    });

    return expiredSessions.length;
  }

  /**
   * Add a tool call to the session history
   * @param {string} callSid - Call SID
   * @param {string} toolName - Name of the tool called
   * @param {Object} toolArgs - Tool arguments
   */
  addToolCall(callSid, toolName, toolArgs) {
    const session = this.sessions.get(callSid);
    if (session) {
      const toolCall = {
        toolName,
        toolArgs,
        timestamp: Date.now()
      };
      
      session.toolCallHistory.push(toolCall);
      session.consecutiveToolCalls++;
      
      // Keep only last 10 tool calls to prevent memory buildup
      if (session.toolCallHistory.length > 10) {
        session.toolCallHistory.shift();
      }
    }
  }

  /**
   * Reset consecutive tool call counter
   * @param {string} callSid - Call SID
   */
  resetToolCallCounter(callSid) {
    const session = this.sessions.get(callSid);
    if (session) {
      session.consecutiveToolCalls = 0;
    }
  }

  /**
   * Check if tool call would create a loop
   * @param {string} callSid - Call SID
   * @param {string} toolName - Tool name
   * @param {Object} toolArgs - Tool arguments
   * @returns {boolean} Whether this would create a loop
   */
  wouldCreateToolLoop(callSid, toolName, toolArgs) {
    const session = this.sessions.get(callSid);
    if (!session) return false;

    // Check if we've exceeded consecutive tool calls
    if (session.consecutiveToolCalls >= session.maxConsecutiveToolCalls) {
      return true;
    }

    // Check for recent identical tool calls (within last 2 minutes)
    const recentCalls = session.toolCallHistory.filter(call => 
      Date.now() - call.timestamp < 120000 // 2 minutes
    );

    // Check for duplicate tool calls with same action
    const duplicateCalls = recentCalls.filter(call => 
      call.toolName === toolName && 
      call.toolArgs.action === toolArgs.action
    );

    // If we've made the same tool call more than twice recently, it's a loop
    return duplicateCalls.length >= 2;
  }
}

export default new SessionService(); 
