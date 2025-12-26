var express = require('express');
var router = express.Router();
const User = require('../models/User');
const Course = require('../models/Course');
const Category = require('../models/Category');


router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'API đang hoạt động tốt!',
        timestamp: new Date().toISOString(),
        data: {
            status: 'OK',
            version: '1.0.0'
        }
    });
});

router.get('/users', async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json({
            success: true,
            message: 'Lấy danh sách users thành công',
            count: users.length,
            data: users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách users',
            error: error.message
        });
    }
});

// GET /api/users/:id - Lấy thông tin user theo ID
router.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy user'
            });
        }
        res.json({
            success: true,
            message: 'Lấy thông tin user thành công',
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin user',
            error: error.message
        });
    }
});

// GET /api/courses - Lấy danh sách tất cả khóa học
router.get('/courses', async (req, res) => {
    try {
        const courses = await Course.find()
            .populate('category', 'name')
            .populate('instructor', 'name email')
            .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            message: 'Lấy danh sách khóa học thành công',
            count: courses.length,
            data: courses
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách khóa học',
            error: error.message
        });
    }
});

// GET /api/courses/:id - Lấy thông tin khóa học theo ID
router.get('/courses/:id', async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate('category', 'name')
            .populate('instructor', 'name email');
        
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy khóa học'
            });
        }
        
        res.json({
            success: true,
            message: 'Lấy thông tin khóa học thành công',
            data: course
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin khóa học',
            error: error.message
        });
    }
});

router.get('/categories', async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.json({
            success: true,
            message: 'Lấy danh sách danh mục thành công',
            count: categories.length,
            data: categories
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách danh mục',
            error: error.message
        });
    }
});

// POST /api/users - Tạo user mới (ví dụ)
router.post('/users', async (req, res) => {
    try {
        const { name, email, password, phone, role } = req.body;
        
        // Kiểm tra dữ liệu đầu vào
        if (!name || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ thông tin: name, email, password, role'
            });
        }

        // Kiểm tra email đã tồn tại chưa
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email đã được sử dụng'
            });
        }

        // Tạo user mới (lưu ý: trong thực tế cần hash password)
        const newUser = new User({
            name,
            email,
            password, // Nên hash password trước khi lưu
            phone,
            role
        });

        await newUser.save();

        res.status(201).json({
            success: true,
            message: 'Tạo user thành công',
            data: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo user',
            error: error.message
        });
    }
});

// POST /api/test - Test POST request
router.post('/test', (req, res) => {
    res.json({
        success: true,
        message: 'POST request thành công!',
        receivedData: req.body,
        timestamp: new Date().toISOString()
    });
});

module.exports = router;

