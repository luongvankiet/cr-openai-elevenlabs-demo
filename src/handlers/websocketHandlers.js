import sessionService from "../services/sessionService.js";
import aiService from "../services/aiService.js";
import twilioService from "../services/twilioService.js";
import studentService from "../services/studentService.js";
import googleSheetsService from "../services/googleSheetsService.js";
import { shouldEndCall, shouldAIEndCall } from "../utils/callUtils.js";
import { TIMEOUT_MESSAGE, CRITICAL_ERROR_MESSAGE, FALLBACK_GOODBYE } from "../constants/prompts.js";
import config from "../config/index.js";

class WebSocketHandlers {
  /**
   * Handle setup message
   * @param {Object} ws - WebSocket connection
   * @param {Object} message - Setup message
   */
  async handleSetup(ws, message) {
    console.log("Setup for call:", message);
    const callSid = message.callSid;
    
    ws.callSid = callSid;
    const sessionData = sessionService.createSession(callSid);

    const toNumber = message.to;

    if (toNumber) {
      // Try to find student information based on phone number
      try {
        const students = await studentService.getAllStudents();
        const student = students.find(s => {
          // Clean phone numbers for comparison
          const cleanTo = toNumber.replace(/\D/g, '').replace(/\+/g, '');
          const cleanStudent = s.phoneNumber.replace(/\D/g, '').replace(/\+/g, '');

          return cleanTo.includes(cleanStudent.slice(-10)) || cleanStudent.includes(cleanTo.slice(-10)) || cleanTo.includes(cleanStudent.slice(-10));
        });
      
        if (student) {
          console.log(`Found student: ${ student.name } for phone ${ toNumber }`);
        
          // Store student info in session data for tools to access
          sessionData.studentInfo = {
            studentId: student.id,
            name: student.name,
            phoneNumber: student.phoneNumber,
            email: student.email,
            className: student.className,
            classDate: student.classDate,
            classTime: student.classTime,
            status: student.status,
            reason: student.reason,
            lastReminderCallStatus: student.lastReminderStatus,
            rescheduledCallAt: student.rescheduledCallAt,
            notes: student.notes
          };
        
          // Add student context to the conversation
          const studentContext = `STUDENT INFORMATION:
        - Name: ${ student.name }
        - Class: ${ student.className }
        - Date: ${ student.classDate }
        - Time: ${ student.classTime }
        - Status: ${ student.status }

        This student has an upcoming class. Please remind them about their class and provide any assistance they need.
        
        Greet them by name and reference their specific class information, such as "Hi [Student Name], I see you're enrolled in [Class Name] scheduled for [Date] at [Time]."`;

          sessionService.addMessage(callSid, "system", studentContext);
          
          // Send initial message to trigger AI to start conversation with student name
          setTimeout(() => {
            this.sendInitialGreeting(ws, student);
          }, 200); // Small delay to ensure setup is complete
          
        } else {
          console.log(`No student found for phone number: ${ toNumber }`);
          
          // Send generic initial message if no student found
          setTimeout(() => {
            this.sendGenericGreeting(ws);
          }, 1000);
        }
      } catch (error) {
        console.error("Error looking up student information:", error);
        
        // Send generic greeting on error
        setTimeout(() => {
          this.sendGenericGreeting(ws);
        }, 1000);
      }
    } else {
      // Send generic greeting if no phone number
      setTimeout(() => {
        this.sendGenericGreeting(ws);
      }, 1000);
    }
    
    // Set up inactivity timeout
    sessionService.setSessionTimeout(callSid, (callSid) => {
      this.handleTimeout(ws, callSid);
    });
  }

