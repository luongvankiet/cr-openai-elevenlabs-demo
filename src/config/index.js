import dotenv from "dotenv";
dotenv.config();

const config = {
  // Server Configuration
  port: process.env.PORT || 8080,
  domain: process.env.NGROK_URL,
  
  // Twilio Configuration
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_FROM_NUMBER,
  },
  
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4o-mini",
    maxTokens: 50,
    temperature: 0.7,
  },
  
  googleSheets: {
    apiKey: process.env.GOOGLE_SHEETS_API_KEY,
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: process.env.GOOGLE_PRIVATE_KEY,
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
  },
      
  // Call Configuration
  call: {
    welcomeGreeting: "Hi! This is Anmol from the EA Bootcamp. I'm calling to remind you about your upcoming class.",
    timeoutDuration: 5 * 60 * 1000, // 5 minutes
    hangupDelay: 7000, // 2 seconds
    functionCallDelay: 1500, // 1.5 seconds
  },
  
  // WebSocket Configuration
  websocket: {
    url: function() {
      return `wss://${this.domain}/ws`;
    }
  }
};

// WebSocket URL with proper context binding
config.websocket.url = config.websocket.url.bind(config);

export default config;
