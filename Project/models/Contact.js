const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    phone: String,
    course: String,
    level: String,
    message: String,
    isConsultationRequested: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['new', 'read', 'contacted'],
        default: 'new'
    },
    adminNotes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Contact', ContactSchema);
