const mongoose = require('mongoose');

const updateSchema = new mongoose.Schema({
    facebookEmbed: {
        type: String,
        trim: true
    },
    videoFile: {
        type: String,
        trim: true
    },
    youtubeUrl: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Update', updateSchema);
