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
      lastFullResponse: [],
      lastActivity: Date.now(),
      timeoutId: null,
      errors: [],
      startTime: Date.now(),
      metadata: {
        userAgent: null,
        ipAddress: null,
        platform: null
      }
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
    if (session.timeoutId) {
      clearTimeout(session.timeoutId);
    }

    // Set new timeout
    const timeoutId = setTimeout(() => {
      console.log(`Call ${callSid} timed out due to inactivity`);
      timeoutCallback(callSid);
    }, config.call.timeoutDuration);

    session.timeoutId = timeoutId;
    this.sessions.set(callSid, session);

    return timeoutId;
  }

  /**
   * Clear session timeout
   * @param {string} callSid - Call SID
   */
  clearSessionTimeout(callSid) {
    const session = this.sessions.get(callSid);
    if (session && session.timeoutId) {
      clearTimeout(session.timeoutId);
      session.timeoutId = null;
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
      if (session.timeoutId) {
        clearTimeout(session.timeoutId);
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
}

export default new SessionService(); 
