const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Import User Model để truy vấn MongoDB
const Category = require('../models/Category');
const Course = require('../models/Course');
const Contact = require('../models/Contact');
const Review = require('../models/Review');
const Lesson = require('../models/Lesson');
const Question = require('../models/Question');
const PracticeTest = require('../models/PracticeTest');
const Resource = require('../models/Resource');
const Order = require('../models/Order');

// Middleware kiểm tra quyền truy cập Admin
// Middleware kiểm tra quyền truy cập Admin
function isAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.role === 'admin') {
        return next();
    }
    req.session.returnTo = req.originalUrl;
    req.flash('error_message', 'Access denied. You must be an admin.');
    res.redirect('/login');
}

router.all('/*', function(req, res, next) {
    res.locals.layout = 'admin';
    next();
});

router.use(isAdmin);

// DEBUG ROUTE
router.get('/tests/edit/:id', async function(req, res, next) {
    console.log('🔍 Accessing Test Edit:', req.params.id);
    try {
        const [test, categories] = await Promise.all([
            PracticeTest.findById(req.params.id).lean(),
            Category.find().lean()
        ]);

        if (!test) {
            console.log('❌ Test not found in DB:', req.params.id);
            req.flash('error_message', 'Không tìm thấy đề thi');
            return res.redirect('/admin/tests');
        }

        res.render('admin/test/edit-test', {
            title: 'Sửa Đề thi',
            test: test,
            categories: categories
        });
    } catch (err) {
        console.error('🔥 Error in Test Edit Route:', err);
        res.redirect('/admin/tests');
    }
});

// Dashboard
router.get('/', async function(req, res, next) {
    try {
        const [
            userCount, 
            adminCount, 
            courseCount, 
            pendingOrders,
            totalRevenueData,
            newContacts,
            latestOrders
        ] = await Promise.all([
            User.countDocuments({ role: 'user' }),
            User.countDocuments({ role: 'admin' }),
            Course.countDocuments({}),
            Order.countDocuments({ status: 'pending' }),
            Order.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: null, total: { $sum: "$totalAmount" } } }
            ]),
            Contact.countDocuments({ status: 'pending' }),
            Order.find().populate('user').limit(5).sort({ createdAt: -1 }).lean()
        ]);

        const totalRevenue = totalRevenueData.length > 0 ? totalRevenueData[0].total : 0;

        res.render('admin/index', {
            title: 'Tổng quan - Admin Dashboard',
            stats: { 
                userCount, 
                adminCount, 
                courseCount, 
                pendingOrders, 
                totalRevenue,
                newContacts
            },
            latestOrders
        });
    } catch (err) {
        console.error(err);
        res.render('admin/index', { title: 'Tổng quan - Admin Dashboard' });
    }
});

// Route xử lý danh sách Users (Học viên, Giảng viên, Admin) TỪ MONGODB
router.get('/users', function(req, res, next) {
    const role = req.query.role;
    let query = {};
    if (role) {
        query.role = role;
    }

    // Tìm kiếm user trong MongoDB
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
            console.error('Lỗi khi lấy danh sách user:', err);
            res.redirect('/admin');
        });
});

// Add User - GET
router.get('/users/add', function(req, res, next) {
    res.render('admin/users/add-user', { 
        title: 'Thêm Người dùng',
        role: req.query.role || 'user'
    });
});

// Add User - POST
router.post('/users/add', function(req, res, next) {
    const { firstName, lastName, email, password, role, phone, isActive } = req.body;
    
    // Basic validation
    if (!email || !password || !firstName || !lastName) {
        req.flash('error_message', 'Vui lòng điền đầy đủ thông tin bắt buộc');
        return res.redirect('/admin/users/add?role=' + role);
    }

    // Check if email exists
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
            isActive: !!isActive
        });

        const bcryptjs = require('bcryptjs'); // Ensure bcryptjs is available or move to top if not
        
        // Hash password (assuming User model has pre-save hook or we do it here)
        // Previous register code did it manually, so we do it here too
        bcryptjs.genSalt(10, function (err, salt) {
            bcryptjs.hash(newUser.password, salt, (err, hash) => {
                newUser.password = hash;
                newUser.save().then(() => {
                    req.flash('success_message', 'Thêm người dùng thành công!');
                    res.redirect('/admin/users');
                }).catch(err => {
                     console.error(err);
                    req.flash('error_message', 'Lỗi db: ' + err.message);
                    res.redirect('/admin/users/add?role=' + role);
                });
            });
        });
    });
});

