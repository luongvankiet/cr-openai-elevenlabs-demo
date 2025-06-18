import twilio from "twilio";
import config from "../config/index.js";

class TwilioService {
  constructor() {
    this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
  }

  /**
   * Make an outbound call
   * @param {string} to - Phone number to call
   * @param {string} from - Phone number to call from (optional)
   * @param {string} twimlUrl - URL for TwiML instructions
   * @returns {Promise<Object>} Call object
   */
  async makeCall(to, from = null, twimlUrl) {
    const fromNumber = from || config.twilio.fromNumber;
    
    if (!fromNumber) {
      throw new Error("Missing 'from' phone number");
    }

    console.log(`Making outbound call from ${fromNumber} to ${to}`);
    
    const call = await this.client.calls.create({
      to: to,
      from: fromNumber,
      url: twimlUrl,
      method: 'POST'
    });

    return call;
  }

  /**
   * Get call details
   * @param {string} callSid - Call SID
   * @returns {Promise<Object>} Call details
   */
  async getCallDetails(callSid) {
    const call = await this.client.calls(callSid).fetch();
    return {
      sid: call.sid,
      status: call.status,
      duration: call.duration,
      startTime: call.startTime,
      endTime: call.endTime,
      to: call.to,
      from: call.from,
      price: call.price,
      priceUnit: call.priceUnit
    };
  }

  /**
   * End a call
   * @param {string} callSid - Call SID
   * @returns {Promise<Object>} Updated call object
   */
  async endCall(callSid) {
    try {
      const call = await this.client.calls(callSid).update({
        status: 'completed'
      });
      console.log(`Call ${callSid} ended via Twilio API`);
      return call;
    } catch (error) {
      console.error(`Failed to end call ${callSid}:`, error);
      throw error;
    }
  }

  /**
   * Generate TwiML response
   * @param {string} wsUrl - WebSocket URL
   * @param {string} welcomeGreeting - Welcome message
   * @returns {string} TwiML XML
   */
  generateTwiML(wsUrl, welcomeGreeting) {
    return `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Connect>
        <ConversationRelay url="${wsUrl}" ttsProvider="ElevenLabs" voice="ZF6FPAbjXT4488VcRRnw-flash_v2_5-1.2_1.0_1.0" elevenlabsTextNormalization="on" />
      </Connect>
    </Response>`;
  }
}

export default new TwilioService(); 
