import Fastify from "fastify";
import fastifyWs from "@fastify/websocket";
import fastifyFormBody from "@fastify/formbody";
import config from "./config/index.js";
import callRoutes from "./routes/callRoutes.js";
import sheetsRoutes from "./routes/sheetsRoutes.js";
import setupWebSocket from "./websocket/websocketServer.js";
import sessionService from "./services/sessionService.js";

class Application {
  constructor() {
    this.fastify = null;
    this.setupServer();
  }

  /**
   * Setup Fastify server with plugins and routes
   */
  setupServer() {
    this.fastify = Fastify({
      logger: {
        level: process.env.LOG_LEVEL || 'info'
      }
    });

    this.fastify.register(fastifyFormBody);
    this.fastify.register(fastifyWs);

    // Register plugins
    // this.registerPlugins();
    
    // Register routes
    this.registerRoutes();
    
    // Setup WebSocket
    this.setupWebSocket(this.fastify);
    
    // Setup error handlers
    this.setupErrorHandlers();
    
    // Setup cleanup handlers
    this.setupCleanupHandlers();
  }

  /**
   * Register Fastify plugins
   */
  async registerPlugins() {
   
  }

  /**
   * Register application routes
   */
  async registerRoutes() {
    await this.fastify.register(callRoutes);
    await this.fastify.register(sheetsRoutes);
  }

  /**
   * Setup WebSocket server
   */
  async setupWebSocket(fastify) {
    await setupWebSocket(fastify);
  }

  /**
   * Setup error handlers
   */
  setupErrorHandlers() {
    // Global error handler
    this.fastify.setErrorHandler((error, request, reply) => {
      console.error("Unhandled error:", error);
      
      reply.code(500).send({
        error: "Internal Server Error",
        message: process.env.NODE_ENV === 'development' ? error.message : "Something went wrong",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString()
      });
    });

    // 404 handler
    this.fastify.setNotFoundHandler((request, reply) => {
      reply.code(404).send({
        error: "Not Found",
        message: `Route ${request.method} ${request.url} not found`,
        code: "NOT_FOUND",
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Setup cleanup handlers for graceful shutdown
   */
  setupCleanupHandlers() {
    const gracefulShutdown = async (signal) => {
      console.log(`Received ${signal}. Starting graceful shutdown...`);
      
      try {
        // Clean up expired sessions
        const cleanedSessions = sessionService.cleanupExpiredSessions(0); // Clean all
        console.log(`Cleaned up ${cleanedSessions} sessions`);
        
        // Close server
        await this.fastify.close();
        console.log("Server closed successfully");
        
        process.exit(0);
      } catch (error) {
        console.error("Error during shutdown:", error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }

  /**
   * Start the server
   */
  async start() {
    try {
      await this.fastify.listen({ 
        port: config.port,
        host: '0.0.0.0'
      });
      
      // console.log(`🚀 Server running at http://localhost:${config.port}`);
      // console.log(`🔌 WebSocket endpoint: wss://${config.domain}/ws`);
      // console.log(`📞 TwiML endpoint: https://${config.domain}/twiml`);
      // console.log(`💡 Health check: http://localhost:${config.port}/health`);
      
      // Setup periodic session cleanup (every hour)
      setInterval(() => {
        const cleanedCount = sessionService.cleanupExpiredSessions();
        if (cleanedCount > 0) {
          console.log(`Cleaned up ${cleanedCount} expired sessions`);
        }
      }, 60 * 60 * 1000); // 1 hour
      
    } catch (error) {
      console.error("Error starting server:", error);
      process.exit(1);
    }
  }

  /**
   * Get Fastify instance (for testing)
   */
  getApp() {
    return this.fastify;
  }
}

export default Application; 
