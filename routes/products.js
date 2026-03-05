const express = require('express');
const router = express.Router();
const Brand = require('../models/Brand');
const Category = require('../models/Category');
const Product = require('../models/Product');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

// Apply dashboard theme middleware to all product routes
router.use((req, res, next) => {
    const dashboardTheme = req.query.dashboardTheme || req.session.dashboardTheme || 'dark';
    const validThemes = ['light', 'dark'];
    const currentTheme = validThemes.includes(dashboardTheme) ? dashboardTheme : 'dark';
    req.session.dashboardTheme = currentTheme;
    res.locals.dashboardTheme = currentTheme;
    next();
});

// ============ BRAND ROUTES ============

// Display all brands
router.get('/brands', authMiddleware, async (req, res) => {
    try {
        const brands = await Brand.find().sort({ createdAt: -1 });
        res.render('brands', { 
            title: 'Product Brands', 
            brands,
            dashboardTheme: req.session.dashboardTheme || 'dark',
            success: req.session.success || null,
            error: req.session.error || null
        });
        delete req.session.success;
        delete req.session.error;
    } catch (error) {
        console.error('Error fetching brands:', error);
        res.status(500).render('500', { title: 'Server Error' });
    }
});

// Create new brand
router.post('/brands', authMiddleware, upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) {
            req.session.error = 'Please upload a brand logo.';
            return res.redirect('/admin/products/brands');
        }

        const { name, description } = req.body;
        
        // Validate that name exists and is not empty
        if (!name || name.trim() === '') {
            req.session.error = 'Brand name is required.';
            return res.redirect('/admin/products/brands');
        }
        
        const brand = new Brand({
            name: name.trim(),
            logo: '/uploads/' + req.file.filename,
            description: description || ''
        });

        await brand.save();
        req.session.success = 'Brand created successfully!';
        res.redirect('/admin/products/brands');
    } catch (error) {
        console.error('Error creating brand:', error);
        req.session.error = 'Failed to create brand. Please try again.';
        res.redirect('/admin/products/brands');
    }
});

// Show edit brand form
router.get('/brands/:id/edit', authMiddleware, async (req, res) => {
    try {
        const brand = await Brand.findById(req.params.id);
        if (!brand) {
            req.session.error = 'Brand not found.';
            return res.redirect('/admin/products/brands');
        }
        
        const categories = await Category.find().sort({ name: 1 });
        
        res.render('brand-edit', { 
            title: 'Edit Brand', 
            brand,
            categories,
            dashboardTheme: req.session.dashboardTheme || 'dark',
            success: req.session.success || null,
            error: req.session.error || null
        });
        delete req.session.success;
        delete req.session.error;
    } catch (error) {
        console.error('Error fetching brand for edit:', error);
        req.session.error = 'Failed to load brand for editing.';
        res.redirect('/admin/products/brands');
    }
});

// Update brand
router.post('/brands/:id/edit', authMiddleware, async (req, res) => {
    try {
        const { name, description } = req.body;
        const brand = await Brand.findById(req.params.id);
        
        if (!brand) {
            req.session.error = 'Brand not found.';
            return res.redirect('/admin/products/brands');
        }

        brand.name = name.trim();
        brand.description = description;
        await brand.save();
        
        req.session.success = 'Brand updated successfully!';
        res.redirect('/admin/products/brands');
    } catch (error) {
        console.error('Error updating brand:', error);
        req.session.error = 'Failed to update brand. Please try again.';
        res.redirect('/admin/products/brands/' + req.params.id + '/edit');
    }
});

