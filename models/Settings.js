const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    siteName: {
        type: String,
        default: 'Symbol Sciences',
        trim: true
    },
    logo: {
        type: String,
        default: null
    },
    defaultLogo: {
        type: String,
        default: '/images/default-logo.svg'
    },
    contactEmail: {
        type: String,
        default: '',
        trim: true
    },
    phone: {
        type: String,
        default: '',
        trim: true
    },
    address: {
        type: String,
        default: '',
        trim: true
    },
    description: {
        type: String,
        default: '',
        trim: true
    }
}, {
    timestamps: true
});

// Ensure only one settings document exists
settingsSchema.statics.getSettings = async function() {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({
            siteName: 'Symbol Sciences',
            logo: null,
            defaultLogo: '/images/default-logo.svg',
            contactEmail: '',
            phone: '',
            address: '',
            description: ''
        });
    }
    return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
