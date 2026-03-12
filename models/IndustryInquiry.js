const mongoose = require('mongoose');

const industryInquirySchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    contactNumber: {
        type: String,
        required: true,
        trim: true
    },
    solution: {
        type: String,
        required: true,
        trim: true
    },
    concern: {
        type: String,
        required: true,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('IndustryInquiry', industryInquirySchema);