// Delete brand
router.post('/brands/:id/delete', authMiddleware, async (req, res) => {
    try {
        const brand = await Brand.findById(req.params.id);
        
        if (!brand) {
            req.session.error = 'Brand not found.';
            return res.redirect('/admin/products/brands');
        }

        // Check if brand has associated categories
        const categoryCount = await Category.countDocuments({ brand: req.params.id });
        
        // Delete all categories associated with this brand
        if (categoryCount > 0) {
            // Check if any of these categories have products
            const Product = require('../models/Product');
            const categories = await Category.find({ brand: req.params.id });
            const categoryIds = categories.map(cat => cat._id);
            const productCount = await Product.countDocuments({ category: { $in: categoryIds } });
            
            if (productCount > 0) {
                req.session.error = 'Cannot delete brand. Its categories contain ' + productCount + ' products. Please delete the products first.';
                return res.redirect('/admin/products/brands');
            }
            
            // Delete all categories for this brand
            await Category.deleteMany({ brand: req.params.id });
        }

        await Brand.findByIdAndDelete(req.params.id);
        
        let message = 'Brand deleted successfully!';
        if (categoryCount > 0) {
            message += ' ' + categoryCount + ' associated categories were also deleted.';
        }
        req.session.success = message;
        res.redirect('/admin/products/brands');
    } catch (error) {
        console.error('Error deleting brand:', error);
        req.session.error = 'Failed to delete brand. Please try again.';
        res.redirect('/admin/products/brands');
    }
});

// ============ CATEGORY ROUTES ============

// Display all categories
router.get('/categories', authMiddleware, async (req, res) => {
    try {
        const brands = await Brand.find().sort({ createdAt: -1 });
        const selectedBrand = req.query.brand ? await Brand.findById(req.query.brand) : null;
        const categories = selectedBrand ? 
            await Category.find({ brand: selectedBrand._id }).sort({ createdAt: -1 }) : 
            await Category.find().populate('brand').sort({ createdAt: -1 });
        
        res.render('categories', { 
            title: 'Product Categories', 
            brands,
            selectedBrand,
            categories,
            dashboardTheme: req.session.dashboardTheme || 'dark',
            success: req.session.success || null,
            error: req.session.error || null
        });
        delete req.session.success;
        delete req.session.error;
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).render('500', { title: 'Server Error' });
    }
});

// Create new category
router.post('/categories', authMiddleware, async (req, res) => {
    try {
        const { name, brand } = req.body;
        
        if (!name) {
            req.session.error = 'Category name is required.';
            return res.redirect('/admin/products/categories' + (brand ? '?brand=' + brand : ''));
        }
        
        if (!brand) {
            req.session.error = 'Please select a brand.';
            return res.redirect('/admin/products/categories');
        }

        const category = new Category({
            name: name.trim(),
            brand: brand
        });

        await category.save();
        req.session.success = 'Category created successfully!';
        res.redirect('/admin/products/categories?brand=' + brand);
    } catch (error) {
        console.error('Error creating category:', error);
        if (error.code === 11000) {
            req.session.error = 'Category name already exists for this brand.';
        } else {
            req.session.error = 'Failed to create category. Please try again.';
        }
        res.redirect('/admin/products/categories' + (req.body.brand ? '?brand=' + req.body.brand : ''));
    }
});

// Delete category
router.post('/categories/:id/delete', authMiddleware, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        
        if (!category) {
            req.session.error = 'Category not found.';
            return res.redirect('/admin/products/categories');
        }

        // Check if category has associated products
        const Product = require('../models/Product');
        const productCount = await Product.countDocuments({ category: req.params.id });
        if (productCount > 0) {
            req.session.error = 'Cannot delete category. It has ' + productCount + ' associated products. Please delete the products first.';
            return res.redirect('/admin/products/categories?brand=' + category.brand);
        }

        const brandId = category.brand;
        await Category.findByIdAndDelete(req.params.id);
        req.session.success = 'Category deleted successfully!';
        res.redirect('/admin/products/categories?brand=' + brandId);
    } catch (error) {
        console.error('Error deleting category:', error);
        req.session.error = 'Failed to delete category. Please try again.';
        res.redirect('/admin/products/categories');
    }
});

