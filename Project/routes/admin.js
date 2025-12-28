const express = require('express');
const router = express.Router();
const User = require('../models/User'); 
const Category = require('../models/Category');
const Course = require('../models/Course');
const Contact = require('../models/Contact');
const Review = require('../models/Review');
const Post = require('../models/Post');
const Setting = require('../models/Setting');
const bcryptjs = require('bcryptjs');
const passport = require('passport');
const multer = require('multer');
const path = require('path');

// Cấu hình Multer để tải ảnh lên
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/uploads');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn 5MB
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Chỉ cho phép tải lên các định dạng ảnh (jpeg, jpg, png, gif, webp)"));
    }
});

function isAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.role === 'admin') {
        return next();
    }
    req.session.returnTo = req.originalUrl;
    req.flash('error_message', 'Vui lòng đăng nhập quyền Admin.');
    res.redirect('/admin/login');
}

router.get('/login', (req, res) => {
    res.render('admin/login', { layout: 'admin', title: 'Admin Login', hideAdminNav: true });
});

router.post('/login', (req, res, next) => {
    const { email, password } = req.body;
    if (!email && !password) {
        req.flash('error_message', 'Vui lòng nhập email và mật khẩu');
        return res.redirect('/admin/login');
    } else if (!email) {
        req.flash('error_message', 'Vui lòng nhập email');
        return res.redirect('/admin/login');
    } else if (!password) {
        req.flash('error_message', 'Vui lòng nhập mật khẩu');
        return res.redirect('/admin/login');
    } else if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
        req.flash('error_message', 'Email sai định dạng');
        return res.redirect('/admin/login');
    }

    passport.authenticate('local', (err, user, info) => {
        if (err) return next(err);
        if (!user) {
            req.flash('error_message', info.message || 'Đăng nhập thất bại');
            return res.redirect('/admin/login');
        }
        if (user.role !== 'admin') {
            req.flash('error_message', 'Tài khoản không có quyền Admin');
            return res.redirect('/admin/login');
        }
        req.logIn(user, (err) => {
            if (err) return next(err);
            const returnTo = req.session.returnTo || '/admin';
            delete req.session.returnTo;
            req.flash('success_message', 'Chào mừng tài khoản admin');
            return res.redirect(returnTo);
        });
    })(req, res, next);
});

router.get('/logout', (req, res, next) => {
    req.logout(function(err) {
        if (err) return next(err);
        req.session.destroy(err => {
            res.redirect('/admin/login');
        });
    });
});

router.get('/register', (req, res) => {
    const errors = req.flash('registerErrors');
    const data = req.flash('registerData')[0] || {};
    res.render('admin/register', { 
        layout: 'admin', 
        title: 'Admin Register',
        errors, 
        firstName: data.firstName, 
        lastName: data.lastName, 
        email: data.email,
        hideAdminNav: true
    });
});

router.post('/register', async (req, res) => {
    let errors = [];
    const { firstName, lastName, email, password } = req.body;



    if (!firstName || firstName.trim() === '') {
        errors.push('Vui lòng nhập Tên (First Name)');
    } else if (firstName.length > 10) {
        errors.push('Tên tối đa 10 kí tự');
    }

    if (!lastName || lastName.trim() === '') {
        errors.push('Vui lòng nhập Họ (Last Name)');
    } else if (lastName.length > 10) {
        errors.push('Họ tối đa 10 kí tự');
    }

    if (!email || email.trim() === '') {
        errors.push('Vui lòng nhập Email');
    } else if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
        errors.push('Email phải đúng định dạng');
    }

    if (!password || password === '') {
        errors.push('Vui lòng nhập Mật khẩu');
    } else {
        if (password.length > 12) {
            errors.push('Mật khẩu tối đa 12 kí tự');
        }
        if (!/[A-Z]/.test(password)) {
            errors.push('Mật khẩu phải bao gồm chữ cái in hoa');
        }
        if (!/[a-z]/.test(password)) {
            errors.push('Mật khẩu phải bao gồm chữ cái viết thường');
        }
        if (!/[0-9]/.test(password)) {
            errors.push('Mật khẩu phải bao gồm số');
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            errors.push('Mật khẩu phải bao gồm kí tự đặc biệt');
        }
    }

    if (errors.length > 0) {
        errors.forEach(error => req.flash('registerErrors', error));
        req.flash('registerData', req.body);
        return res.redirect('/admin/register');
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            req.flash('error_message', 'Email đã tồn tại!');
            req.flash('registerData', req.body);
            return res.redirect('/admin/register');
        }

        const newUser = new User({
            firstName, lastName, email, password, role: 'admin'
        });

        const salt = await bcryptjs.genSalt(10);
        newUser.password = await bcryptjs.hash(password, salt);
        await newUser.save();

        req.flash('success_message', 'Đăng ký Admin thành công! Vui lòng đăng nhập.');
        res.redirect('/admin/login');
    } catch (err) {
        req.flash('error_message', 'Lỗi: ' + err.message);
        res.redirect('/admin/register');
    }
});

