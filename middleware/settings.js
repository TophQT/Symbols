const Settings = require('../models/Settings');

// Middleware to make settings globally available to all templates
const globalSettings = async (req, res, next) => {
    try {
        // Get settings from database
        const settings = await Settings.getSettings();
        
        // Make settings available to all templates as locals
        res.locals.settings = settings;
        
        next();
    } catch (error) {
        console.error('Error loading global settings:', error);
        // Fallback settings if database fails
        res.locals.settings = {
            siteName: 'Symbol Sciences',
            logo: null,
            defaultLogo: '/images/default-logo.png'
        };
        next();
    }
};

module.exports = globalSettings;