// Edit User - GET
router.get('/users/edit/:id', function(req, res, next) {
    User.findById(req.params.id).lean().then(user => {
        if (!user) {
            req.flash('error_message', 'Không tìm thấy người dùng');
            return res.redirect('/admin/users');
        }
        res.render('admin/users/edit-user', {
             title: 'Sửa Người dùng',
             user: user
        });
    }).catch(err => {
        console.error(err);
        res.redirect('/admin');
    });
});

// Edit User - POST
router.post('/users/edit/:id', function(req, res, next) {
    const { firstName, lastName, role, phone, isActive } = req.body;
    // Note: Password update logic is separate usually, or handled if field is present
    
    User.findByIdAndUpdate(req.params.id, {
        firstName,
        lastName,
        role,
        phone,
        isActive: !!isActive
    }).then(user => {
        req.flash('success_message', 'Cập nhật thành công!');
        res.redirect('/admin/users');
    }).catch(err => {
        console.error(err);
        req.flash('error_message', 'Lỗi: ' + err.message);
        res.redirect('/admin/users/edit/' + req.params.id);
    });
});

// Category list
router.get('/category', function(req, res, next) {
    Category.find().sort({ createdAt: -1 }).lean().then(categories => {
        console.log('📋 Fetched categories count:', categories.length);
        res.render('admin/category/category-list', { 
            title: 'Quản lý Danh mục',
            categories: categories
        });
    }).catch(err => {
        console.error(err);
        res.redirect('/admin');
    });
});

// Add Category - GET
router.get('/category/add', function(req, res, next) {
    res.render('admin/category/add-category', { title: 'Thêm Danh mục' });
});

// Add Category - POST
router.post('/category/add', function(req, res, next) {
    const { name, description, isActive } = req.body;
    const newCategory = new Category({
        name,
        description,
        isActive: !!isActive
    });
    newCategory.save().then(() => {
        console.log('✅ Success: Category created:', name);
        req.flash('success_message', 'Thêm danh mục thành công!');
        res.redirect('/admin/category');
    }).catch(err => {
        console.error('❌ Error creating category:', err);
        req.flash('error_message', 'Lỗi khi thêm danh mục: ' + err.message);
        res.redirect('/admin/category/add');
    });
});

// Edit Category - GET
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
        console.error(err);
        res.redirect('/admin/category');
    });
});

// Edit Category - POST
router.post('/category/edit/:id', function(req, res, next) {
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
        console.error(err);
        req.flash('error_message', 'Lỗi khi cập nhật danh mục: ' + err.message);
        res.redirect('/admin/category/edit/' + req.params.id);
    });
});

// Delete Category - POST
router.post('/category/delete/:id', async function(req, res, next) {
    try {
        // Check if any courses are using this category
        const courseCount = await Course.countDocuments({ category: req.params.id });
        if (courseCount > 0) {
            req.flash('error_message', 'Không thể xóa danh mục đang có khóa học!');
            return res.redirect('/admin/category');
        }
        
        await Category.findByIdAndDelete(req.params.id);
        req.flash('success_message', 'Đã xóa danh mục thành công!');
        res.redirect('/admin/category');
    } catch (err) {
        console.error(err);
        req.flash('error_message', 'Lỗi khi xóa: ' + err.message);
        res.redirect('/admin/category');
    }
});



// Product list
router.get('/product', function(req, res, next) {
    Course.find().populate('category').populate('instructor').sort({ createdAt: -1 }).lean().then(products => {
        res.render('admin/product/product-list', { 
            title: 'Quản lý Khóa học',
            products: products 
        });
    }).catch(err => {
        console.error(err);
        res.redirect('/admin');
    });
});

// Add Product - GET
router.get('/product/add', function(req, res, next) {
    Category.find().lean().then(categories => {
         res.render('admin/product/add-product', { 
            title: 'Thêm Khóa học',
            categories: categories
        });
    });
});

// Add Product - POST
router.post('/product/add', function(req, res, next) {
    const { title, category, price, originalPrice, duration, thumbnail, description, isActive, level, teachingMethod } = req.body;
    
    // Assumes the current logged in user is the instructor (admin is acting as one, or we should have a teacher selector)
    // For now, use the current user ID
    const instructor = req.user._id;

    const newCourse = new Course({
        title,
        category,
        instructor,
        price,
        originalPrice,
        duration,
        thumbnail,
        description,
        isActive: !!isActive,
        level,
        teachingMethod
    });

    newCourse.save().then(() => {
        req.flash('success_message', 'Thêm khóa học thành công!');
        res.redirect('/admin/product');
    }).catch(err => {
         console.error(err);
        req.flash('error_message', 'Lỗi khi thêm khóa học: ' + err.message);
        res.redirect('/admin/product/add');
    });
});

