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
    status: {
        type: String,
        enum: ['available', 'sold_out'],
        default: 'available' // available: Còn khóa, sold_out: Hết khóa
    },
    teachingMethod: {
        type: String,
        enum: ['online', 'offline', 'hybrid', 'all'],
        default: 'online'
    }
}, {
    timestamps: true
});

// Add indexes for better query performance
CourseSchema.index({ category: 1 });
CourseSchema.index({ isActive: 1 });
CourseSchema.index({ level: 1 });
CourseSchema.index({ teachingMethod: 1 });
CourseSchema.index({ price: 1 });
CourseSchema.index({ averageRating: -1 });

module.exports = mongoose.model('Course', CourseSchema);