router.all('/*', isAdmin, function(req, res, next) {
    res.locals.layout = 'admin';
    next();
});



router.get('/', async function(req, res, next) {
    try {
        const [
            userCount, 
            adminCount, 
            courseCount, 
            newContacts
        ] = await Promise.all([
            User.countDocuments({ role: 'user' }),
            User.countDocuments({ role: 'admin' }),
            Course.countDocuments({}),
            Contact.countDocuments({ status: 'new' })
        ]);

        res.render('admin/index', {
            title: 'Tổng quan - Admin Dashboard',
            stats: { 
                userCount, 
                adminCount, 
                courseCount,
                newContacts
            }
        });
    } catch (err) {
        res.render('admin/index', { title: 'Tổng quan - Admin Dashboard' });
    }
});

router.get('/users', function(req, res, next) {
    const role = req.query.role;
    let query = {};
    if (role) {
        query.role = role;
    }

    User.find(query)
        .lean()
        .sort({ createdAt: -1 })
        .then(users => {
            res.render('admin/users/user-list', {
                title: 'Quản lý Người dùng',
                users: users,
                currentRole: role
            });
        })
        .catch(err => {
            res.redirect('/admin');
        });
});

router.get('/users/add', function(req, res, next) {
    res.render('admin/users/add-user', { 
        title: 'Thêm Người dùng',
        role: req.query.role || 'user'
    });
});

router.post('/users/add', upload.single('avatarFile'), function(req, res, next) {
    const { firstName, lastName, email, password, role, phone, isActive } = req.body;
    
    if (!email || !password || !firstName || !lastName) {
        req.flash('error_message', 'Vui lòng điền đầy đủ thông tin bắt buộc');
        return res.redirect('/admin/users/add?role=' + role);
    }

    User.findOne({ email: email }).then(user => {
        if (user) {
            req.flash('error_message', 'Email đã tồn tại');
            return res.redirect('/admin/users/add?role=' + role);
        }

        const newUser = new User({
            firstName,
            lastName,
            email,
            password, 
            role,
            phone,
            isActive: !!isActive,
            avatar: req.file ? '/uploads/' + req.file.filename : '/img/avatar.jpg'
        });

        const bcryptjs = require('bcryptjs');
        
        bcryptjs.genSalt(10, function (err, salt) {
            bcryptjs.hash(newUser.password, salt, (err, hash) => {
                newUser.password = hash;
                newUser.save().then(() => {
                    req.flash('success_message', 'Thêm người dùng thành công!');
                    res.redirect('/admin/users');
                }).catch(err => {
                    req.flash('error_message', 'Lỗi db: ' + err.message);
                    res.redirect('/admin/users/add?role=' + role);
                });
            });
        });
    });
});

router.get('/users/edit/:id', async function(req, res, next) {
    try {
        const user = await User.findById(req.params.id).lean();
        res.render('admin/users/edit-user', {
             title: 'Sửa Người dùng',
             user: user
        });
    } catch (err) {
        res.redirect('/admin');
    }
});

