const mongoose = require('mongoose');

const brandWeCarrySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    logo: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: false,
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('BrandWeCarry', brandWeCarrySchema);
