# EEA Bootcamp Reminder Bot - Serverless Functions

This is a Twilio-powered reminder bot system converted to Vercel serverless functions for easy deployment.

## Features

- **AI-Powered Calls**: Uses OpenAI GPT-4 for natural conversation during reminder calls
- **Google Sheets Integration**: Automatically fetches student data and class schedules
- **Twilio Integration**: Handles phone calls and TwiML responses
- **Serverless Architecture**: Deployed as Vercel serverless functions for scalability

## API Endpoints

### Call Management

- `GET /health` - Health check endpoint
- `POST /twiml` - TwiML endpoint for incoming calls
- `POST /api/call` - Make outbound calls
- `GET /api/call/[callSid]` - Get call details
- `POST /api/call/[callSid]/hangup` - End a specific call
- `GET /api/sessions` - Get active sessions
- `GET /api/session/[callSid]` - Get session details

### Student Management

- `GET /api/call/students` - Get all students
- `GET /api/call/students/upcoming` - Get students with upcoming classes
- `GET /api/call/students/reminders` - Get students needing reminders
- `GET /api/call/students/stats` - Get student statistics
- `POST /api/call/reminder-calls` - Make reminder calls to all students
- `POST /api/call/student/[studentId]/remind` - Make reminder call to specific student

### Google Sheets

- `GET /api/sheets/data` - Fetch raw sheet data
- `GET /api/sheets/objects` - Fetch sheet data as objects
- `POST /api/sheets/fetch` - Fetch sheet data via POST

## Environment Variables

Set these in your Vercel dashboard or `.env.local` file:

```bash
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=your_twilio_phone_number
OPENAI_API_KEY=your_openai_api_key
GOOGLE_SHEETS_API_KEY=your_google_sheets_api_key
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
GOOGLE_PRIVATE_KEY=your_private_key
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id
```

## Deployment to Vercel

### 1. Install Vercel CLI

```bash
npm i -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Deploy

```bash
vercel
```

### 4. Set Environment Variables

In your Vercel dashboard, go to Settings > Environment Variables and add all the required environment variables.

### 5. Configure Twilio Webhook

Set your Twilio webhook URL to: `https://your-vercel-domain.vercel.app/twiml`

## Local Development

```bash
# Install dependencies
npm install

# Start development server
vercel dev
```

## Important Notes

⚠️ **WebSocket Limitations**: Vercel serverless functions don't support persistent WebSocket connections. If your application requires real-time WebSocket functionality, consider using Vercel's Edge Runtime or deploying to a different platform that supports WebSockets.

## Project Structure

```
api/
├── health.js                    # Health check endpoint
├── twiml.js                     # TwiML generation
├── sessions.js                  # Session management
├── call/
│   ├── index.js                 # Call management
│   ├── [callSid].js            # Call details & hangup
│   ├── reminder-calls.js        # Batch reminder calls
│   ├── students/
│   │   ├── index.js            # All students
│   │   ├── upcoming.js         # Students with upcoming classes
│   │   ├── reminders.js        # Students needing reminders
│   │   └── stats.js            # Student statistics
│   └── student/[studentId]/
│       └── remind.js           # Individual student reminder
├── sheets/
│   ├── data.js                 # Sheet data
│   ├── objects.js              # Sheet objects
│   └── fetch.js                # Sheet fetch POST
└── session/
    └── [callSid].js            # Session details

src/                            # Original source code (reused)
├── controllers/
├── services/
├── models/
└── ...
```

## Migration from Express/Fastify

This project has been converted from a Fastify-based server to Vercel serverless functions. Each API endpoint is now a separate serverless function, providing better scalability and cost efficiency.