router.put('/users/edit/:id', upload.single('avatarFile'), function(req, res, next) {
    const { firstName, lastName, role, isActive, levels } = req.body;
    
    User.findById(req.params.id).then(user => {
        if (!user) return res.redirect('/admin/users');

        user.firstName = firstName;
        user.lastName = lastName;
        user.role = role;
        user.isActive = !!isActive;

        if (req.file) {
            user.avatar = '/uploads/' + req.file.filename;
        }

        if (levels && typeof levels === 'object') {
            Object.keys(levels).forEach(key => {
                user.levels.set(key, parseFloat(levels[key]) || 0);
            });
        }

        return user.save();
    }).then(() => {
        req.flash('success_message', 'Cập nhật thành công!');
        res.redirect('/admin/users');
    }).catch(err => {
        req.flash('error_message', 'Lỗi: ' + err.message);
        res.redirect('/admin/users');
    });
});

router.get('/category', function(req, res, next) {
    Category.find().sort({ createdAt: -1 }).lean().then(categories => {
        res.render('admin/category/category-list', { 
            title: 'Quản lý Danh mục',
            categories: categories
        });
    }).catch(err => {
        res.redirect('/admin');
    });
});

router.get('/category/add', function(req, res, next) {
    res.render('admin/category/add-category', { title: 'Thêm Danh mục' });
});

router.post('/category/add', function(req, res, next) {
    const { name, description, isActive } = req.body;
    const newCategory = new Category({
        name,
        description,
        isActive: !!isActive
    });
    newCategory.save().then(() => {
        req.flash('success_message', 'Thêm danh mục thành công!');
        res.redirect('/admin/category');
    }).catch(err => {
        req.flash('error_message', 'Lỗi khi thêm danh mục: ' + err.message);
        res.redirect('/admin/category/add');
    });
});

router.get('/category/edit/:id', function(req, res, next) {
    Category.findById(req.params.id).lean().then(category => {
        if (!category) {
            req.flash('error_message', 'Không tìm thấy danh mục');
            return res.redirect('/admin/category');
        }
        res.render('admin/category/edit-category', { 
            title: 'Sửa Danh mục',
            category: category
        });
    }).catch(err => {
        res.redirect('/admin/category');
    });
});

router.put('/category/edit/:id', function(req, res, next) {
    const { name, description, isActive } = req.body;
    Category.findById(req.params.id).then(category => {
        if (!category) {
            req.flash('error_message', 'Không tìm thấy danh mục');
            return res.redirect('/admin/category');
        }
        category.name = name;
        category.description = description;
        category.isActive = !!isActive;
        return category.save();
    }).then(() => {
        req.flash('success_message', 'Cập nhật danh mục thành công!');
        res.redirect('/admin/category');
    }).catch(err => {
        req.flash('error_message', 'Lỗi khi cập nhật danh mục: ' + err.message);
        res.redirect('/admin/category/edit/' + req.params.id);
    });
});

router.delete('/category/delete/:id', async function(req, res, next) {
    try {
        const courseCount = await Course.countDocuments({ category: req.params.id });
        if (courseCount > 0) {
            req.flash('error_message', 'Không thể xóa danh mục đang có khóa học!');
            return res.redirect('/admin/category');
        }
        
        await Category.findByIdAndDelete(req.params.id);
        req.flash('success_message', 'Đã xóa danh mục thành công!');
        res.redirect('/admin/category');
    } catch (err) {
        req.flash('error_message', 'Lỗi khi xóa: ' + err.message);
        res.redirect('/admin/category');
    }
});

router.get('/product', function(req, res, next) {
    Course.find().populate('category').sort({ createdAt: -1 }).lean().then(products => {
        res.render('admin/product/product-list', { 
            title: 'Quản lý Khóa học',
            products: products 
        });
    }).catch(err => {
        res.redirect('/admin');
    });
});

router.get('/product/add', function(req, res, next) {
    Category.find().lean().then(categories => {
         res.render('admin/product/add-product', { 
            title: 'Thêm Khóa học',
            categories: categories
        });
    });
});

