const mongoose = require('mongoose');

const CartItemSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    }
}, {
    timestamps: true
});

// Đảm bảo một khóa học chỉ xuất hiện 1 lần trong giỏ hàng của một người dùng
CartItemSchema.index({ user: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('CartItem', CartItemSchema);