// Edit Product - GET
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
        console.error(err);
        res.redirect('/admin/product');
    });
});

// Edit Product - POST
router.post('/product/edit/:id', function(req, res, next) {
    const { title, category, price, originalPrice, duration, thumbnail, description, isActive, level, teachingMethod } = req.body;
    
    Course.findByIdAndUpdate(req.params.id, {
        title,
        category,
        price,
        originalPrice,
        duration,
        thumbnail,
        description,
        isActive: !!isActive,
        level,
        teachingMethod
    }).then(() => {
        req.flash('success_message', 'Cập nhật khóa học thành công!');
        res.redirect('/admin/product');
    }).catch(err => {
         console.error(err);
        req.flash('error_message', 'Lỗi khi cập nhật khóa học: ' + err.message);
        res.redirect('/admin/product/edit/' + req.params.id);
    });
});



// Delete User - POST
router.post('/users/delete/:id', function(req, res, next) {
    if (req.params.id == req.user._id) {
        req.flash('error_message', 'Không thể xóa tài khoản đang đăng nhập!');
        return res.redirect('/admin/users');
    }

    User.findByIdAndDelete(req.params.id).then(() => {
        req.flash('success_message', 'Đã xóa người dùng thành công!');
        res.redirect('back');
    }).catch(err => {
        console.error(err);
        req.flash('error_message', 'Lỗi khi xóa người dùng: ' + err.message);
        res.redirect('back');
    });
});

// === CONTACT MANAGEMENT ===
router.get('/contacts', function(req, res, next) {
    Contact.find().sort({ createdAt: -1 }).lean().then(contacts => {
        res.render('admin/contact/contact-list', {
            title: 'Quản lý Liên hệ',
            contacts: contacts
        });
    }).catch(err => {
        console.error(err);
        res.redirect('/admin');
    });
});

router.post('/contacts/update/:id', function(req, res, next) {
    const { status, adminNotes } = req.body;
    Contact.findByIdAndUpdate(req.params.id, {
        status,
        adminNotes
    }).then(() => {
        req.flash('success_message', 'Cập nhật trạng thái liên hệ thành công!');
        res.redirect('/admin/contacts');
    }).catch(err => {
        console.error(err);
        req.flash('error_message', 'Lỗi khi cập nhật liên hệ');
        res.redirect('/admin/contacts');
    });
});

router.post('/contacts/delete/:id', function(req, res, next) {
    Contact.findByIdAndDelete(req.params.id).then(() => {
        req.flash('success_message', 'Đã xóa liên hệ thành công!');
        res.redirect('/admin/contacts');
    }).catch(err => {
        console.error(err);
        req.flash('error_message', 'Lỗi khi xóa liên hệ');
        res.redirect('/admin/contacts');
    });
});

// === REVIEW MANAGEMENT ===
router.get('/reviews', function(req, res, next) {
    Review.find().populate('user').populate('course').sort({ createdAt: -1 }).lean().then(reviews => {
        res.render('admin/review/review-list', {
            title: 'Quản lý Đánh giá',
            reviews: reviews
        });
    }).catch(err => {
        console.error(err);
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
        console.error(err);
        res.redirect('/admin/reviews');
    });
});

// === LESSON MANAGEMENT ===
router.get('/lessons', function(req, res, next) {
    Lesson.find().populate('course').sort({ createdAt: -1 }).lean().then(lessons => {
        res.render('admin/lesson/lesson-list', {
            title: 'Quản lý Bài học',
            lessons: lessons
        });
    }).catch(err => {
        console.error(err);
        res.redirect('/admin');
    });
});

router.get('/lessons/add', function(req, res, next) {
    Course.find().lean().then(courses => {
        res.render('admin/lesson/add-lesson', {
            title: 'Thêm Bài học',
            courses: courses
        });
    });
});

router.post('/lessons/add', function(req, res, next) {
    const { title, course, videoUrl, content, duration, position, isFree } = req.body;
    const newLesson = new Lesson({
        title, course, videoUrl, content, duration, position, 
        isFree: !!isFree
    });
    newLesson.save().then(() => {
        req.flash('success_message', 'Thêm bài học thành công!');
        res.redirect('/admin/lessons');
    }).catch(err => {
        console.error(err);
        req.flash('error_message', 'Lỗi: ' + err.message);
        res.redirect('/admin/lessons/add');
    });
});

