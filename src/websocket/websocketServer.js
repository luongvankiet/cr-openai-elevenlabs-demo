import websocketHandlers from "../handlers/websocketHandlers.js";

/**
 * Setup WebSocket server with message routing
 * @param {Object} fastify - Fastify instance
 */
export default async function setupWebSocket(fastify) {
  await fastify.register(async function (fastify) {
    fastify.get("/ws", { websocket: true }, (connection, req) => {
      console.log("New WebSocket connection established");

      connection.on("message", async (data) => {
        try {
          const message = JSON.parse(data);
          console.log(`Received WebSocket message: ${message.type}`, message);

          // Route message to appropriate handler
          switch (message.type) {
            case "setup":
              await websocketHandlers.handleSetup(connection, message);
              break;

            case "prompt":
              await websocketHandlers.handlePrompt(connection, message);
              break;

            case "interrupt":
              websocketHandlers.handleInterrupt(connection, message);
              break;

            case "hangup":
              await websocketHandlers.handleHangup(connection, message);
              break;

            case "error":
              await websocketHandlers.handleError(connection, message);
              break;

            default:
              console.warn("Unknown message type received:", message.type);
              connection.send(JSON.stringify({
                type: "error",
                message: `Unknown message type: ${message.type}`,
                timestamp: new Date().toISOString()
              }));
              break;
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
          connection.send(JSON.stringify({
            type: "error",
            message: "Failed to process message",
            details: error.message,
            timestamp: new Date().toISOString()
          }));
        }
      });

      connection.on("close", () => {
        websocketHandlers.handleClose(connection);
      });

      connection.on("error", (error) => {
        console.error("WebSocket error:", error);
        websocketHandlers.handleClose(connection);
      });
    });
  });

  console.log("WebSocket server setup complete");
} 
