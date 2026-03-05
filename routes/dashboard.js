const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const Brand = require('../models/Brand');
const Category = require('../models/Category');
const Product = require('../models/Product');
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


// Product Creation Page
router.get('/products', authMiddleware, async (req, res) => {
    try {
        const settings = await getSettings();
        const brands = await Brand.find().sort({ name: 1 });
        const categories = await Category.find().sort({ name: 1 });
        
        res.render('product-create', { 
            title: 'Create Product - Admin Dashboard', 
            settings,
            brands,
            categories,
            dashboardTheme: req.session.dashboardTheme || 'dark',
            success: req.session.success || null,
            error: req.session.error || null
        });
        
        // Clear session messages after displaying
        delete req.session.success;
        delete req.session.error;
    } catch (error) {
        console.error('Error loading product creation page:', error);
        res.status(500).render('500', { title: 'Server Error' });
    }
});

// Brands Management Page
router.get('/products/brands', authMiddleware, async (req, res) => {
    try {
        const settings = await getSettings();
        const brands = await Brand.find().sort({ name: 1 });
        res.render('brands', { 
            title: 'Manage Brands - Admin Dashboard', 
            settings,
            brands,
            dashboardTheme: req.session.dashboardTheme || 'dark',
            success: req.session.success || null,
            error: req.session.error || null
        });
        delete req.session.success;
        delete req.session.error;
    } catch (error) {
        console.error('Error loading brands page:', error);
        res.status(500).render('500', { title: 'Server Error' });
    }
});

// Add Brand (POST)
router.post('/products/brands', authMiddleware, upload.single('logo'), async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name || !description || !req.file) {
            req.session.error = 'All fields are required, including a logo.';
            return res.redirect('/admin/products/brands');
        }
        const newBrand = new Brand({
            name,
            description,
            logo: '/uploads/' + req.file.filename
        });
        await newBrand.save();
        req.session.success = 'Brand added successfully!';
        res.redirect('/admin/products/brands');
    } catch (error) {
        console.error('Error adding brand:', error);
        req.session.error = 'Failed to add brand.';
        res.redirect('/admin/products/brands');
    }
});

// Delete Brand (POST)
router.post('/products/brands/:id/delete', authMiddleware, async (req, res) => {
    try {
        await Brand.findByIdAndDelete(req.params.id);
        req.session.success = 'Brand deleted successfully!';
        res.redirect('/admin/products/brands');
    } catch (error) {
        console.error('Error deleting brand:', error);
        req.session.error = 'Failed to delete brand.';
        res.redirect('/admin/products/brands');
    }
});

// Edit Brand Page
router.get('/products/brands/:id/edit', authMiddleware, async (req, res) => {
    try {
        const settings = await getSettings();
        const brand = await Brand.findById(req.params.id);
        if (!brand) {
            req.session.error = 'Brand not found.';
            return res.redirect('/admin/products/brands');
        }
        res.render('brand-edit', { 
            title: 'Edit Brand - Admin Dashboard', 
            settings,
            brand,
            dashboardTheme: req.session.dashboardTheme || 'dark',
            success: req.session.success || null,
            error: req.session.error || null
        });
        delete req.session.success;
        delete req.session.error;
    } catch (error) {
        console.error('Error loading brand edit page:', error);
        res.status(500).render('500', { title: 'Server Error' });
    }
});

// Update Brand (POST)
router.post('/products/brands/:id/edit', authMiddleware, upload.single('logo'), async (req, res) => {
    try {
        const { name, description } = req.body;
        const brand = await Brand.findById(req.params.id);
        if (!brand) {
            req.session.error = 'Brand not found.';
            return res.redirect('/admin/products/brands');
        }
        brand.name = name;
        brand.description = description;
        if (req.file) {
            brand.logo = '/uploads/' + req.file.filename;
        }
        await brand.save();
        req.session.success = 'Brand updated successfully!';
        res.redirect('/admin/products/brands');
    } catch (error) {
        console.error('Error updating brand:', error);
        req.session.error = 'Failed to update brand.';
        res.redirect('/admin/products/brands');
    }
});

// Categories Management Page
router.get('/products/categories', authMiddleware, async (req, res) => {
    try {
        const settings = await getSettings();
        const brands = await Brand.find().sort({ name: 1 });
        const selectedBrandId = req.query.brand;
        let categories = [];
        let selectedBrand = null;

        if (selectedBrandId) {
            selectedBrand = await Brand.findById(selectedBrandId);
            categories = await Category.find({ brand: selectedBrandId }).populate('brand');
        } else {
            categories = await Category.find().populate('brand');
        }

        res.render('categories', { 
            title: 'Manage Categories - Admin Dashboard', 
            settings,
            brands,
            categories,
            selectedBrand,
            dashboardTheme: req.session.dashboardTheme || 'dark',
            success: req.session.success || null,
            error: req.session.error || null
        });
        delete req.session.success;
        delete req.session.error;
    } catch (error) {
        console.error('Error loading categories page:', error);
        res.status(500).render('500', { title: 'Server Error' });
    }
});

// Add Category (POST)
router.post('/products/categories', authMiddleware, async (req, res) => {
    try {
        const { name, brand } = req.body;
        if (!name || !brand) {
            req.session.error = 'All fields are required.';
            return res.redirect('/admin/products/categories');
        }
        const newCategory = new Category({ name, brand });
        await newCategory.save();
        req.session.success = 'Category added successfully!';
        res.redirect(`/admin/products/categories?brand=${brand}`);
    } catch (error) {
        console.error('Error adding category:', error);
        req.session.error = 'Failed to add category.';
        res.redirect('/admin/products/categories');
    }
});

// Delete Category (POST)
router.post('/products/categories/:id/delete', authMiddleware, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        const brandId = category.brand;
        await Category.findByIdAndDelete(req.params.id);
        req.session.success = 'Category deleted successfully!';
        res.redirect(`/admin/products/categories?brand=${brandId}`);
    } catch (error) {
        console.error('Error deleting category:', error);
        req.session.error = 'Failed to delete category.';
        res.redirect('/admin/products/categories');
    }
});

// Create Product (POST)
router.post('/products', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const { name, brand, category } = req.body;
        
        if (!name || !brand || !category || !req.file) {
            req.session.error = 'All fields are required, including an image.';
            return res.redirect('/admin/products');
        }

        const newProduct = new Product({
            name,
            brand,
            category,
            image: '/uploads/' + req.file.filename
        });

        await newProduct.save();
        req.session.success = 'Product created successfully!';
        res.redirect('/admin/products');
    } catch (error) {
        console.error('Error creating product:', error);
        req.session.error = 'Failed to create product. Please try again.';
        res.redirect('/admin/products');
    }
});

module.exports = router;