router.get('/lessons/edit/:id', function(req, res, next) {
    Promise.all([
        Lesson.findById(req.params.id).lean(),
        Course.find().lean()
    ]).then(([lesson, courses]) => {
        if (!lesson) return res.redirect('/admin/lessons');
        res.render('admin/lesson/edit-lesson', {
            title: 'Sửa Bài học',
            lesson: lesson,
            courses: courses
        });
    }).catch(err => {
        console.error(err);
        res.redirect('/admin/lessons');
    });
});

router.post('/lessons/edit/:id', function(req, res, next) {
    const { title, course, videoUrl, content, duration, position, isFree } = req.body;
    Lesson.findByIdAndUpdate(req.params.id, {
        title, course, videoUrl, content, duration, position,
        isFree: !!isFree
    }).then(() => {
        req.flash('success_message', 'Cập nhật bài học thành công!');
        res.redirect('/admin/lessons');
    }).catch(err => {
        console.error(err);
        req.flash('error_message', 'Lỗi: ' + err.message);
        res.redirect('/admin/lessons/edit/' + req.params.id);
    });
});

router.post('/lessons/delete/:id', function(req, res, next) {
    Lesson.findByIdAndDelete(req.params.id).then(() => {
        req.flash('success_message', 'Xóa bài học thành công!');
        res.redirect('/admin/lessons');
    }).catch(err => {
        console.error(err);
        req.flash('error_message', 'Lỗi: ' + err.message);
        res.redirect('/admin/lessons');
    });
});



// === QUESTION BANK MANAGEMENT ===
router.get('/questions', function(req, res, next) {
    Question.find().sort({ createdAt: -1 }).lean().then(questions => {
        res.render('admin/question/question-list', {
            title: 'Ngân hàng Câu hỏi',
            questions: questions
        });
    }).catch(err => {
        console.error(err);
        res.redirect('/admin');
    });
});

router.get('/questions/add', function(req, res, next) {
    res.render('admin/question/add-question', { title: 'Thêm Câu hỏi' });
});

router.post('/questions/add', function(req, res, next) {
    const { content, type, level, options, correctOption, explanation } = req.body;
    
    // Validate options: options should be array of strings
    // correctOption is index (0-3)

    let answers = [];
    if (options && Array.isArray(options)) {
        answers = options.map((opt, index) => ({
            text: opt,
            isCorrect: parseInt(correctOption) === index
        }));
    }

    const newQuestion = new Question({
        content,
        type,
        level,
        options: answers,
        explanation
    });

    newQuestion.save().then(() => {
        req.flash('success_message', 'Thêm câu hỏi thành công!');
        res.redirect('/admin/questions');
    }).catch(err => {
         console.error(err);
        req.flash('error_message', 'Lỗi: ' + err.message);
        res.redirect('/admin/questions/add');
    });
});

router.post('/questions/delete/:id', function(req, res, next) {
    Question.findByIdAndDelete(req.params.id).then(() => {
        req.flash('success_message', 'Xóa câu hỏi thành công!');
        res.redirect('/admin/questions');
    }).catch(err => {
        console.error(err);
        req.flash('error_message', 'Lỗi xóa câu hỏi: ' + err.message);
        res.redirect('/admin/questions');
    });
});


// === PRACTICE TEST MANAGEMENT ===
router.get('/tests', function(req, res, next) {
    PracticeTest.find().populate('category').sort({ createdAt: -1 }).lean().then(tests => {
        res.render('admin/test/test-list', {
            title: 'Quản lý Đề luyện thi',
            tests: tests
        });
    }).catch(err => {
         console.error(err);
        res.redirect('/admin');
    });
});

router.get('/tests/add', function(req, res, next) {
    Category.find().lean().then(categories => {
        res.render('admin/test/add-test', {
            title: 'Tạo Đề thi mới',
            categories: categories
        });
    });
});

