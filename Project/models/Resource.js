const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['grammar', 'vocabulary'],
        required: true
    },
    content: {
        type: String, // MarkDown or HTML content
        required: true
    },
    thumbnail: String,
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Resource', ResourceSchema);