router.post('/product/add', upload.single('thumbnailFile'), function(req, res, next) {
    let { title, category, price, originalPrice, duration, thumbnail, description, isActive, status, level, teachingMethod } = req.body;
    
    if (req.file) {
        thumbnail = '/uploads/' + req.file.filename;
    }

    if (originalPrice === "") originalPrice = null;

    const newCourse = new Course({
        title,
        category,
        price,
        originalPrice,
        duration,
        thumbnail,
        description,
        isActive: !!isActive,
        status: status || 'available',
        level,
        teachingMethod
    });

    newCourse.save().then(() => {
        req.flash('success_message', 'Thêm khóa học thành công!');
        res.redirect('/admin/product');
    }).catch(err => {
        req.flash('error_message', 'Lỗi khi thêm khóa học: ' + err.message);
        res.redirect('/admin/product/add');
    });
});

router.get('/product/edit/:id', function(req, res, next) {
    Promise.all([
        Course.findById(req.params.id).lean(),
        Category.find().lean()
    ]).then(([product, categories]) => {
         if (!product) {
            req.flash('error_message', 'Không tìm thấy khóa học');
            return res.redirect('/admin/product');
        }
        res.render('admin/product/edit-product', { 
            title: 'Sửa Khóa học',
            product: product,
            categories: categories
        });
    }).catch(err => {
        res.redirect('/admin/product');
    });
});

router.put('/product/edit/:id', upload.single('thumbnailFile'), function(req, res, next) {
    let { title, category, price, originalPrice, duration, thumbnail, description, isActive, status, level, teachingMethod } = req.body;
    
    if (req.file) {
        thumbnail = '/uploads/' + req.file.filename;
    }
    
    if (originalPrice === "") originalPrice = null;
    
    Course.findByIdAndUpdate(req.params.id, {
        title,
        category,
        price,
        originalPrice,
        duration,
        thumbnail,
        description,
        isActive: !!isActive,
        status: status || 'available',
        level,
        teachingMethod
    }).then(() => {
        req.flash('success_message', 'Cập nhật khóa học thành công!');
        res.redirect('/admin/product');
    }).catch(err => {
        req.flash('error_message', 'Lỗi khi cập nhật khóa học: ' + err.message);
        res.redirect('/admin/product/edit/' + req.params.id);
    });
});

// Toggle trạng thái Hoạt động/Tạm ẩn của khóa học
router.post('/product/toggle/:id', function(req, res, next) {
    Course.findById(req.params.id).then(course => {
        if (!course) {
            req.flash('error_message', 'Không tìm thấy khóa học');
            return res.redirect('/admin/product');
        }
        course.isActive = !course.isActive;
        return course.save();
    }).then(() => {
        req.flash('success_message', 'Đã thay đổi trạng thái khóa học!');
        res.redirect('/admin/product');
    }).catch(err => {
        req.flash('error_message', 'Lỗi khi thay đổi trạng thái: ' + err.message);
        res.redirect('/admin/product');
    });
});

// Xóa khóa học
router.delete('/product/delete/:id', function(req, res, next) {
    Course.findByIdAndDelete(req.params.id).then(() => {
        req.flash('success_message', 'Đã xóa khóa học thành công!');
        res.redirect('/admin/product');
    }).catch(err => {
        req.flash('error_message', 'Lỗi khi xóa khóa học: ' + err.message);
        res.redirect('/admin/product');
    });
});

router.delete('/users/delete/:id', function(req, res, next) {
    if (req.params.id == req.user._id) {
        req.flash('error_message', 'Không thể xóa tài khoản đang đăng nhập!');
        return res.redirect('/admin/users');
    }

    User.findByIdAndDelete(req.params.id).then(() => {
        req.flash('success_message', 'Đã xóa người dùng thành công!');
        res.redirect('back');
    }).catch(err => {
        req.flash('error_message', 'Lỗi khi xóa người dùng: ' + err.message);
        res.redirect('back');
    });
});

