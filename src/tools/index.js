import endCallTool from './endCallTool.js';
import getClassInfoTool from './getClassInfoTool.js';
import scheduleClassTool from './scheduleClassTool.js';
import updateAttendanceTool from './updateAttendanceTool.js';

/**
 * All available AI tools/functions
 */
export const AI_TOOLS = [
  endCallTool,
  getClassInfoTool,
  scheduleClassTool,
  updateAttendanceTool
];

/**
 * Get tool definitions for OpenAI function calling
 * @returns {Array} Array of tool definitions
 */
export function getToolDefinitions() {
  return AI_TOOLS.map(tool => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }));
}

/**
 * Execute a tool by name
 * @param {string} toolName - Name of the tool to execute
 * @param {Object} args - Arguments for the tool
 * @param {Object} context - Context object with session data, etc.
 * @returns {Promise<Object>} Tool execution result
 */
export async function executeTool(toolName, args, context) {
  const tool = AI_TOOLS.find(t => t.name === toolName);
  
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  
  console.log(`Executing tool: ${toolName}`, args);
  
  try {
    const result = await tool.execute(args, context);
    console.log(`Tool ${toolName} executed successfully:`, result);
    return result;
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    throw error;
  }
}

export default {
  AI_TOOLS,
  getToolDefinitions,
  executeTool
};
