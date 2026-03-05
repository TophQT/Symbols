const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');

// Helper to get site settings
const getSettings = async () => {
    try {
        return await Settings.getSettings();
    } catch (error) {
        console.error('Error fetching settings:', error);
        return { siteName: 'Symbol Sciences', logo: null, defaultLogo: '/images/default-logo.svg' };
    }
};

// Apply dashboard theme middleware to all dashboard routes
router.use((req, res, next) => {
    // Check if dashboard theme is specified in query params or session
    const dashboardTheme = req.query.dashboardTheme || req.session.dashboardTheme || 'dark';
    
    // Validate theme value
    const validThemes = ['light', 'dark'];
    const currentTheme = validThemes.includes(dashboardTheme) ? dashboardTheme : 'dark';
    
    // Store in session
    req.session.dashboardTheme = currentTheme;
    
    // Make dashboard theme available to templates
    res.locals.dashboardTheme = currentTheme;
    
    next();
});

// Login Page
router.get('/login', (req, res) => {
    if (req.session.admin) {
        return res.redirect('/admin/dashboard');
    }
    res.render('login', { title: 'Login - Admin Dashboard', error: null });
});

// Login Logic
router.post('/login', (req, res) => {
    const { email, password } = req.body;
    const adminEmail = 'admin@gmail.com';
    const adminPassword = 'admin@123';

    if (email === adminEmail && password === adminPassword) {
        req.session.admin = true;
        res.redirect('/admin/dashboard');
    } else {
        res.render('login', { 
            title: 'Login - Admin Dashboard', 
            error: 'Invalid email or password' 
        });
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destroy error:', err);
        }
        res.redirect('/admin/login');
    });
});

// Dashboard Theme Toggle
router.get('/dashboard-theme/:theme', authMiddleware, (req, res) => {
    const { theme } = req.params;
    const validThemes = ['light', 'dark'];
    
    if (validThemes.includes(theme)) {
        req.session.dashboardTheme = theme;
    }
    
    // Redirect back to referring page or dashboard
    const referer = req.get('Referer') || '/admin/dashboard';
    res.redirect(referer);
});

// Admin Dashboard
router.get('/dashboard', authMiddleware, async (req, res) => {
    try {
        const settings = await getSettings();
        res.render('dashboard', { 
            title: 'Admin Dashboard', 
            settings,
            dashboardTheme: req.session.dashboardTheme || 'dark'
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).render('500', { title: 'Server Error' });
    }
});

// Admin Settings Page
router.get('/settings', authMiddleware, async (req, res) => {
    try {
        const settings = await getSettings();
        res.render('admin-settings', { 
            title: 'Website Settings - Admin Dashboard', 
            settings,
            dashboardTheme: req.session.dashboardTheme || 'dark',
            success: req.session.success || null,
            error: req.session.error || null
        });
        // Clear session messages after displaying
        delete req.session.success;
        delete req.session.error;
    } catch (error) {
        console.error('Error loading settings:', error);
        res.status(500).render('500', { title: 'Server Error' });
    }
});

// Update Settings (Logo Upload and General Settings)
router.post('/settings', authMiddleware, upload.single('logo'), async (req, res) => {
    try {
        const settings = await Settings.getSettings();
        
        // Handle logo removal
        if (req.body.removeLogo === 'true') {
            settings.logo = null;
            await settings.save();
            req.session.success = 'Logo removed successfully!';
        } else if (req.file) {
            // Update logo path
            settings.logo = '/uploads/' + req.file.filename;
            await settings.save();
            req.session.success = 'Logo updated successfully!';
        }
        
        // Update general settings
        if (req.body.siteName) {
            settings.siteName = req.body.siteName;
        }
        if (req.body.contactEmail) {
            settings.contactEmail = req.body.contactEmail;
        }
        if (req.body.phone) {
            settings.phone = req.body.phone;
        }
        if (req.body.address) {
            settings.address = req.body.address;
        }
        if (req.body.description) {
            settings.description = req.body.description;
        }
        
        // Save settings if any changes were made
        if (req.body.siteName || req.body.contactEmail || req.body.phone || req.body.address || req.body.description) {
            await settings.save();
            if (!req.session.success) {
                req.session.success = 'Settings updated successfully!';
            }
        }
        
        // Handle case where no file was uploaded but form was submitted
        if (!req.file && !req.body.removeLogo && !req.session.success) {
            req.session.error = 'Please select a valid image file or update other settings.';
        }
        
        res.redirect('/admin/settings');
    } catch (error) {
        console.error('Error updating settings:', error);
        req.session.error = 'Failed to update settings. Please try again.';
        res.redirect('/admin/settings');
    }
});

module.exports = router;
