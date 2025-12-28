var express = require('express');
var router = express.Router();
const User = require('../models/User');
const bcryptjs = require('bcryptjs');
const Course = require('../models/Course');
const Category = require('../models/Category');

const Contact = require('../models/Contact');
const Review = require('../models/Review');
const Post = require('../models/Post');


router.all('/*', function(req, res, next) {
    res.locals.layout = 'home';
    next();
});

const passport = require('passport'); 

router.post('/login', (req, res, next) => {
    const { email, password } = req.body;

    if (!email && !password) {
        req.flash('error_message', 'Vui lòng nhập email và mật khẩu');
        return res.redirect('/login');
    } else if (!email) {
        req.flash('error_message', 'Vui lòng nhập email');
        return res.redirect('/login');
    } else if (!password) {
        req.flash('error_message', 'Vui lòng nhập mật khẩu');
        return res.redirect('/login');
    } else if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
        req.flash('error_message', 'Email sai định dạng');
        return res.redirect('/login');
    }

    passport.authenticate('local', (err, user, info) => {
        if (err) return next(err);
        if (!user) {
            req.flash('error_message', info.message || 'Đăng nhập thất bại');
            return res.redirect('/login');
        }

        // Only allow 'user' role on this page
        if (user.role === 'admin') {
            req.flash('error_message', 'Tài khoản Admin vui lòng đăng nhập tại trang quản trị.');
            return res.redirect('/login');
        }

        req.logIn(user, (err) => {
            if (err) return next(err);
            req.flash('success_message', 'Đăng nhập thành công!');
            const returnTo = req.session.returnTo || '/';
            delete req.session.returnTo;
            res.redirect(returnTo);
        });
    })(req, res, next);
});

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

    if (!firstName && !lastName && !email && !password) {
        errors.push('Vui lòng nhập đầy đủ thông tin');
    } else {
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
            if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
                errors.push('Mật khẩu phải bao gồm kí tự đặc biệt');
            }
            if (!/[0-9]/.test(password)) {
                errors.push('Mật khẩu phải bao gồm số');
            }
        }
    }

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
        const [categories, allCourses, instructors, testimonials, posts] = await Promise.all([
            Category.find({ isActive: true }).select('name description').lean(),
            Course.find({ isActive: true })
                .populate('category', 'name isActive')
                .select('title price thumbnail averageRating category')
                .limit(6)
                .lean(),
            User.find({ role: 'admin' }).select('firstName lastName avatar').limit(4).lean(),
            Review.find({ rating: { $gte: 4 }, isActive: true })
                .sort({ createdAt: -1 })
                .limit(4)
                .populate('user', 'firstName lastName')
                .select('rating comment user')
                .lean(),
            Post.find({ isActive: true })
                .sort({ createdAt: -1 })
                .limit(3)
                .populate('author', 'firstName lastName')
                .lean()
        ]);

        const popularCourses = allCourses.filter(course => 
            course.category && course.category.isActive
        ).slice(0, 3).map(c => {
            if (!c.thumbnail || c.thumbnail === '/img/default-course.jpg') c.thumbnail = '/img/course-1.jpg';
            return c;
        });

        const safeInstructors = instructors.map(i => {
            if (!i.avatar || i.avatar === '/img/default-avatar.jpg') i.avatar = '/img/avatar.jpg';
            return i;
        });

        res.render('home/index', {
            title: 'EnglishMaster - Trang chủ',
            categories: categories,
            popularCourses: popularCourses,
            instructors: safeInstructors,
            testimonials: testimonials,
            posts: posts,
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

router.get('/about', async function(req, res, next) {
    try {
        const instructors = await User.find({ role: 'admin' }).select('firstName lastName avatar').limit(4).lean();
        res.render('home/about', { 
            title: 'Về chúng tôi - EnglishMaster', 
            activePage: 'about',
            instructors: instructors 
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
});

router.get('/contact', function(req, res, next) {
    res.render('home/contact', { title: 'Liên hệ - EnglishMaster', activePage: 'contact' });
});

router.post('/contact', function(req, res, next) {
    const { name, email, phone, course, level, message, isConsultationRequested } = req.body;
    const newContact = new Contact({
        name, email, phone, course, level, message, 
        isConsultationRequested: !!isConsultationRequested,
        user: req.user ? req.user._id : null
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

        if (search) {
            query.title = new RegExp(search, 'i');
        }

        if (minPrice || maxPrice) {
            query.price = {};
            const min = parseInt(minPrice) || 0;
            const max = parseInt(maxPrice) || 10000000;
            
            // Luôn đặt cả gte và lte để tạo thành 1 khoảng lọc chính xác
            query.price.$gte = min;
            query.price.$lte = max;
            
            // Nếu là khoảng mặc định (0 - 10tr) thì có thể bỏ qua query để tối ưu (tùy chọn)
            if (min === 0 && max === 10000000) delete query.price;
        }

        // Pagination setup
        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const skip = (page - 1) * limit;

        // Ensure category filter only matches active categories if not specified
        if (!query.category) {
            const activeCategories = await Category.find({ isActive: true }).select('_id').lean();
            const activeCatIds = activeCategories.map(c => c._id);
            query.category = { $in: activeCatIds };
        } else {
            // If categories are provided, we should still ensure they are active
            const catArray = Array.isArray(category) ? category : [category];
            const activeCategories = await Category.find({ _id: { $in: catArray }, isActive: true }).select('_id').lean();
            const activeCatIds = activeCategories.map(c => c._id);
            query.category = { $in: activeCatIds };
        }

        if (level) {
            const levelArray = Array.isArray(level) ? level : [level];
            query.level = { $in: levelArray };
        }

        if (method) {
            const methodArray = Array.isArray(method) ? method : [method];
            query.teachingMethod = { $in: methodArray };
        }

        let sortQuery = { createdAt: -1 }; 
        if (sort === 'price-asc') sortQuery = { price: 1 };
        if (sort === 'price-desc') sortQuery = { price: -1 };
        if (sort === 'popularity') sortQuery = { averageRating: -1 }; 
        if (sort === 'rating') sortQuery = { averageRating: -1 };

        const [courses, totalCourses, categories, levels, methods] = await Promise.all([
            Course.find(query).populate('category').sort(sortQuery).skip(skip).limit(limit).lean(),
            Course.countDocuments(query),
            Category.find({ isActive: true }).lean(),
            Course.distinct('level', { isActive: true }),
            Course.distinct('teachingMethod', { isActive: true })
        ]);

        const totalPages = Math.ceil(totalCourses / limit);

        res.render('home/courses', { 
            title: 'Khóa học - EnglishMaster',
            courses: courses,
            categories: categories,
            levels: levels,
            methods: methods,
            filters: req.query, 
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
                prevPage: page - 1,
                nextPage: page + 1,
                pages: Array.from({ length: totalPages }, (_, i) => i + 1)
            },
            activePage: 'courses'
        });
    } catch (err) {
         console.error(err);
         next(err);
    }
});

router.get('/courses/:id/learn', (req, res) => res.redirect('/'));

router.get('/courses/:id', (req, res) => res.redirect('/courses'));



router.get('/team', async function(req, res, next) {
    try {
        const instructors = await User.find({ role: 'admin' }).select('firstName lastName avatar').limit(4).lean();
        res.render('home/team', { 
            title: 'Đội ngũ giảng viên - EnglishMaster', 
            activePage: 'team',
            instructors: instructors 
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
});

router.get('/blog', async function(req, res, next) {
    try {
        const posts = await Post.find({ isActive: true }).sort({ createdAt: -1 }).populate('author', 'firstName lastName').lean();
        res.render('home/blog', { 
            title: 'Bài viết - EnglishMaster', 
            activePage: 'blog',
            posts: posts
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
});

router.get('/blog/:slug', async function(req, res, next) {
    try {
        const post = await Post.findOne({ slug: req.params.slug, isActive: true }).populate('author', 'firstName lastName').lean();
        if (!post) return res.redirect('/404');
        res.render('home/post-detail', { 
            title: post.title + ' - EnglishMaster', 
            activePage: 'blog',
            post: post
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
});

router.get('/reviews', async function(req, res, next) {
    try {
        const reviews = await Review.find({ isActive: true }).sort({ createdAt: -1 }).populate('user', 'firstName lastName').lean();
        res.render('home/reviews', { 
            title: 'Đánh giá học viên - EnglishMaster', 
            activePage: 'reviews',
            reviews: reviews
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
});

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
        const suggestedCourses = await Course.aggregate([
            { $match: { isActive: true } },
            { $sample: { size: 3 } }
        ]);

        res.render('home/cart', { 
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

router.post('/courses/:id/enroll', async function(req, res, next) {
    if (!req.isAuthenticated()) {
        req.flash('error_message', 'Vui lòng đăng nhập để đăng ký khóa học');
        req.session.returnTo = '/courses';
        return res.redirect('/login');
    }

    try {
        const courseId = req.params.id;
        const course = await Course.findById(courseId).lean();
        
        if (!course) {
            req.flash('error_message', 'Không tìm thấy khóa học');
            return res.redirect('/courses');
        }

        const user = await User.findById(req.user._id);
        if (user.enrolledCourses.includes(courseId)) {
            req.flash('success_message', 'Bạn đã đăng ký khóa học này rồi!');
            return res.redirect('/profile');
        }



        user.enrolledCourses.push(courseId);
        await user.save();

        req.flash('success_message', `Đăng ký thành công khóa học: ${course.title}!`);
        res.redirect('/profile');

    } catch (err) {
        console.error(err);
        req.flash('error_message', 'Lỗi khi đăng ký khóa học: ' + err.message);
        res.redirect('/courses');
    }
});

router.get('/profile', async function(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }

    try {
        const [userWithCourses, contacts, reviews] = await Promise.all([
            User.findById(req.user._id).populate('enrolledCourses').lean(),
            Contact.find({ 
                $or: [
                    { user: req.user._id },
                    { email: req.user.email }
                ]
            }).sort({ createdAt: -1 }).lean(),
            Review.find({ user: req.user._id }).populate('course').sort({ createdAt: -1 }).lean()
        ]);

        res.render('home/profile', {
            title: 'Hồ sơ cá nhân',
            user: userWithCourses,
            enrolledCourses: userWithCourses.enrolledCourses,
            contacts: contacts,
            reviews: reviews
        });
    } catch (err) {
        console.error(err);
        next(err);
    }
});

router.get('/tests', (req, res) => res.redirect('/'));
router.get('/tests/:id', (req, res) => res.redirect('/'));
router.post('/tests/:id/submit', (req, res) => res.redirect('/'));
router.get('/tests/:id/result/:resultId', (req, res) => res.redirect('/'));

async function checkExamAccess(req, res, categoryName) {
    if (!req.isAuthenticated()) return res.redirect('/login');
    
    try {
        const cat = await Category.findOne({ name: new RegExp(categoryName, 'i') });
        if (!cat) return res.redirect('/404');

        const user = await User.findById(req.user._id).lean();
        if (!user) return res.redirect('/login');

        if (user.role === 'admin') return { cat, hasAccess: true };

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

router.get('/:categorySlug', (req, res, next) => next());

router.get('/practice', (req, res) => res.redirect('/tests'));

router.get('/grammar', (req, res) => res.redirect('/'));
router.get('/vocabulary', (req, res) => res.redirect('/'));
router.get('/resources/:id', (req, res) => res.redirect('/'));

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