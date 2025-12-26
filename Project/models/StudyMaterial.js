const mongoose = require('mongoose');

const StudyMaterialSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['pdf', 'audio', 'video', 'link', 'doc'],
        required: true
    },
    url: {
        type: String, // Đường dẫn file (trên Cloudinary/S3 hoặc server)
        required: true
    },
    // Tài liệu này thuộc về khóa học nào
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    // (Tùy chọn) Tài liệu này thuộc về bài học cụ thể nào
    lesson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson'
    },
    isDownloadable: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('StudyMaterial', StudyMaterialSchema);