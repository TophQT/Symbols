const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const Brand = require('../models/Brand');
const BrandWeCarry = require('../models/BrandWeCarry');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Software = require('../models/Software');
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


// API to get categories by brand
router.get('/api/categories/:brandId', authMiddleware, async (req, res) => {
    try {
        const categories = await Category.find({ brand: req.params.brandId }).sort({ name: 1 });
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Product Management Page (List View)
router.get('/products', authMiddleware, async (req, res) => {
    try {
        const settings = await getSettings();
        const brands = await Brand.find().sort({ name: 1 });
        const selectedBrandId = req.query.brand;
        
        let query = {};
        if (selectedBrandId && selectedBrandId !== 'all') {
            query.brand = selectedBrandId;
        }
        
        const products = await Product.find(query)
            .populate('brand')
            .populate('category')
            .sort({ createdAt: -1 });
            
        res.render('product', { 
            title: 'Manage Products - Admin Dashboard', 
            settings,
            products,
            brands,
            selectedBrandId: selectedBrandId || 'all',
            dashboardTheme: req.session.dashboardTheme || 'dark',
            success: req.session.success || null,
            error: req.session.error || null
        });
        
        delete req.session.success;
        delete req.session.error;
    } catch (error) {
        console.error('Error loading products page:', error);
        res.status(500).render('500', { title: 'Server Error' });
    }
});

// Edit Product Page
router.get('/products/:id/edit', authMiddleware, async (req, res) => {
    try {
        const settings = await getSettings();
        const product = await Product.findById(req.params.id).populate('brand').populate('category');
        const brands = await Brand.find().sort({ name: 1 });
        
        if (!product) {
            req.session.error = 'Product not found.';
            return res.redirect('/admin/products');
        }

        // Fetch only categories belonging to the product's brand
        const categories = await Category.find({ brand: product.brand._id }).sort({ name: 1 });
        
        res.render('product-edit', { 
            title: 'Edit Product - Admin Dashboard', 
            settings,
            product,
            brands,
            categories,
            dashboardTheme: req.session.dashboardTheme || 'dark',
            success: req.session.success || null,
            error: req.session.error || null
        });
        
        delete req.session.success;
        delete req.session.error;
    } catch (error) {
        console.error('Error loading product edit page:', error);
        res.status(500).render('500', { title: 'Server Error' });
    }
});

// Update Product (POST)
router.post('/products/:id/edit', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const { name, brand, category } = req.body;
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            req.session.error = 'Product not found.';
            return res.redirect('/admin/products');
        }

        product.name = name;
        product.brand = brand;
        product.category = category;
        
        if (req.file) {
            product.image = '/uploads/' + req.file.filename;
        }

        await product.save();
        req.session.success = 'Product updated successfully!';
        res.redirect('/admin/products');
    } catch (error) {
        console.error('Error updating product:', error);
        req.session.error = 'Failed to update product. Please try again.';
        res.redirect(`/admin/products/${req.params.id}/edit`);
    }
});

// Product Creation Page
router.get('/products/create', authMiddleware, async (req, res) => {
    try {
        const settings = await getSettings();
        const brands = await Brand.find().sort({ name: 1 });
        // Initially no categories, client-side will fetch them based on brand selection
        const categories = []; 
        
        res.render('product-create', { 
            title: 'Create Product - Admin Dashboard', 
            settings,
            brands,
            categories,
            dashboardTheme: req.session.dashboardTheme || 'dark',
            success: req.session.success || null,
            error: req.session.error || null
        });
        
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
            return res.redirect('/admin/products/create');
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
        res.redirect('/admin/products/create');
    }
});

// Delete Product (POST)
router.post('/products/:id/delete', authMiddleware, async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        req.session.success = 'Product deleted successfully!';
        res.redirect('/admin/products');
    } catch (error) {
        console.error('Error deleting product:', error);
        req.session.error = 'Failed to delete product.';
        res.redirect('/admin/products');
    }
});

// Brands We Carry Management (GET)
router.get('/brandswecarry', authMiddleware, async (req, res) => {
    try {
        const settings = await getSettings();
        const brands = await BrandWeCarry.find().sort({ createdAt: -1 });
        
        res.render('brandswecarry', { 
            title: 'Manage Brands We Carry - Admin Dashboard', 
            settings,
            brands,
            dashboardTheme: req.session.dashboardTheme || 'dark',
            success: req.session.success || null,
            error: req.session.error || null
        });
        delete req.session.success;
        delete req.session.error;
    } catch (error) {
        console.error('Error loading brands we carry page:', error);
        res.status(500).render('500', { title: 'Server Error' });
    }
});

// Add Brand We Carry (POST)
router.post('/brandswecarry', authMiddleware, upload.single('logo'), async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name || !req.file) {
            req.session.error = 'Brand name and logo are required.';
            return res.redirect('/admin/brandswecarry');
        }

        const newBrand = new BrandWeCarry({
            name,
            logo: '/uploads/' + req.file.filename,
            description: description || ''
        });

        await newBrand.save();
        req.session.success = 'Brand logo uploaded successfully!';
        res.redirect('/admin/brandswecarry');
    } catch (error) {
        console.error('Error adding brand logo:', error);
        req.session.error = 'Failed to upload brand logo.';
        res.redirect('/admin/brandswecarry');
    }
});

