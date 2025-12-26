const mongoose = require('mongoose');

const LessonSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    content: {
        type: String, // Nội dung bài học (HTML hoặc Text)
    },
    videoUrl: {
        type: String, // Link video bài giảng (Youtube/Vimeo/Cloudinary)
    },
    duration: {
        type: Number, // Thời lượng video (phút)
    },
    position: {
        type: Number, // Thứ tự bài học trong khóa
        required: true
    },
    isFree: {
        type: Boolean,
        default: false // Cho phép học thử hay không
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Lesson', LessonSchema);