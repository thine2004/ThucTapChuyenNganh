const mongoose = require('mongoose');

const PracticeTestSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: String,
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    // Danh sách các câu hỏi trong đề thi
    questions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question'
    }],
    duration: {
        type: Number, // Thời gian làm bài (phút)
        required: true
    },
    passingScore: {
        type: Number, // Điểm đạt yêu cầu
        default: 0
    },
    totalScore: {
        type: Number, // Tổng điểm tối đa
        default: 100
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isFree: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('PracticeTest', PracticeTestSchema);