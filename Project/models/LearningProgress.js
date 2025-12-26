const mongoose = require('mongoose');

const LearningProgressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    completedLessons: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson'
    }],
    progressPercent: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    lastAccessed: {
        type: Date,
        default: Date.now
    },
    isCompleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Đảm bảo mỗi user chỉ có 1 record tiến độ cho mỗi khóa học
LearningProgressSchema.index({ user: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('LearningProgress', LearningProgressSchema);