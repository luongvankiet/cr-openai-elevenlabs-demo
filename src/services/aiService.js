import OpenAI from "openai";
import config from "../config/index.js";
import { CLOSING_PROMPT } from "../constants/prompts.js";
import { getToolDefinitions, executeTool } from "../tools/index.js";

class AIService {
  constructor() {
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
  }

  /**
   * Generate AI response with streaming
   * @param {Array} conversation - Conversation history
   * @param {Function} onToken - Callback for each token
   * @param {Function} onComplete - Callback when complete
   * @returns {Promise<string>} Full response
   */
  async generateResponseStream(conversation, onToken, onComplete) {
    const stream = await this.openai.chat.completions.create({
      model: config.openai.model,
      messages: conversation,
      stream: true,
    });

    const assistantSegments = [];
    console.log("Received response chunks:");
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      console.log(content);
      
      if (content && onToken) {
        onToken(content);
      }
      
      assistantSegments.push(content);
    }

    const fullResponse = assistantSegments.join("");
    
    if (onComplete) {
      onComplete(fullResponse);
    }

    console.log("Assistant response complete.");
    return fullResponse;
  }

  /**
   * Generate AI response with function calling capability
   * @param {Array} conversation - Conversation history
   * @param {Object} context - Context for tool execution (sessionData, services, etc.)
   * @returns {Promise<Object>} Response with content and tool call info
   */
  async generateResponseWithFunctions(conversation, context = {}) {
    // Get available tools for the AI
    const tools = getToolDefinitions();

    const response = await this.openai.chat.completions.create({
      model: config.openai.model,
      messages: conversation,
      tools: tools,
      tool_choice: "auto"
    });

    const message = response.choices[0].message;
    
    let toolResult = null;
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      const toolName = toolCall.function.name;
      const toolArgs = JSON.parse(toolCall.function.arguments);
      
      try {
        toolResult = await executeTool(toolName, toolArgs, context);
      } catch (error) {
        console.error(`Error executing tool ${toolName}:`, error);
        toolResult = {
          success: false,
          error: error.message,
          toolName,
          toolArgs
        };
      }
    }
    
    return {
      content: message.content,
      toolCall: message.tool_calls ? {
        id: message.tool_calls[0].id,
        name: message.tool_calls[0].function.name,
        arguments: JSON.parse(message.tool_calls[0].function.arguments)
      } : null,
      toolResult
    };
  }

  /**
   * Generate a closing response
   * @param {Array} conversation - Conversation history
   * @returns {Promise<string>} Closing message
   */
  async generateClosingResponse(conversation) {
    const response = await this.openai.chat.completions.create({
      model: config.openai.model,
      messages: [...conversation, CLOSING_PROMPT],
      max_tokens: config.openai.maxTokens,
      temperature: config.openai.temperature
    });
    
    return response.choices[0].message.content;
  }
}

export default new AIService(); 
