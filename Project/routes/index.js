var express = require('express');
var router = express.Router();
const User = require('../models/User');
const bcryptjs = require('bcryptjs');
const Course = require('../models/Course');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Contact = require('../models/Contact');
const Review = require('../models/Review');
const PracticeTest = require('../models/PracticeTest');
const TestResult = require('../models/TestResult');
const Resource = require('../models/Resource');
const Question = require('../models/Question');

// Middleware removed (query based login params)

router.all('/*', function(req, res, next) {
    res.locals.layout = 'home';
    next();
});



const passport = require('passport'); // Add require if not present, but usually in app.js is enough if configured there. 
// Wait, router uses passport.authenticate middleware, so we probably need to require passport here too to use 'passport.authenticate' function.
// Actually, passport instance is required.

router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/login/success-handler', // Redirect to intermediate handler or check role
        failureRedirect: '/login',
        failureFlash: true,
        successFlash: 'Đăng nhập thành công!'
    })(req, res, next);
});

// Intermediate handler to check role after passport success
router.get('/login/success-handler', (req, res) => {
    if (req.user.role === 'admin') {
        res.redirect('/admin');
    } else {
        const returnTo = req.session.returnTo || '/';
        delete req.session.returnTo;
        res.redirect(returnTo);
    }
});

router.post('/register', async (req, res, next) => {
    let errors = [];
    const { firstName, lastName, email, password } = req.body;

    if (!firstName) errors.push('Vui lòng nhập Tên (First Name)');
    if (!lastName) errors.push('Vui lòng nhập Họ (Last Name)');
    if (!email) errors.push('Vui lòng nhập Email');
    if (!password) errors.push('Vui lòng nhập Mật khẩu');

    if (errors.length > 0) {
        errors.forEach(error => req.flash('registerErrors', error));
        req.flash('registerData', req.body);
        return res.redirect('/register');
    }

    try {
        const user = await User.findOne({ email: email });
        if (user) {
            req.flash('error_message', 'Email đã tồn tại!');
            req.flash('registerData', req.body);
            return res.redirect('/register');
        }

        const newUser = new User({
            email,
            password,
            firstName,
            lastName,
            role: 'user'
        });

        // ⚡ TỐI ƯU: Sử dụng async/await và Giảm Salt Rounds xuống 8 để tăng tốc độ phản hồi
        // (Vẫn đảm bảo an toàn cơ bản cho đồ án)
        const salt = await bcryptjs.genSalt(8);
        newUser.password = await bcryptjs.hash(newUser.password, salt);
        
        await newUser.save();
        
        req.flash('success_message', 'Đăng ký thành công! Vui lòng đăng nhập.');
        res.redirect('/login');

    } catch (err) {
        console.error("Register Error:", err);
        req.flash('error_message', 'Lỗi hệ thống: ' + err.message);
        res.redirect('/register');
    }
});

router.get('/login', (req, res) => {
    res.render('home/login', {title: 'Login'});
});

// ... Testimonials ...

router.get('/logout', (req, res, next) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        req.session.destroy(err => {
             res.redirect('/login');
        });
    });
});



router.get('/register', function (req, res, next) {
    const errors = req.flash('registerErrors');
    const data = req.flash('registerData')[0] || {};
    res.render('home/register', {
        title: 'Register', 
        errors: errors,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email
    });
})