router.get('/contacts', function(req, res, next) {
    Contact.find().sort({ createdAt: -1 }).lean().then(contacts => {
        res.render('admin/contact/contact-list', {
            title: 'Quản lý Liên hệ',
            contacts: contacts
        });
    }).catch(err => {
        res.redirect('/admin');
    });
});

router.put('/contacts/update/:id', function(req, res, next) {
    const { status, adminNotes } = req.body;
    Contact.findByIdAndUpdate(req.params.id, {
        status,
        adminNotes
    }).then(() => {
        req.flash('success_message', 'Cập nhật trạng thái liên hệ thành công!');
        res.redirect('/admin/contacts');
    }).catch(err => {
        req.flash('error_message', 'Lỗi khi cập nhật liên hệ');
        res.redirect('/admin/contacts');
    });
});

router.delete('/contacts/delete/:id', function(req, res, next) {
    Contact.findByIdAndDelete(req.params.id).then(() => {
        req.flash('success_message', 'Đã xóa liên hệ thành công!');
        res.redirect('/admin/contacts');
    }).catch(err => {
        req.flash('error_message', 'Lỗi khi xóa liên hệ');
        res.redirect('/admin/contacts');
    });
});

router.get('/reviews', function(req, res, next) {
    Review.find().populate('user').populate('course').sort({ createdAt: -1 }).lean().then(reviews => {
        res.render('admin/review/review-list', {
            title: 'Quản lý Đánh giá',
            reviews: reviews
        });
    }).catch(err => {
        res.redirect('/admin');
    });
});

router.post('/reviews/toggle/:id', function(req, res, next) {
    Review.findById(req.params.id).then(review => {
        if (!review) return res.redirect('/admin/reviews');
        review.isActive = !review.isActive;
        return review.save();
    }).then(() => {
        req.flash('success_message', 'Đã thay đổi trạng thái đánh giá.');
        res.redirect('/admin/reviews');
    }).catch(err => {
        res.redirect('/admin/reviews');
    });
});

router.delete('/reviews/delete/:id', function(req, res, next) {
    Review.findByIdAndDelete(req.params.id).then(() => {
        req.flash('success_message', 'Đã xóa đánh giá thành công!');
        res.redirect('/admin/reviews');
    }).catch(err => {
        req.flash('error_message', 'Lỗi khi xóa đánh giá.');
        res.redirect('/admin/reviews');
    });
});







// QUẢN LÝ BÀI VIẾT (BLOG)
router.get('/posts', function(req, res, next) {
    Post.find().populate('author', 'firstName lastName').sort({ createdAt: -1 }).lean().then(posts => {
        res.render('admin/post/post-list', {
            title: 'Quản lý Bài viết',
            posts: posts
        });
    }).catch(err => res.redirect('/admin'));
});

router.get('/posts/add', function(req, res, next) {
    res.render('admin/post/add-post', { title: 'Thêm Bài viết' });
});

router.post('/posts/add', upload.single('thumbnailFile'), function(req, res, next) {
    const { title, content, thumbnail, isActive } = req.body;
    const slug = title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    
    let postThumbnail = thumbnail || '/img/blog-default.jpg';
    if (req.file) {
        postThumbnail = '/uploads/' + req.file.filename;
    }

    const newPost = new Post({
        title,
        content,
        thumbnail: postThumbnail,
        slug,
        author: req.user._id,
        isActive: !!isActive
    });

    newPost.save().then(() => {
        req.flash('success_message', 'Đã thêm bài viết mới!');
        res.redirect('/admin/posts');
    }).catch(err => {
        req.flash('error_message', 'Lỗi khi thêm bài viết: ' + err.message);
        res.redirect('/admin/posts/add');
    });
});

router.get('/posts/edit/:id', function(req, res, next) {
    Post.findById(req.params.id).lean().then(post => {
        if (!post) return res.redirect('/admin/posts');
        res.render('admin/post/edit-post', {
            title: 'Chỉnh sửa Bài viết',
            post: post
        });
    }).catch(err => res.redirect('/admin/posts'));
});