// Edit Brand We Carry Page (GET)
router.get('/brandswecarry/:id/edit', authMiddleware, async (req, res) => {
    try {
        const settings = await getSettings();
        const brand = await BrandWeCarry.findById(req.params.id);
        
        if (!brand) {
            req.session.error = 'Brand not found.';
            return res.redirect('/admin/brandswecarry');
        }

        res.render('brandswecarry-edit', { 
            title: 'Edit Brand We Carry - Admin Dashboard', 
            settings,
            brand,
            dashboardTheme: req.session.dashboardTheme || 'dark',
            success: req.session.success || null,
            error: req.session.error || null
        });
        delete req.session.success;
        delete req.session.error;
    } catch (error) {
        console.error('Error loading edit brand we carry page:', error);
        res.status(500).render('500', { title: 'Server Error' });
    }
});

// Update Brand We Carry (POST)
router.post('/brandswecarry/:id', authMiddleware, upload.single('logo'), async (req, res) => {
    try {
        const { name, description } = req.body;
        const brand = await BrandWeCarry.findById(req.params.id);

        if (!brand) {
            req.session.error = 'Brand not found.';
            return res.redirect('/admin/brandswecarry');
        }

        const updateData = {
            name,
            description: description || ''
        };

        if (req.file) {
            // Delete old logo file if necessary (optional, but good practice)
            // For now, just update the path
            updateData.logo = '/uploads/' + req.file.filename;
        }

        await BrandWeCarry.findByIdAndUpdate(req.params.id, updateData);
        req.session.success = 'Brand logo updated successfully!';
        res.redirect('/admin/brandswecarry');
    } catch (error) {
        console.error('Error updating brand logo:', error);
        req.session.error = 'Failed to update brand logo.';
        res.redirect(`/admin/brandswecarry/${req.params.id}/edit`);
    }
});

// Delete Brand We Carry (POST)
router.post('/brandswecarry/:id/delete', authMiddleware, async (req, res) => {
    try {
        await BrandWeCarry.findByIdAndDelete(req.params.id);
        req.session.success = 'Brand logo deleted successfully!';
        res.redirect('/admin/brandswecarry');
    } catch (error) {
        console.error('Error deleting brand logo:', error);
        req.session.error = 'Failed to delete brand logo.';
        res.redirect('/admin/brandswecarry');
    }
});

// Software Management Page (GET)
router.get('/software', authMiddleware, async (req, res) => {
    try {
        const settings = await getSettings();
        const software = await Software.find().sort({ createdAt: -1 });
        
        res.render('software', { 
            title: 'Manage Software - Admin Dashboard', 
            settings,
            software,
            dashboardTheme: req.session.dashboardTheme || 'dark',
            success: req.session.success || null,
            error: req.session.error || null
        });
        
        delete req.session.success;
        delete req.session.error;
    } catch (error) {
        console.error('Error loading software page:', error);
        res.status(500).render('500', { title: 'Server Error' });
    }
});

// Add Software (POST)
router.post('/software', authMiddleware, upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 }
]), async (req, res) => {
    try {
        const { name, description, youtubeUrl, websiteLink } = req.body;
        
        if (!name || !description || !websiteLink) {
            req.session.error = 'Name, description, and website link are required.';
            return res.redirect('/admin/software');
        }

        if (!req.files.image) {
            req.session.error = 'Software image is required.';
            return res.redirect('/admin/software');
        }

        const newSoftware = new Software({
            name,
            description,
            image: '/uploads/' + req.files.image[0].filename,
            video: req.files.video ? '/uploads/' + req.files.video[0].filename : null,
            youtubeUrl: youtubeUrl || null,
            websiteLink
        });

        await newSoftware.save();
        req.session.success = 'Software added successfully!';
        res.redirect('/admin/software');
    } catch (error) {
        console.error('Error adding software:', error);
        req.session.error = 'Failed to add software. Please try again.';
        res.redirect('/admin/software');
    }
});

// Edit Software Page (GET)
router.get('/software/:id/edit', authMiddleware, async (req, res) => {
    try {
        const settings = await getSettings();
        const software = await Software.findById(req.params.id);
        
        if (!software) {
            req.session.error = 'Software not found.';
            return res.redirect('/admin/software');
        }

        res.render('software-edit', { 
            title: 'Edit Software - Admin Dashboard', 
            settings,
            software,
            dashboardTheme: req.session.dashboardTheme || 'dark',
            success: req.session.success || null,
            error: req.session.error || null
        });
        
        delete req.session.success;
        delete req.session.error;
    } catch (error) {
        console.error('Error loading edit software page:', error);
        res.status(500).render('500', { title: 'Server Error' });
    }
});

// Update Software (POST)
router.post('/software/:id/edit', authMiddleware, upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 }
]), async (req, res) => {
    try {
        const { name, description, youtubeUrl, websiteLink } = req.body;
        const software = await Software.findById(req.params.id);

        if (!software) {
            req.session.error = 'Software not found.';
            return res.redirect('/admin/software');
        }

        const updateData = {
            name,
            description,
            youtubeUrl: youtubeUrl || null,
            websiteLink
        };

        if (req.files.image) {
            updateData.image = '/uploads/' + req.files.image[0].filename;
        }

        if (req.files.video) {
            updateData.video = '/uploads/' + req.files.video[0].filename;
        }

        await Software.findByIdAndUpdate(req.params.id, updateData);
        req.session.success = 'Software updated successfully!';
        res.redirect('/admin/software');
    } catch (error) {
        console.error('Error updating software:', error);
        req.session.error = 'Failed to update software.';
        res.redirect(`/admin/software/${req.params.id}/edit`);
    }
});

// Delete Software (POST)
router.post('/software/:id/delete', authMiddleware, async (req, res) => {
    try {
        await Software.findByIdAndDelete(req.params.id);
        req.session.success = 'Software deleted successfully!';
        res.redirect('/admin/software');
    } catch (error) {
        console.error('Error deleting software:', error);
        req.session.error = 'Failed to delete software.';
        res.redirect('/admin/software');
    }
});

module.exports = router;
