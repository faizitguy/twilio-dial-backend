const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    callSid: {
        type: String,
        required: true,
        unique: true,
        sparse: true  // This allows multiple null values
    },
    status: {
        type: String,
        required: true,
        enum: ['queued', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer', 'canceled']
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date
    },
    duration: {
        type: Number
    }
}, {
    timestamps: true
});

// Drop any existing indexes to avoid conflicts
callSchema.pre('save', async function(next) {
    try {
        await mongoose.connection.collections.calls.dropIndexes();
    } catch (error) {
        // Ignore error if no indexes exist
    }
    next();
});

// Create a compound index on userId and callSid
callSchema.index({ userId: 1, callSid: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Call', callSchema); 