// ============ PRODUCT ROUTES ============

// Display all products
router.get('/', authMiddleware, async (req, res) => {
    try {
        const products = await Product.find().populate('category').sort({ createdAt: -1 });
        res.render('products', { 
            title: 'Products', 
            products,
            dashboardTheme: req.session.dashboardTheme || 'dark',
            success: req.session.success || null,
            error: req.session.error || null
        });
        delete req.session.success;
        delete req.session.error;
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).render('500', { title: 'Server Error' });
    }
});

// Show create product form
router.get('/create', authMiddleware, async (req, res) => {
    try {
        console.log('Create product route accessed');
        const brands = await Brand.find().sort({ name: 1 });
        console.log('Brands found:', brands.length);
        console.log('Brands data:', JSON.stringify(brands, null, 2));
        
        const selectedBrand = req.query.brand ? await Brand.findById(req.query.brand) : null;
        const categories = selectedBrand ? 
            await Category.find({ brand: selectedBrand._id }).sort({ name: 1 }) : 
            [];
        console.log('Categories found:', categories.length);
        
        const renderData = { 
            title: 'Create Product', 
            brands,
            selectedBrand,
            categories,
            dashboardTheme: req.session.dashboardTheme || 'dark'
        };
        
        console.log('Render data prepared');
        res.render('product-create', renderData);
        console.log('Render completed');
    } catch (error) {
        console.error('Error loading create product form:', error);
        console.error('Error stack:', error.stack);
        res.status(500).render('500', { title: 'Server Error' });
    }
});

// Create new product
router.post('/create', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            req.session.error = 'Please upload a product image.';
            return res.redirect('/admin/products/create');
        }

        const { name, category } = req.body;
        
        if (!name || !category) {
            req.session.error = 'Product name and category are required.';
            return res.redirect('/admin/products/create');
        }

        const product = new Product({
            image: '/uploads/' + req.file.filename,
            name: name.trim(),
            category: category
        });

        await product.save();
        req.session.success = 'Product created successfully!';
        res.redirect('/admin/products');
    } catch (error) {
        console.error('Error creating product:', error);
        req.session.error = 'Failed to create product. Please try again.';
        res.redirect('/admin/products/create');
    }
});

// Show edit product form
router.get('/:id/edit', authMiddleware, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('category');
        if (!product) {
            req.session.error = 'Product not found.';
            return res.redirect('/admin/products');
        }
        
        const brands = await Brand.find().sort({ description: 1 });
        const categories = await Category.find().sort({ name: 1 });
        
        res.render('product-edit', { 
            title: 'Edit Product', 
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
        console.error('Error fetching product for edit:', error);
        req.session.error = 'Failed to load product for editing.';
        res.redirect('/admin/products');
    }
});

// Update product
router.post('/:id/edit', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const { name, category } = req.body;
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            req.session.error = 'Product not found.';
            return res.redirect('/admin/products');
        }

        // Update fields
        product.name = name.trim();
        product.category = category;
        
        // Update image if new one was uploaded
        if (req.file) {
            product.image = '/uploads/' + req.file.filename;
        }
        
        await product.save();
        req.session.success = 'Product updated successfully!';
        res.redirect('/admin/products');
    } catch (error) {
        console.error('Error updating product:', error);
        req.session.error = 'Failed to update product. Please try again.';
        res.redirect('/admin/products/' + req.params.id + '/edit');
    }
});

// Delete product
router.post('/:id/delete', authMiddleware, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            req.session.error = 'Product not found.';
            return res.redirect('/admin/products');
        }

        await Product.findByIdAndDelete(req.params.id);
        req.session.success = 'Product deleted successfully!';
        res.redirect('/admin/products');
    } catch (error) {
        console.error('Error deleting product:', error);
        req.session.error = 'Failed to delete product. Please try again.';
        res.redirect('/admin/products');
    }
});

module.exports = router;
