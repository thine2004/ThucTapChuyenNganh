const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true
    },
    options: [{
        text: String,
        isCorrect: Boolean
    }],
    explanation: String, // Giải thích đáp án
    type: {
        type: String,
        enum: ['multiple_choice', 'fill_in_blank', 'listening'],
        default: 'multiple_choice'
    },
    level: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    },
    audioUrl: String, // Cho câu hỏi nghe
    tags: [String] // Ví dụ: ['toeic-part-1', 'grammar']
}, {
    timestamps: true
});

module.exports = mongoose.model('Question', QuestionSchema);