  /**
   * Handle prompt message
   * @param {Object} ws - WebSocket connection
   * @param {Object} message - Prompt message
   */
  async handlePrompt(ws, message) {
    console.log("Processing prompt:", message.voicePrompt);
    const sessionData = sessionService.getSession(ws.callSid);
    
    if (!sessionData) {
      console.error(`No session found for call ${ws.callSid}`);
      return;
    }

    // Update activity and reset timeout
    sessionService.updateActivity(ws.callSid);
    sessionService.setSessionTimeout(ws.callSid, (callSid) => {
      this.handleTimeout(ws, callSid);
    });

    // Add user message to conversation
    sessionService.addMessage(ws.callSid, "user", message.voicePrompt);

    // Check if user wants to end the call
    if (shouldEndCall(message.voicePrompt)) {
      console.log("User indicated they want to end the call");
      await this.handleUserRequestedEnd(ws, sessionData);
      return;
    }

    // Generate AI response
    try {
      await this.generateAIResponse(ws, sessionData);
    } catch (error) {
      console.error("Error generating AI response:", error);
      this.sendErrorResponse(ws, "Failed to generate response");
    }
  }

  /**
   * Handle interrupt message
   * @param {Object} ws - WebSocket connection
   * @param {Object} message - Interrupt message
   */
  handleInterrupt(ws, message) {
    console.log("Handling interruption; last utterance:", message.utteranceUntilInterrupt);
    sessionService.handleInterrupt(ws.callSid, message.utteranceUntilInterrupt);
  }

  /**
   * Handle hangup message
   * @param {Object} ws - WebSocket connection
   * @param {Object} message - Hangup message
   */
  async handleHangup(ws, message) {
    console.log("Received hangup message:", message);
    const sessionData = sessionService.getSession(ws.callSid);
    
    if (!sessionData) {
      console.log(`No session found for call ${ws.callSid}`);
      return;
    }

    console.log(`Processing hangup request for call ${ws.callSid}`);
    
    // Clear timeout
    sessionService.clearSessionTimeout(ws.callSid);

    const reason = message.reason || 'client_initiated';
    const finalMessage = message.finalMessage || null;

    try {
      // Send final message if provided
      if (finalMessage) {
        this.sendTextMessage(ws, finalMessage, true);
        sessionService.addMessage(ws.callSid, "assistant", finalMessage);
        
        // Wait before hanging up
        await new Promise(resolve => setTimeout(resolve, config.call.hangupDelay));
      }

      // Call hangup API
      await twilioService.endCall(ws.callSid);
      console.log(`Successfully ended call ${ws.callSid} via WebSocket hangup message (reason: ${reason})`);
      
      // Confirm hangup to client
      this.sendHangupConfirmation(ws, reason);

    } catch (error) {
      console.error(`Failed to hangup call ${ws.callSid}:`, error);
      this.sendHangupError(ws, error.message, reason);
    }
  }

  /**
   * Handle error message
   * @param {Object} ws - WebSocket connection
   * @param {Object} message - Error message
   */
  async handleError(ws, message) {
    const sessionData = sessionService.getSession(ws.callSid);
    
    const errorInfo = {
      type: message.errorType || 'unknown',
      message: message.message || 'No error message provided',
      code: message.code || null,
      timestamp: message.timestamp || new Date().toISOString()
    };

    console.log(`Error received for call ${ws.callSid}:`, errorInfo);

    // Log error to session
    if (sessionData) {
      sessionService.addError(ws.callSid, errorInfo);
    }

    // Send acknowledgment
    this.sendErrorAcknowledgment(ws, message);

    // Handle critical errors
    if (message.critical === true || message.errorType === 'fatal') {
      console.log(`Critical error received, ending call ${ws.callSid}`);
      await this.handleHangup(ws, { 
        reason: 'critical_error',
        finalMessage: CRITICAL_ERROR_MESSAGE
      });
    }
  }

  /**
   * Handle WebSocket close
   * @param {Object} ws - WebSocket connection
   */
  handleClose(ws) {
    console.log("WebSocket connection closed");
    
    if (ws.callSid) {
      sessionService.deleteSession(ws.callSid);
    }
  }

  /**
   * Handle timeout
   * @param {Object} ws - WebSocket connection
   * @param {string} callSid - Call SID
   */
  async handleTimeout(ws, callSid) {
    console.log(`Call ${callSid} timed out due to inactivity`);
    
    this.sendTextMessage(ws, TIMEOUT_MESSAGE, true);
    
    setTimeout(async () => {
      try {
        await twilioService.endCall(callSid);
        this.sendHangupConfirmation(ws, "timeout");
      } catch (error) {
        console.error("Failed to end timed out call:", error);
        ws.send(JSON.stringify({
          type: "hangup",
          reason: "timeout"
        }));
      }
    }, 3000);
  }

