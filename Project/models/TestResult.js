const mongoose = require('mongoose');

const TestResultSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    test: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PracticeTest',
        required: true
    },
    score: {
        type: Number,
        required: true
    },
    correctAnswers: {
        type: Number, // Số câu đúng
        default: 0
    },
    totalQuestions: {
        type: Number, // Tổng số câu hỏi
        default: 0
    },
    // Lưu chi tiết câu trả lời của người dùng (để xem lại sau này)
    answers: [{
        question: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Question'
        },
        selectedOption: String, // Đáp án người dùng chọn
        isCorrect: Boolean
    }],
    isPassed: {
        type: Boolean,
        default: false
    },
    completedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('TestResult', TestResultSchema);