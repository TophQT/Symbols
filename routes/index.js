const express = require('express');
const router = express.Router();
const Message = require('../models/Message');

// Home Page
router.get('/', (req, res) => {
    res.render('index', { title: 'Symbol Sciences - Empowering Innovation' });
});

// Products Page
router.get('/products', (req, res) => {
    res.render('products', { title: 'Our Products - Symbol Sciences' });
});

// Services & Solutions Page
router.get('/services', (req, res) => {
    res.render('services', { title: 'Services & Solutions - Symbol Sciences' });
});

// Updates Page
router.get('/updates', (req, res) => {
    res.render('updates', { title: 'Latest Updates - Symbol Sciences' });
});

// About Us Page
router.get('/about', (req, res) => {
    res.render('about', { title: 'About Us - Symbol Sciences' });
});

// Contact Us Page
router.get('/contact', (req, res) => {
    res.render('contact', { title: 'Contact Us - Symbol Sciences' });
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

module.exports = router;