  /**
   * Handle user-requested call end
   * @param {Object} ws - WebSocket connection
   * @param {Object} sessionData - Session data
   */
  async handleUserRequestedEnd(ws, sessionData) {
    sessionService.clearSessionTimeout(ws.callSid);
    
    try {
      const closingMessage = await aiService.generateClosingResponse(sessionData.conversation);
      
      this.sendTextMessage(ws, closingMessage, true);
      sessionService.addMessage(ws.callSid, "assistant", closingMessage);
      
      // Calculate delay based on message length (roughly 150 words per minute speaking rate)
      const estimatedSpeakingTime = Math.max(
        (closingMessage.split(' ').length / 150) * 60 * 1000, // Words per minute to milliseconds
        4000 // Minimum 4 seconds
      );
      
      console.log(`Waiting ${estimatedSpeakingTime}ms for AI to finish speaking before hanging up`);
      
      setTimeout(async () => {
        try {
          await twilioService.endCall(ws.callSid);
          this.sendHangupConfirmation(ws, "conversation_complete");
        } catch (error) {
          console.error("Error ending call:", error);
          ws.send(JSON.stringify({
            type: "hangup",
            reason: "conversation_complete"
          }));
        }
      }, estimatedSpeakingTime);
      
    } catch (error) {
      console.error("Error generating closing response:", error);
      this.sendTextMessage(ws, FALLBACK_GOODBYE, true);
      
      // Use estimated time for fallback message too
      const fallbackSpeakingTime = Math.max(
        (FALLBACK_GOODBYE.split(' ').length / 150) * 60 * 1000,
        3000 // Minimum 3 seconds for shorter fallback
      );
      
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: "hangup",
          reason: "conversation_complete"
        }));
      }, fallbackSpeakingTime);
    }
  }

  /**
   * Generate AI response
   * @param {Object} ws - WebSocket connection
   * @param {Object} sessionData - Session data
   */
  async generateAIResponse(ws, sessionData) {
    try {
      // Check if this is a follow-up response after a tool call
      const lastMessage = sessionData.conversation[sessionData.conversation.length - 1];
      const isToolFollowUp = lastMessage?.role === 'system' && lastMessage.content.includes('executed successfully');
      
      if (!isToolFollowUp) {
        // Send a waiting message only for initial tool calls, not follow-ups
        const waitingMessages = [
          "Let me check that information for you.",
          "One moment while I look that up.",
          "Please hold on while I fetch those details.",
          "I'll check that for you right away.",
          "Just a moment while I verify that information."
        ];
        const waitingMessage = waitingMessages[Math.floor(Math.random() * waitingMessages.length)];
        this.sendTextMessage(ws, waitingMessage, true);
      }

      // Try function calling
      const context = {
        sessionData,
        twilioService,
        ws,
        studentService,
        googleSheetsService
      };
      const response = await aiService.generateResponseWithFunctions(sessionData.conversation, context);
      
      // Check if AI wants to call a tool
      if (response.toolCall) {
        await this.handleAIToolCall(ws, sessionData, response);
        return;
      }
      
      // Normal response
      if (response.content) {
        this.sendTextMessage(ws, response.content, true);
        sessionService.addMessage(ws.callSid, "assistant", response.content);
        
        // Check if AI wants to end call
        if (shouldAIEndCall(response.content)) {
          await this.handleAIInitiatedEnd(ws, sessionData);
        }
      }
      
    } catch (error) {
      console.error("Function calling failed, falling back to streaming:", error);
      await this.generateStreamingResponse(ws, sessionData);
    }
  }

  /**
   * Handle AI tool call
   * @param {Object} ws - WebSocket connection
   * @param {Object} sessionData - Session data
   * @param {Object} response - AI response with tool call
   */
  async handleAIToolCall(ws, sessionData, response) {
    const { toolCall, toolResult } = response;
    
    console.log(`AI called tool: ${toolCall.name}`, toolCall.arguments);
    console.log(`Tool result:`, toolResult);
    
    if (toolCall.name === "end_call") {
      sessionService.clearSessionTimeout(ws.callSid);
      
      // Send content if available
      if (response.content) {
        this.sendTextMessage(ws, response.content, true);
        sessionService.addMessage(ws.callSid, "assistant", response.content);
        
        // Calculate delay based on message length
        const estimatedSpeakingTime = Math.max(
          (response.content.split(' ').length / 150) * 60 * 1000, // Words per minute to milliseconds
          3000 // Minimum 3 seconds
        );
        
        console.log(`AI ending call: ${toolCall.arguments.reason} - ${toolCall.arguments.summary || 'No summary'}`);
        console.log(`Waiting ${estimatedSpeakingTime}ms for AI to finish speaking before hanging up`);
        
        // End call via API after AI finishes speaking
        setTimeout(async () => {
          try {
            await twilioService.endCall(ws.callSid);
            console.log(`AI successfully ended call ${ws.callSid} via tool call`);
            this.sendHangupConfirmation(ws, "ai_tool_call");
          } catch (error) {
            console.error("AI tool call failed to end call:", error);
            ws.send(JSON.stringify({
              type: "hangup",
              reason: "ai_tool_call"
            }));
          }
        }, estimatedSpeakingTime);
      } else {
        // No content to speak, use shorter delay
        setTimeout(async () => {
          try {
            await twilioService.endCall(ws.callSid);
            console.log(`AI successfully ended call ${ws.callSid} via tool call`);
            this.sendHangupConfirmation(ws, "ai_tool_call");
          } catch (error) {
            console.error("AI tool call failed to end call:", error);
            ws.send(JSON.stringify({
              type: "hangup",
              reason: "ai_tool_call"
            }));
          }
        }, 1000); // 1 second delay if no content
      }
    } else {
      // Handle other tool calls
      console.log(`Tool ${toolCall.name} executed with result:`, toolResult);
      // Send tool result back to conversation if needed
            if (toolResult && toolResult.success) {
        // Update user context with tool result
        const toolContext = `Tool "${toolCall.name}" executed successfully with the following information:\n${JSON.stringify(toolResult.detailedInfo, null, 2)}`;
        sessionService.addMessage(ws.callSid, "system", toolContext);

        // Generate a natural AI response using the tool result
        setTimeout(async () => {
          try {
            await this.generateAIResponse(ws, sessionData);
          } catch (error) {
            console.error("Error generating AI response after tool call:", error);
            // Fallback to direct tool response if AI fails
            this.sendTextMessage(ws, toolResult.responseInfo, true);
          }
        }, 100);
      }
    }
  }

  /**
   * Handle AI-initiated call end
   * @param {Object} ws - WebSocket connection
   * @param {Object} sessionData - Session data
   */
  async handleAIInitiatedEnd(ws, sessionData) {
    console.log("AI indicated it wants to end the call");
    
    sessionService.clearSessionTimeout(ws.callSid);

    //let assistant end the call when they say goodbye
    const closingMessage = await aiService.generateClosingResponse(sessionData.conversation);
    this.sendTextMessage(ws, closingMessage, true);
    sessionService.addMessage(ws.callSid, "assistant", closingMessage);
    
    // Calculate delay based on message length (roughly 150 words per minute speaking rate)
    const estimatedSpeakingTime = Math.max(
      (closingMessage.split(' ').length / 150) * 60 * 1000, // Words per minute to milliseconds
      4000 // Minimum 4 seconds
    );
    
    console.log(`Waiting ${estimatedSpeakingTime}ms for AI to finish speaking before hanging up`);
    
    setTimeout(async () => {
      try {
        await twilioService.endCall(ws.callSid);
        console.log(`AI successfully ended call ${ws.callSid}`);
        this.sendHangupConfirmation(ws, "ai_initiated");
      } catch (error) {
        console.error("AI failed to end call via API:", error);
        ws.send(JSON.stringify({
          type: "hangup",
          reason: "ai_initiated"
        }));
      }
    }, estimatedSpeakingTime);

  }

  /**
   * Generate streaming AI response (fallback)
   * @param {Object} ws - WebSocket connection
   * @param {Object} sessionData - Session data
   */
  async generateStreamingResponse(ws, sessionData) {
    const onToken = (token) => {
      ws.send(JSON.stringify({
        type: "text",
        token: token,
        last: false,
      }));
    };

    const onComplete = (fullResponse) => {
      ws.send(JSON.stringify({
        type: "text",
        token: "",
        last: true,
      }));
      
      sessionService.addMessage(ws.callSid, "assistant", fullResponse);
      
      // Check if AI wants to end call
      if (shouldAIEndCall(fullResponse)) {
        this.handleAIInitiatedEnd(ws, sessionData);
      }
    };

    await aiService.generateResponseStream(sessionData.conversation, onToken, onComplete);
  }

  // Helper methods for sending messages
  sendTextMessage(ws, content, isLast = false) {
    ws.send(JSON.stringify({
      type: "text",
      token: content,
      last: isLast,
    }));
  }

  sendHangupConfirmation(ws, reason) {
    ws.send(JSON.stringify({
      type: "hangup_confirmed",
      callSid: ws.callSid,
      reason: reason,
      timestamp: new Date().toISOString()
    }));
  }

  sendHangupError(ws, error, reason) {
    ws.send(JSON.stringify({
      type: "hangup_error",
      callSid: ws.callSid,
      error: error,
      reason: reason
    }));
  }

  sendErrorAcknowledgment(ws, originalMessage) {
    ws.send(JSON.stringify({
      type: "error_acknowledged",
      callSid: ws.callSid,
      originalError: {
        type: originalMessage.errorType,
        message: originalMessage.message,
        code: originalMessage.code
      },
      timestamp: new Date().toISOString()
    }));
  }

  sendErrorResponse(ws, errorMessage) {
    ws.send(JSON.stringify({
      type: "error",
      message: errorMessage,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Send initial greeting with student information
   * @param {Object} ws - WebSocket connection
   * @param {Object} student - Student information
   */
  async sendInitialGreeting(ws, student) {
    try {
      const sessionData = sessionService.getSession(ws.callSid);
      if (!sessionData) {
        console.error(`No session found for call ${ws.callSid} when sending initial greeting`);
        return;
      }

      // Create an initial prompt to trigger the AI with student's name
      const initialPrompt = `The call has just connected. Please start the conversation by greeting ${student.name} by name and reminding them about their upcoming ${student.className} class on ${student.classDate} at ${student.classTime}.`;
      
      console.log(`Sending initial greeting for student: ${student.name}`);
      
      // Add the prompt as a user message to trigger AI response
      sessionService.addMessage(ws.callSid, "user", initialPrompt);
      
      // Generate AI response
      await this.generateAIResponse(ws, sessionData);
      
    } catch (error) {
      console.error("Error sending initial greeting:", error);
      this.sendGenericGreeting(ws);
    }
  }

  /**
   * Send generic greeting when no student information is available
   * @param {Object} ws - WebSocket connection
   */
  async sendGenericGreeting(ws) {
    try {
      const sessionData = sessionService.getSession(ws.callSid);
      if (!sessionData) {
        console.error(`No session found for call ${ws.callSid} when sending generic greeting`);
        return;
      }

      // Create a generic initial prompt
      const genericPrompt = `The call has just connected. Please introduce yourself as Callum from EA Bootcamp and ask how you can help the caller today.`;
      
      console.log(`Sending generic greeting for call: ${ws.callSid}`);
      
      // Add the prompt as a user message to trigger AI response
      sessionService.addMessage(ws.callSid, "user", genericPrompt);
      
      // Generate AI response
      await this.generateAIResponse(ws, sessionData);
      
    } catch (error) {
      console.error("Error sending generic greeting:", error);
      
      // Fallback: send a direct text message
      this.sendTextMessage(ws, config.call.welcomeGreeting, true);
    }
  }
}

export default new WebSocketHandlers(); 
