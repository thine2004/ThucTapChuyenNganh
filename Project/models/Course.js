const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    originalPrice: {
        type: Number, // Giá gốc để hiển thị giảm giá
        min: 0
    },
    thumbnail: {
        type: String, // Đường dẫn ảnh bìa khóa học
        default: '/img/default-course.jpg'
    },
    // Liên kết với Category
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    // Liên kết với User (Giảng viên)
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'all'],
        default: 'all'
    },
    totalLessons: {
        type: Number,
        default: 0
    },
    duration: {
        type: Number, // Tổng thời lượng (phút hoặc giờ)
        default: 0
    },
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    isActive: {
        type: Boolean,
        default: true // Khóa học có đang được bán không
    },
    teachingMethod: {
        type: String,
        enum: ['online', 'offline', 'hybrid', 'all'],
        default: 'online'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Course', CourseSchema);