router.post('/tests/add', function(req, res, next) {
    const { title, category, description, duration, totalScore, passingScore, isActive, isFree } = req.body;
    
    const newTest = new PracticeTest({
        title, category, description, duration, totalScore, passingScore,
        isActive: !!isActive,
        isFree: !!isFree,
        questions: [] // Init empty
    });

    newTest.save().then(savedTest => {
        req.flash('success_message', 'Tạo đề thi thành công! Hãy thêm câu hỏi.');
        // Redirect to manage questions page for this test
        res.redirect('/admin/tests/manage/' + savedTest._id);
    }).catch(err => {
        console.error(err);
        req.flash('error_message', 'Lỗi: ' + err.message);
        res.redirect('/admin/tests/add');
    });
});

// Edit Test - POST
router.post('/tests/edit/:id', async function(req, res, next) {
    const { title, category, description, duration, totalScore, passingScore, isActive, isFree } = req.body;
    try {
        await PracticeTest.findByIdAndUpdate(req.params.id, {
            title, category, description, duration, totalScore, passingScore,
            isActive: !!isActive,
            isFree: !!isFree
        });
        req.flash('success_message', 'Cập nhật đề thi thành công!');
        res.redirect('/admin/tests');
    } catch (err) {
        console.error(err);
        req.flash('error_message', 'Lỗi khi cập nhật: ' + err.message);
        res.redirect('/admin/tests/edit/' + req.params.id);
    }
});

// Manage Questions in Test
router.get('/tests/manage/:id', async function(req, res, next) {
    try {
        const test = await PracticeTest.findById(req.params.id).populate('questions').lean();
        if(!test) return res.redirect('/admin/tests');

        // Find questions NOT in this test
        const testQuestionIds = test.questions.map(q => q._id);
        const availableQuestions = await Question.find({ _id: { $nin: testQuestionIds } }).sort({createdAt: -1}).lean();

        res.render('admin/test/manage-questions', {
            title: 'Quản lý Câu hỏi - ' + test.title,
            test: test,
            availableQuestions: availableQuestions
        });
    } catch (err) {
        console.error(err);
        res.redirect('/admin/tests');
    }
});

// Add Question to Test
router.post('/tests/:testId/add-question/:questionId', async function(req, res, next) {
    try {
        await PracticeTest.findByIdAndUpdate(req.params.testId, {
            $addToSet: { questions: req.params.questionId }
        });
        // req.flash('success_message', 'Đã thêm câu hỏi vào đề.');
        res.redirect('/admin/tests/manage/' + req.params.testId);
    } catch (err) {
        console.error(err);
        res.redirect('/admin/tests/manage/' + req.params.testId);
    }
});

// Remove Question from Test
router.post('/tests/:testId/remove-question/:questionId', async function(req, res, next) {
    try {
        await PracticeTest.findByIdAndUpdate(req.params.testId, {
            $pull: { questions: req.params.questionId }
        });
        res.redirect('/admin/tests/manage/' + req.params.testId);
    } catch (err) {
        console.error(err);
        res.redirect('/admin/tests/manage/' + req.params.testId);
    }
});

router.post('/tests/delete/:id', function(req, res, next) {
    PracticeTest.findByIdAndDelete(req.params.id).then(() => {
        req.flash('success_message', 'Đã xóa đề thi.');
        res.redirect('/admin/tests');
    }).catch(err => {
        console.error(err);
        req.flash('error_message', 'Lỗi xóa đề thi: ' + err.message);
        res.redirect('/admin/tests');
    });
});

// === RESOURCE MANAGEMENT (Grammar/Vocabulary) ===
router.get('/resources', function(req, res, next) {
    Resource.find().sort({ createdAt: -1 }).lean().then(resources => {
        res.render('admin/resource/resource-list', {
            title: 'Quản lý Tài nguyên',
            resources: resources
        });
    }).catch(err => {
        console.error(err);
        res.redirect('/admin');
    });
});

router.get('/resources/add', function(req, res, next) {
    res.render('admin/resource/add-resource', { title: 'Thêm Tài nguyên' });
});

router.post('/resources/add', function(req, res, next) {
    const { title, type, content, thumbnail, isActive } = req.body;
    const newResource = new Resource({
        title, type, content, thumbnail,
        isActive: !!isActive
    });

    newResource.save().then(() => {
        req.flash('success_message', 'Thêm tài nguyên thành công!');
        res.redirect('/admin/resources');
    }).catch(err => {
        console.error(err);
        req.flash('error_message', 'Lỗi: ' + err.message);
        res.redirect('/admin/resources/add');
    });
});

