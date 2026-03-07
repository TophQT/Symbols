const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Settings = require('../models/Settings');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');

const Product = require('../models/Product');
const Brand = require('../models/Brand');
const Category = require('../models/Category');

// Helper to get site settings
const getSettings = async () => {
    try {
        return await Settings.getSettings();
    } catch (error) {
        console.error('Error fetching settings:', error);
        return { siteName: 'Symbol Sciences', logo: null, defaultLogo: '/images/default-logo.png' };
    }
};

// Admin Dashboard
router.get('/admin/dashboard', authMiddleware, async (req, res) => {
    const settings = await getSettings();
    res.render('dashboard', { title: 'Admin Dashboard', settings });
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

// Home Page
router.get('/', async (req, res) => {
    const settings = await getSettings();
    res.render('index', { title: 'Symbol Sciences - Empowering Innovation', settings });
});

// Products Page
router.get('/products', async (req, res) => {
    try {
        const settings = await getSettings();
        const { brand, category } = req.query;
        
        // Build query
        let query = {};
        if (brand && brand !== 'all') {
            query.brand = brand;
        }
        if (category && category !== 'all') {
            query.category = category;
        }

        // Fetch products, brands, and categories
        const products = await Product.find(query)
            .populate('brand')
            .populate('category')
            .sort({ createdAt: -1 });
        
        const brands = await Brand.find().sort({ name: 1 });
        
        // Find the selected brand object for logo display
        const selectedBrandObject = brand && brand !== 'all' ? brands.find(b => b._id.toString() === brand) : null;
        
        // Fetch categories (optionally filter by brand if selected)
        let categoryQuery = {};
        if (brand && brand !== 'all') {
            categoryQuery.brand = brand;
        }
        const categories = await Category.find(categoryQuery).sort({ name: 1 });

        res.render('products', { 
            title: 'Our Products - Symbol Sciences', 
            settings,
            products,
            brands,
            categories,
            selectedBrand: brand || 'all',
            selectedCategory: category || 'all',
            selectedBrandObject
        });
    } catch (error) {
        console.error('Error loading products page:', error);
        res.status(500).render('500', { title: 'Server Error', settings: await getSettings() });
    }
});

// Services & Solutions Page
router.get('/services', async (req, res) => {
    const settings = await getSettings();
    res.render('services', { title: 'Services & Solutions - Symbol Sciences', settings });
});

// Updates Page
router.get('/updates', async (req, res) => {
    const settings = await getSettings();
    res.render('updates', { title: 'Latest Updates - Symbol Sciences', settings });
});

// About Us Page
router.get('/about', async (req, res) => {
    const settings = await getSettings();
    res.render('about', { title: 'About Us - Symbol Sciences', settings });
});

// Contact Us Page
router.get('/contact', async (req, res) => {
    const settings = await getSettings();
    res.render('contact', { title: 'Contact Us - Symbol Sciences', settings });
});

// Contact Form Submission
router.post('/contact', async (req, res) => {
    try {
        const { name, email, company, phone, message } = req.body;
        
        // Validation handled by Mongoose schema, but extra check here
        if (!name || !email || !message) {
            return res.status(400).json({ success: false, message: 'Please fill in all required fields.' });
        }

        const newMessage = new Message({
            name,
            email,
            company,
            phone,
            message
        });

        await newMessage.save();
        console.log('Message saved to database:', newMessage);
        res.json({ success: true, message: 'Thank you for contacting us! We have received your message.' });
    } catch (err) {
        console.error('Database Error:', err);
        res.status(500).json({ success: false, message: 'Internal system error. Please try again later.' });
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destroy error:', err);
        }
        res.redirect('/login');
    });
});

// Admin Logout (for dashboard)
router.get('/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destroy error:', err);
        }
        res.redirect('/login');
    });
});

// Admin Settings Page
router.get('/admin/settings', authMiddleware, async (req, res) => {
    try {
        const settings = await getSettings();
        res.render('admin-settings', { 
            title: 'Website Settings - Admin Dashboard', 
            settings,
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

// Update Settings (Logo Upload)
router.post('/admin/settings', authMiddleware, upload.single('logo'), async (req, res) => {
    try {
        const settings = await Settings.getSettings();
        
        if (req.file) {
            // Update logo path
            settings.logo = '/uploads/' + req.file.filename;
            await settings.save();
            req.session.success = 'Logo updated successfully!';
        } else {
            req.session.error = 'Please select a valid image file.';
        }
        
        res.redirect('/admin/settings');
    } catch (error) {
        console.error('Error updating settings:', error);
        req.session.error = 'Failed to update logo. Please try again.';
        res.redirect('/admin/settings');
    }
});

module.exports = router;
