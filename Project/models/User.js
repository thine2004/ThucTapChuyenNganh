const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    avatar: {
        type: String,
        default: '/img/default-avatar.jpg'
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
        required: true
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    enrolledCourses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    }],
    levels: {
        type: Map,
        of: Number,
        default: {}
    }
}, {
    timestamps: true
});


// Add indexes for better query performance
// Note: email already has index from unique: true
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });

module.exports = mongoose.model('User', UserSchema);