const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    phoneNumber: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    notes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Create a compound index to ensure unique phone numbers per user
contactSchema.index({ userId: 1, phoneNumber: 1 }, { unique: true });

module.exports = mongoose.model('Contact', contactSchema); 