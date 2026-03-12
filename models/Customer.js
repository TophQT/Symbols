const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    logo: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: [
            'Manufacturing',
            'Retail',
            'Construction',
            'Banking',
            'Transportation & Logistics',
            'Health Care',
            'Distribution',
            'Agriculture',
            'Others'
        ]
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Customer', customerSchema);