router.post('/posts/edit/:id', upload.single('thumbnailFile'), function(req, res, next) {
    const { title, content, thumbnail, isActive } = req.body;
    const slug = title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

    let postThumbnail = thumbnail;
    if (req.file) {
        postThumbnail = '/uploads/' + req.file.filename;
    }

    Post.findByIdAndUpdate(req.params.id, {
        title,
        content,
        thumbnail: postThumbnail,
        slug,
        isActive: !!isActive
    }).then(() => {
        req.flash('success_message', 'Cập nhật bài viết thành công!');
        res.redirect('/admin/posts');
    }).catch(err => {
        req.flash('error_message', 'Lỗi khi cập nhật bài viết');
        res.redirect('/admin/posts/edit/' + req.params.id);
    });
});

router.delete('/posts/delete/:id', function(req, res, next) {
    Post.findByIdAndDelete(req.params.id).then(() => {
        req.flash('success_message', 'Đã xóa bài viết thành công!');
        res.redirect('/admin/posts');
    }).catch(err => {
        req.flash('error_message', 'Lỗi khi xóa bài viết');
        res.redirect('/admin/posts');
    });
});

// QUẢN LÝ WEBSITE (SETTINGS)
router.get('/settings', isAdmin, function(req, res, next) {
    Setting.findOne().lean().then(settings => {
        if (!settings) settings = {};
        
        // Ensure sub-arrays exist for the form loops
        if (!settings.features || settings.features.length === 0) {
            settings.features = [
                { icon: 'fa-graduation-cap', title: 'Giáo Viên Bản Ngữ', description: 'Đội ngũ giáo viên bản ngữ giàu kinh nghiệm...' },
                { icon: 'fa-globe', title: 'Học Linh Hoạt', description: 'Lớp học online và offline linh hoạt...' },
                { icon: 'fa-award', title: 'Cam Kết Đầu Ra', description: 'Chúng tôi cam kết bạn sẽ đạt được điểm số mục tiêu...' },
                { icon: 'fa-book-open', title: 'Tài Liệu Cập Nhật', description: 'Tài liệu học tập và đề thi thử toàn diện...' }
            ];
        }
        if (!settings.stats || settings.stats.length === 0) {
            settings.stats = [
                { value: '15+', label: 'Giảng Viên' },
                { value: '1500+', label: 'Học Viên' },
                { value: '50+', label: 'Khóa Học' },
                { value: '10+', label: 'Năm Kinh Nghiệm' }
            ];
        }
        if (!settings.faqs || settings.faqs.length === 0) {
            settings.faqs = [
                { question: 'Câu hỏi 1', answer: 'Câu trả lời 1' },
                { question: 'Câu hỏi 2', answer: 'Câu trả lời 2' },
                { question: 'Câu hỏi 3', answer: 'Câu trả lời 3' }
            ];
        }

        res.render('admin/settings', {
            title: 'Quản lý Giao diện',
            settings: settings
        });
    }).catch(err => res.redirect('/admin'));
});

