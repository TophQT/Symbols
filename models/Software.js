const mongoose = require('mongoose');

const softwareSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Software name is required'],
        trim: true,
        maxlength: [100, 'Software name cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Software description is required'],
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    image: {
        type: String,
        required: [true, 'Software image is required']
    },
    video: {
        type: String,
        default: null
    },
    youtubeUrl: {
        type: String,
        default: null,
        validate: {
            validator: function(v) {
                if (!v) return true; // Allow null values
                // Basic YouTube URL validation
                return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(v);
            },
            message: 'Please provide a valid YouTube URL'
        }
    },
    websiteLink: {
        type: String,
        required: [true, 'Website link is required'],
        validate: {
            validator: function(v) {
                // Basic URL validation
                return /^https?:\/\/.+\..+/.test(v);
            },
            message: 'Please provide a valid website URL'
        }
    }
}, {
    timestamps: true
});

// Index for better search performance
softwareSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Software', softwareSchema);