router.get('/', async function(req, res, next) {
    try {
        const [categories, popularCourses, instructors, testimonials] = await Promise.all([
            Category.find({ isActive: true }).lean(),
            Course.find({ isActive: true }).limit(3).populate('instructor').lean(),
            User.find({ role: 'admin' }).limit(4).lean(),
            Review.find({ rating: { $gte: 4 }, isActive: true }).sort({ createdAt: -1 }).limit(4).populate('user').lean()
        ]);

        res.render('home/index', {
            title: 'EnglishMaster - Trang chủ',
            categories: categories,
            popularCourses: popularCourses,
            instructors: instructors,
            testimonials: testimonials,
            activePage: 'home'
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
});


router.get('/404', function(req, res, next) {
    res.render('home/404', { title: '404 - Page Not Found' });
});


router.get('/about', function(req, res, next) {
    res.render('home/about', { title: 'Về chúng tôi - EnglishMaster', activePage: 'about' });
});

router.get('/contact', function(req, res, next) {
    res.render('home/contact', { title: 'Liên hệ - EnglishMaster', activePage: 'contact' });
});

router.post('/contact', function(req, res, next) {
    const { name, email, phone, course, level, message, isConsultationRequested } = req.body;
    const newContact = new Contact({
        name, email, phone, course, level, message, 
        isConsultationRequested: !!isConsultationRequested
    });
    newContact.save().then(() => {
        req.flash('success_message', 'Cảm ơn bạn! Chúng tôi đã nhận được tin nhắn và sẽ liên hệ sớm.');
        res.redirect('/contact');
    }).catch(err => {
        console.error(err);
        req.flash('error_message', 'Lỗi gửi tin nhắn: ' + err.message);
        res.redirect('/contact');
    });
});

router.get('/courses', async function(req, res, next) {
    try {
        const { minPrice, maxPrice, category, level, method, sort, search } = req.query;
        let query = { isActive: true };

        console.log('--- Course Filter Debug ---');
        console.log('Original Query Params:', req.query);

        // Search by title
        if (search) {
            query.title = new RegExp(search, 'i');
        }

        // Price filter
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice && minPrice !== "0") query.price.$gte = Number(minPrice);
            if (maxPrice && maxPrice !== "10000000") query.price.$lte = Number(maxPrice);
            
            // If empty, clean up
            if (Object.keys(query.price).length === 0) delete query.price;
        }

        // Category filter
        if (category) {
            const catArray = Array.isArray(category) ? category : [category];
            query.category = { $in: catArray };
        }

        // Level filter
        if (level) {
            const levelArray = Array.isArray(level) ? level : [level];
            query.level = { $in: levelArray };
        }

        // Teaching Method
        if (method) {
            const methodArray = Array.isArray(method) ? method : [method];
            query.teachingMethod = { $in: methodArray };
        }

        console.log('Generated MongoDB Query:', JSON.stringify(query, null, 2));

        // Sorting
        let sortQuery = { createdAt: -1 }; // Default: Newest
        if (sort === 'price-asc') sortQuery = { price: 1 };
        if (sort === 'price-desc') sortQuery = { price: -1 };
        if (sort === 'popularity') sortQuery = { averageRating: -1 }; // Simulation
        if (sort === 'rating') sortQuery = { averageRating: -1 };

        const [courses, categories, levels, methods] = await Promise.all([
            Course.find(query).populate('instructor').populate('category').sort(sortQuery).lean(),
            Category.find({ isActive: true }).lean(),
            Course.distinct('level', { isActive: true }),
            Course.distinct('teachingMethod', { isActive: true })
        ]);

        res.render('home/courses', { 
            title: 'Khóa học - EnglishMaster',
            courses: courses,
            categories: categories,
            levels: levels,
            methods: methods,
            levels: levels,
            methods: methods,
            filters: req.query, // Pass back to maintain states
            activePage: 'courses'
        });
    } catch (err) {
         console.error(err);
         next(err);
    }
});
// Course Detail
router.get('/courses/:id', async function(req, res, next) {
    try {
        const course = await Course.findById(req.params.id).populate('instructor').lean();
        if (!course) {
            return res.redirect('/404');
        }
        const categories = await Category.find({ isActive: true }).lean();
        const reviews = await Review.find({ course: req.params.id, isActive: true }).populate('user').sort({createdAt: -1}).lean();
        
        res.render('home/course-detail', { 
            title: course.title + ' - EnglishMaster',
            course: course,
            categories: categories,
            course: course,
            categories: categories,
            reviews: reviews,
            activePage: 'courses'
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
});

router.post('/courses/:id/review', async function(req, res, next) {
    if (!req.isAuthenticated()) {
        req.flash('error_message', 'Vui lòng đăng nhập để đánh giá');
        req.session.returnTo = '/courses/' + req.params.id;
        return res.redirect('/login');
    }

    try {
        const { rating, comment } = req.body;
        const newReview = new Review({
            user: req.user._id,
            course: req.params.id,
            rating,
            comment,
            type: 'course'
        });
        await newReview.save();
        req.flash('success_message', 'Đánh giá của bạn đã được gửi!');
        res.redirect('/courses/' + req.params.id);
    } catch (err) {
        console.error(err);
        req.flash('error_message', 'Lỗi gửi đánh giá: ' + err.message);
        res.redirect('/courses/' + req.params.id);
    }
});


router.get('/team', function(req, res, next) {
    res.render('home/team', { title: 'Đội ngũ giảng viên - EnglishMaster', activePage: 'team' });
});

router.get('/testimonial', function(req, res, next) {
    res.render('home/testimonial', { title: 'Đánh giá học viên - EnglishMaster' });
});

// Cart Management

// Helper function to calculate cart totals
function calculateCartTotals(cart) {
    let totalQty = 0;
    let totalPrice = 0;
    cart.items.forEach(item => {
        totalQty += item.quantity;
        totalPrice += item.price * item.quantity;
    });
    cart.totalQty = totalQty;
    cart.totalPrice = totalPrice;
}

router.get('/cart', async function(req, res, next) {
    if (!req.session.cart) {
        req.session.cart = { items: [], totalQty: 0, totalPrice: 0 };
    }
    
    try {
        // Fetch 3 random suggested courses (or just latest)
        const suggestedCourses = await Course.aggregate([
            { $match: { isActive: true } },
            { $sample: { size: 3 } }
        ]);

        res.render('home/cart', { 
            title: 'Giỏ hàng - EnglishMaster',
            title: 'Giỏ hàng - EnglishMaster',
            cart: req.session.cart,
            suggestedCourses: suggestedCourses,
            activePage: 'cart'
        });
    } catch (err) {
        console.error(err);
        res.render('home/cart', { 
            title: 'Giỏ hàng - EnglishMaster',
            cart: req.session.cart,
            suggestedCourses: []
        });
    }
});

router.post('/cart/add/:id', async function(req, res, next) {
    const courseId = req.params.id;
    if (!req.session.cart) {
        req.session.cart = { items: [], totalQty: 0, totalPrice: 0 };
    }
    const cart = req.session.cart;
    
    // Check if item already exists
    const existingItemIndex = cart.items.findIndex(item => item._id == courseId);

    if (existingItemIndex > -1) {
        cart.items[existingItemIndex].quantity += 1;
    } else {
        try {
            const course = await Course.findById(courseId).lean();
            if (course) {
                cart.items.push({
                    _id: course._id,
                    title: course.title,
                    price: course.price,
                    thumbnail: course.thumbnail,
                    duration: course.duration,
                    quantity: 1
                });
            }
        } catch (err) {
            console.error(err);
            req.flash('error_message', 'Lỗi khi thêm vào giỏ hàng');
            return res.redirect('back');
        }
    }
    calculateCartTotals(cart);
    req.flash('success_message', 'Đã thêm khóa học vào giỏ hàng');
    res.redirect('/cart');
});

router.post('/cart/update/:id', function(req, res, next) {
    const courseId = req.params.id;
    const quantity = parseInt(req.body.quantity);
    if (req.session.cart) {
        const cart = req.session.cart;
        const itemIndex = cart.items.findIndex(item => item._id == courseId);
        if (itemIndex > -1) {
             if (quantity > 0) {
                cart.items[itemIndex].quantity = quantity;
             } else {
                 cart.items.splice(itemIndex, 1);
             }
             calculateCartTotals(cart);
        }
    }
    res.redirect('/cart');
});

router.post('/cart/remove/:id', function(req, res, next) {
    const courseId = req.params.id;
    if (req.session.cart) {
        const cart = req.session.cart;
        const itemIndex = cart.items.findIndex(item => item._id == courseId);
        if (itemIndex > -1) {
            cart.items.splice(itemIndex, 1);
            calculateCartTotals(cart);
        }
    }
    req.flash('success_message', 'Đã xóa khóa học khỏi giỏ hàng');
    res.redirect('/cart');
});

// Checkout Routes
router.get('/checkout', function(req, res, next) {
    if (!req.session.cart || req.session.cart.items.length === 0) {
        req.flash('error_message', 'Giỏ hàng trống');
        return res.redirect('/cart');
    }
    res.render('home/checkout', {
        title: 'Thanh toán - EnglishMaster',
        cart: req.session.cart
    });
});

router.post('/checkout/confirm', async function(req, res, next) {
    if (!req.session.cart || req.session.cart.items.length === 0) {
        return res.redirect('/cart');
    }
    
    // Require login for checkout
    if (!req.isAuthenticated()) {
        req.flash('error_message', 'Vui lòng đăng nhập để thanh toán');
        req.session.returnTo = '/checkout';
        return res.redirect('/login');
    }

    try {
        const cart = req.session.cart;
        const order = new Order({
            user: req.user._id,
            items: cart.items.map(item => ({
                course: item._id,
                price: item.price
            })),
            totalAmount: cart.totalPrice,
            status: 'pending',
            paymentMethod: req.body.paymentMethod || 'bank_transfer'
        });

        await order.save();

        // Enroll user in courses (simulating payment success)
        await User.findByIdAndUpdate(req.user._id, {
            $addToSet: { enrolledCourses: { $each: cart.items.map(item => item._id) } }
        });

        // Clear cart
        req.session.cart = { items: [], totalQty: 0, totalPrice: 0 };
        
        req.flash('success_message', 'Đặt hàng thành công! Các khóa học đã được mở cho bạn trong Hồ sơ.');
        res.redirect('/profile');

    } catch (err) {
        console.error(err);
        req.flash('error_message', 'Lỗi khi xử lý đơn hàng: ' + err.message);
        res.redirect('/checkout');
    }
});

// User Profile
router.get('/profile', async function(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }

    try {
        const [orders, testResults, categories] = await Promise.all([
            Order.find({ user: req.user._id })
                .populate({
                    path: 'items.course',
                    populate: { path: 'category' }
                })
                .sort({ createdAt: -1 })
                .lean(),
            TestResult.find({ user: req.user._id })
                .populate({
                    path: 'test',
                    populate: { path: 'category' }
                })
                .sort({ createdAt: -1 })
                .lean(),
            Category.find({ isActive: true }).lean()
        ]);

        res.render('home/profile', {
            title: 'Hồ sơ cá nhân',
            orders: orders,
            testResults: testResults,
            categories: categories
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
});


// === FRONTEND PRACTICE TESTS ===

router.get('/tests', async function(req, res, next) {
    try {
        const tests = await PracticeTest.find({ isActive: true, isFree: true }).populate('category').lean();
        res.render('home/tests', {
            title: 'Luyện thi Online - EnglishMaster',
            tests: tests,
            tests: tests,
            isPortal: true,
            activePage: 'tests'
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
});

router.get('/tests/:id', async function(req, res, next) {
    if (!req.isAuthenticated()) {
        req.flash('error_message', 'Vui lòng đăng nhập để làm bài thi.');
        req.session.returnTo = '/tests/' + req.params.id;
        return res.redirect('/login');
    }

    try {
        const test = await PracticeTest.findById(req.params.id)
            .populate({
                path: 'questions',
                populate: { path: 'options' } // Assumption: options embedded or referenced? They are embedded in Question schema but check model.
            })
            .lean();
        
        if (!test || !test.isActive) return res.redirect('/tests');

        res.render('home/do-test', {
            title: 'Làm bài: ' + test.title,
            title: 'Làm bài: ' + test.title,
            test: test,
            activePage: 'tests'
        });
    } catch (err) {
        console.error(err);
        res.redirect('/tests');
    }
});

router.post('/tests/:id/submit', async function(req, res, next) {
    if (!req.isAuthenticated()) return res.redirect('/login');
    
    try {
        const testId = req.params.id;
        const userAnswers = req.body.answers || {}; // Object: key=questionId, value=selectedOptionText
        
        const test = await PracticeTest.findById(testId).populate('questions').lean();
        if (!test) return res.redirect('/tests');

        let score = 0;
        let correctCount = 0;
        let resultsDetail = [];

        test.questions.forEach(q => {
            const selectedText = userAnswers[q._id];
            
            // Find correct option for this question
            const correctOpt = q.options.find(o => o.isCorrect);
            const isCorrect = correctOpt && selectedText === correctOpt.text;

            if (isCorrect) {
                correctCount++;
            }

            resultsDetail.push({
                question: q._id,
                selectedOption: selectedText,
                isCorrect: isCorrect
            });
        });

        // Calculate score
        // Simple logic: (correct / total) * totalScore
        const totalQ = test.questions.length;
        if (totalQ > 0) {
            score = Math.round((correctCount / totalQ) * test.totalScore);
        }

        const isPassed = score >= test.passingScore;

        const newResult = new TestResult({
            user: req.user._id,
            test: test._id,
            score,
            correctAnswers: correctCount,
            totalQuestions: totalQ,
            answers: resultsDetail,
            isPassed
        });

        await newResult.save();
        res.redirect(`/tests/${testId}/result/${newResult._id}`);

    } catch (err) {
         console.error(err);
         res.redirect('/tests');
    }
});

router.get('/tests/:id/result/:resultId', async function(req, res, next) {
     if (!req.isAuthenticated()) return res.redirect('/login');

     try {
         const result = await TestResult.findById(req.params.resultId)
            .populate({
                path: 'answers.question',
                model: 'Question'
            })
            .lean();
        
        const test = await PracticeTest.findById(req.params.id).lean();

        if (!result || !test || result.user.toString() !== req.user._id.toString()) {
            return res.redirect('/tests');
        }

        // Map detailed results for display
        const detailedResults = result.answers.map(ans => {
            return {
                question: ans.question,
                selectedOption: ans.selectedOption,
                isCorrect: ans.isCorrect
            };
        });

        res.render('home/test-result', {
            title: 'Kết quả thi: ' + test.title,
            test: test,
            result: result,
            detailedResults: detailedResults
        });

     } catch (err) {
         console.error(err);
         res.redirect('/tests');
     }
});

// === PRACTICE PROGRAMS (TOEIC, IELTS, TOEFL) ===
async function checkExamAccess(req, res, categoryName) {
    if (!req.isAuthenticated()) return res.redirect('/login');
    
    try {
        const cat = await Category.findOne({ name: new RegExp(categoryName, 'i') });
        if (!cat) return res.redirect('/404');

        const user = await User.findById(req.user._id).lean();
        if (!user) return res.redirect('/login');

        if (user.role === 'admin') return { cat, hasAccess: true };

        // Check if user is enrolled in any course belonging to this category
        const coursesInCat = await Course.find({ category: cat._id }).select('_id');
        const courseIdsInCat = coursesInCat.map(c => c._id.toString());
        const enrolledCourses = user.enrolledCourses || [];
        const hasAccess = enrolledCourses.some(id => courseIdsInCat.includes(id.toString()));

        return { cat, hasAccess };
    } catch (err) {
        console.error(err);
        return { error: true };
    }
}

// Dynamic Exam Category Route (General)
router.get('/:categorySlug', async (req, res, next) => {
    // List of static routes to ignore to avoid conflicts
    const staticRoutes = ['login', 'register', 'logout', 'profile', 'courses', 'tests', 'cart', 'contact', 'about', 'grammar', 'vocabulary', 'practice', 'admin'];
    if (staticRoutes.includes(req.params.categorySlug)) {
        return next(); // Let other specific routes handle it
    }

    try {
        const cat = await Category.findOne({ slug: req.params.categorySlug, isActive: true });
        if (!cat) {
            return next(); // Move to 404 if no category found
        }
        
        const tests = await PracticeTest.find({ category: cat._id, isActive: true })
            .populate('category')
            .lean();
            
        res.render('home/tests', { 
            title: 'Luyện thi ' + cat.name, 
            tests, 
            currentCategory: cat.name 
        });
    } catch (err) { 
        console.error(err);
        res.redirect('/404'); 
    }
});

router.get('/practice', (req, res) => res.redirect('/tests'));

// === RESOURCES (Grammar, Vocabulary) ===
router.get('/grammar', async (req, res) => {
    try {
        const resources = await Resource.find({ type: 'grammar', isActive: true }).sort({createdAt: -1}).lean();
        res.render('home/resources', { title: 'Ngữ pháp (Grammar)', resources, type: 'Grammar' });
    } catch (err) { res.redirect('/404'); }
});

router.get('/vocabulary', async (req, res) => {
    try {
        const resources = await Resource.find({ type: 'vocabulary', isActive: true }).sort({createdAt: -1}).lean();
        res.render('home/resources', { title: 'Từ vựng (Vocabulary)', resources, type: 'Vocabulary' });
    } catch (err) { res.redirect('/404'); }
});

// Resource Detail
router.get('/resources/:id', async (req, res) => {
    try {
        const resource = await Resource.findById(req.params.id).lean();
        if(!resource) return res.redirect('/404');
        res.render('home/resource-detail', { title: resource.title, resource });
    } catch (err) { res.redirect('/404'); }
});

// Helper route to create admin user
router.get('/create-admin', (req, res) => {
    const newUser = new User({
        firstName: 'Admin',
        lastName: 'System',
        email: 'admin@example.com',
        password: 'admin',
        role: 'admin'
    });

    bcryptjs.genSalt(10, function (err, salt) {
        bcryptjs.hash(newUser.password, salt, (err, hash) => {
            newUser.password = hash;
            newUser.save()
            .then(user => {
                res.send('Admin user created. Email: admin@example.com, Password: admin');
            })
            .catch(err => {
                res.send('Error creating admin (maybe email exists?): ' + err.message);
            });
        });
    });
});

// Review Submission
router.post('/reviews', async (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash('error_message', 'Vui lòng đăng nhập để gửi đánh giá.');
        return res.redirect('back');
    }

    try {
        const { rating, comment, courseId, type } = req.body;
        const newReview = new Review({
            user: req.user._id,
            course: courseId || null,
            type: type || 'course',
            rating: parseInt(rating),
            comment: comment
        });

        await newReview.save();
        req.flash('success_message', 'Cảm ơn bạn đã gửi đánh giá!');
        res.redirect('back');
    } catch (err) {
        console.error(err);
        req.flash('error_message', 'Có lỗi xảy ra khi gửi đánh giá.');
        res.redirect('back');
    }
});

module.exports = router;