router.get('/resources/edit/:id', function(req, res, next) {
    Resource.findById(req.params.id).lean().then(resource => {
        if(!resource) return res.redirect('/admin/resources');
        res.render('admin/resource/edit-resource', { 
            title: 'Sửa Tài nguyên',
            resource: resource
        });
    }).catch(err => {
        console.error(err);
        res.redirect('/admin/resources');
    });
});

router.post('/resources/edit/:id', function(req, res, next) {
    const { title, type, content, thumbnail, isActive } = req.body;
    
    Resource.findById(req.params.id).then(resource => {
        if(!resource) return res.redirect('/admin/resources');
        
        resource.title = title;
        resource.type = type;
        resource.content = content;
        resource.thumbnail = thumbnail;
        resource.isActive = !!isActive;

        return resource.save();
    }).then(() => {
        req.flash('success_message', 'Cập nhật tài nguyên thành công!');
        res.redirect('/admin/resources');
    }).catch(err => {
        console.error(err);
        req.flash('error_message', 'Lỗi: ' + err.message);
        res.redirect('/admin/resources/edit/' + req.params.id);
    });
});

router.post('/resources/delete/:id', function(req, res, next) {
    Resource.findByIdAndDelete(req.params.id).then(() => {
        req.flash('success_message', 'Xóa tài nguyên thành công!');
        res.redirect('/admin/resources');
    }).catch(err => {
        console.error(err);
        req.flash('error_message', 'Lỗi: ' + err.message);
        res.redirect('/admin/resources');
    });
});

// === ORDER MANAGEMENT ===
router.get('/orders', async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('user')
            .populate('items.course')
            .sort({ createdAt: -1 })
            .lean();
        res.render('admin/order/order-list', { title: 'Quản lý Đơn hàng', orders });
    } catch (err) {
        console.error(err);
        res.redirect('/admin');
    }
});

router.get('/orders/detail/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user')
            .populate('items.course')
            .lean();
        
        if (!order) {
            req.flash('error_message', 'Không tìm thấy đơn hàng!');
            return res.redirect('/admin/orders');
        }

        res.render('admin/order/order-detail', { 
            title: 'Chi tiết Đơn hàng #' + order._id, 
            order 
        });
    } catch (err) {
        console.error(err);
        res.redirect('/admin/orders');
    }
});

router.post('/orders/delete/:id', async (req, res) => {
    try {
        await Order.findByIdAndDelete(req.params.id);
        req.flash('success_message', 'Đã xóa đơn hàng thành công!');
        res.redirect('/admin/orders');
    } catch (err) {
        console.error(err);
        req.flash('error_message', 'Lỗi khi xóa đơn hàng');
        res.redirect('/admin/orders');
    }
});

router.post('/orders/update-status/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findById(req.params.id);
        if (!order) return res.redirect('/admin/orders');

        const oldStatus = order.status;
        order.status = status;
        await order.save();

        // Update enrollment in User model if status changed to/from 'completed'
        if (status === 'completed' && oldStatus !== 'completed') {
            await User.findByIdAndUpdate(order.user, {
                $addToSet: { enrolledCourses: { $each: order.items.map(item => item.course) } }
            });
        } else if (status !== 'completed' && oldStatus === 'completed') {
            await User.findByIdAndUpdate(order.user, {
                $pullAll: { enrolledCourses: order.items.map(item => item.course) }
            });
        }

        req.flash('success_message', 'Cập nhật trạng thái đơn hàng và quyền truy cập thành công!');
        res.redirect('/admin/orders');
    } catch (err) {
        console.error(err);
        req.flash('error_message', 'Lỗi khi cập nhật trạng thái.');
        res.redirect('/admin/orders');
    }
});

// === REVENUE REPORT ===
router.get('/reports/revenue', async (req, res) => {
    try {
        // Simple report: Monthly revenue for the current year
        const startOfYear = new Date(new Date().getFullYear(), 0, 1);
        const orders = await Order.find({
            status: 'completed',
            createdAt: { $gte: startOfYear }
        }).lean();

        let monthlyRevenue = new Array(12).fill(0);
        let totalRevenue = 0;

        orders.forEach(order => {
            const month = new Date(order.createdAt).getMonth();
            monthlyRevenue[month] += order.totalAmount;
            totalRevenue += order.totalAmount;
        });

        res.render('admin/report/revenue', {
            title: 'Báo cáo Doanh thu',
            monthlyRevenue: JSON.stringify(monthlyRevenue),
            totalRevenue,
            year: new Date().getFullYear()
        });
    } catch (err) {
        console.error(err);
        res.redirect('/admin');
    }
});

module.exports = router;