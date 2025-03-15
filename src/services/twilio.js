const twilio = require('twilio');
require('dotenv').config();

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

const initiateCall = async (to) => {
    try {
        const call = await client.calls.create({
            url: 'http://demo.twilio.com/docs/voice.xml',
            to: to,
            from: process.env.TWILIO_PHONE_NUMBER
        });
        
        // Verify that we have a valid call object
        if (!call || !call.sid) {
            throw new Error('Invalid response from Twilio');
        }
        
        return {
            success: true,
            call: call
        };
    } catch (error) {
        console.error('Twilio initiateCall error:', error);
        return {
            success: false,
            error: error.message || 'Unknown error occurred',
            code: error.code,
            status: error.status
        };
    }
};

const endCall = async (callSid) => {
    try {
        const call = await client.calls(callSid)
            .update({ status: 'completed' });
            
        if (!call || !call.sid) {
            throw new Error('Invalid response from Twilio');
        }
        
        return {
            success: true,
            call: call
        };
    } catch (error) {
        console.error('Twilio endCall error:', error);
        return {
            success: false,
            error: error.message || 'Unknown error occurred',
            code: error.code,
            status: error.status
        };
    }
};

module.exports = {
    initiateCall,
    endCall
}; 