router.post('/settings', isAdmin, upload.fields([
    { name: 'heroImageFile', maxCount: 1 },
    { name: 'aboutImageFile', maxCount: 1 }
]), function(req, res, next) {
    Setting.findOne().then(settings => {
        if (!settings) settings = new Setting();
        
        const { 
            logoText, logoIcon, footerAbout, footerAddress, 
            footerPhone, footerEmail, socialFacebook, socialYoutube, 
            socialLinkedin, socialTiktok, heroTitle, heroSubtitle, 
            heroDescription, heroImage, siteTitle, siteDescription,
            aboutTitle, aboutImage, aboutDescription, aboutPointsRaw,
            featureIcon, featureTitle, featureDescription,
            teamTitle, teamSubtitle, teamDescription, 
            teamCtaTitle, teamCtaDescription,
            statValue, statLabel,
            contactTitle, contactSubtitle, contactDescription, 
            contactMapsUrl, contactWorkingHours,
            faqQuestion, faqAnswer,
            coursesTitle, coursesSubtitle, 
            blogTitle, blogSubtitle, 
            testimonialTitle, testimonialSubtitle
        } = req.body;

        // Xử lý ảnh tải lên (nếu có)
        if (req.files) {
            if (req.files['heroImageFile']) {
                settings.heroImage = '/uploads/' + req.files['heroImageFile'][0].filename;
            } else if (heroImage) {
                settings.heroImage = heroImage;
            }

            if (req.files['aboutImageFile']) {
                settings.aboutImage = '/uploads/' + req.files['aboutImageFile'][0].filename;
            } else if (aboutImage) {
                settings.aboutImage = aboutImage;
            }
        } else {
            if (heroImage) settings.heroImage = heroImage;
            if (aboutImage) settings.aboutImage = aboutImage;
        }

        settings.logoText = logoText;
        settings.logoIcon = logoIcon;
        settings.footerAbout = footerAbout;
        settings.footerAddress = footerAddress;
        settings.footerPhone = footerPhone;
        settings.footerEmail = footerEmail;
        settings.socialFacebook = socialFacebook;
        settings.socialYoutube = socialYoutube;
        settings.socialLinkedin = socialLinkedin;
        settings.socialTiktok = socialTiktok;
        settings.heroTitle = heroTitle;
        settings.heroSubtitle = heroSubtitle;
        settings.heroDescription = heroDescription;
        settings.heroImage = heroImage;
        settings.siteTitle = siteTitle;
        settings.siteDescription = siteDescription;

        // Homepage Specific Titles
        settings.coursesTitle = coursesTitle;
        settings.coursesSubtitle = coursesSubtitle;
        settings.blogTitle = blogTitle;
        settings.blogSubtitle = blogSubtitle;
        settings.testimonialTitle = testimonialTitle;
        settings.testimonialSubtitle = testimonialSubtitle;

        // Process About Us
        settings.aboutTitle = aboutTitle;
        settings.aboutImage = aboutImage;
        settings.aboutDescription = aboutDescription;
        if (aboutPointsRaw) {
            settings.aboutPoints = aboutPointsRaw.split('\n').map(p => p.trim()).filter(p => p !== '');
        }

        // Helper to normalize items to array
        const toArray = (val) => {
            if (!val) return [];
            return Array.isArray(val) ? val : [val];
        };

        const fIcons = toArray(featureIcon);
        const fTitles = toArray(featureTitle);
        const fDescs = toArray(featureDescription);

        if (fIcons.length > 0) {
            settings.features = fIcons.map((icon, i) => ({
                icon: icon,
                title: fTitles[i] || '',
                description: fDescs[i] || ''
            }));
        }

        // Process Team
        settings.teamTitle = teamTitle;
        settings.teamSubtitle = teamSubtitle;
        settings.teamDescription = teamDescription;
        settings.teamCtaTitle = teamCtaTitle;
        settings.teamCtaDescription = teamCtaDescription;

        // Process Stats
        const sValues = toArray(statValue);
        const sLabels = toArray(statLabel);
        if (sValues.length > 0) {
            settings.stats = sValues.map((val, i) => ({
                value: val,
                label: sLabels[i] || ''
            }));
        }

        // Process Contact
        settings.contactTitle = contactTitle;
        settings.contactSubtitle = contactSubtitle;
        settings.contactDescription = contactDescription;
        settings.contactMapsUrl = contactMapsUrl;
        settings.contactWorkingHours = contactWorkingHours;

        // Process FAQs
        const qFaqs = toArray(faqQuestion);
        const aFaqs = toArray(faqAnswer);
        if (qFaqs.length > 0) {
            settings.faqs = qFaqs.map((q, i) => ({
                question: q,
                answer: aFaqs[i] || ''
            }));
        }

        return settings.save();
    }).then(() => {
        req.flash('success_message', 'Cập nhật giao diện website thành công!');
        res.redirect('/admin/settings');
    }).catch(err => {
        req.flash('error_message', 'Lỗi khi cập nhật settings: ' + err.message);
        res.redirect('/admin/settings');
    });
});

module.exports = router;