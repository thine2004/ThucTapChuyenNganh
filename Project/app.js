var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const session = require('express-session');
const { engine } = require('express-handlebars');
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const User = require('./models/User'); // Đảm bảo mô hình User được include
const flash = require('connect-flash');

// --- PHẦN QUAN TRỌNG: CẤU HÌNH KẾT NỐI DATABASE ---
const dbUrl = process.env.MONGO_URI || 'mongodb://localhost:27017/English';

mongoose.connect(dbUrl)
  .then(() => {
    console.log('✅ MongoDB Connected!');
    // Log ra để biết đang kết nối vào đâu (Local hay Atlas)
    console.log(`Connected to: ${dbUrl.includes('localhost') ? 'Localhost' : 'MongoDB Atlas (Cloud)'}`);
  })
  .catch(err => {
    console.error("❌ Error connecting to mongodb:", err);
  });
// --------------------------------------------------

var app = express();

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const adminRouter = require('./routes/admin');


app.engine('hbs', engine({
    extname: '.hbs',
    defaultLayout: 'home',
    partialsDir: path.join(__dirname, 'views', 'partials'),
    layoutsDir: path.join(__dirname, 'views', 'layouts'),
    // SỬA LỖI: Thay đổi if_eq thành Inline Helper để tránh lỗi opts.inverse
    helpers: {
        addOne: function(index) {
            return index + 1;
        },
        eq: function(a, b) {
            return a && b && a.toString() === b.toString();
        },
        includes: function(array, value) {
            if (!Array.isArray(array) || !value) return false;
            const upperArray = array.map(v => v.toString().toUpperCase());
            return upperArray.includes(value.toString().toUpperCase());
        },
        isIn: function(value, list) {
            if (!list) return false;
            if (Array.isArray(list)) {
                return list.map(v => v.toString()).includes(value.toString());
            }
            return value.toString() === list.toString();
        },
        multiply: function(a, b) {
            return Number(a) * Number(b);
        },
        subtract: function(a, b) {
            return Number(a) - Number(b);
        },
        if_eq: function(a, b, opts) {
            if (a && b && a.toString() === b.toString()) {
                return opts.fn(this);
            }
            return opts.inverse(this);
        },
        or: function() {
            return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
        },
        not: function(value) {
            return !value;
        },
        lte: function(a, b) {
            return Number(a) <= Number(b);
        },
        range: function(start, end) {
            let res = [];
            for (let i = start; i <= end; i++) res.push(i);
            return res;
        },
        capitalize: function(str) {
            if (typeof str !== 'string') return '';
            return str.charAt(0).toUpperCase() + str.slice(1);
        },
        formatDate: function(date) {
            if (!date) return "";
            const d = new Date(date);
            return d.toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }
}));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
    // Nên dùng biến môi trường cho secret key nếu có, hoặc dùng chuỗi mặc định
    secret: process.env.SESSION_SECRET || 'your-secret-key', 
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Chỉ bật secure cookie khi ở môi trường Production (có HTTPS)
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.use(flash());

// Set up locals for all views
app.use(async (req, res, next) => {
    // Check session for authentication
    res.locals.isLoggedIn = !!req.session.isAuthenticated;
    res.locals.currentUserName = req.session.userName || '';
    res.locals.currentUserRole = req.session.userRole || '';

    // Fetch full user object if logged in
    if (req.session.userId) {
        try {
            const user = await User.findById(req.session.userId).populate({
                path: 'enrolledCourses',
                populate: { path: 'category' }
            }).lean();
            res.locals.user = user;
            if (user && user.enrolledCourses) {
                res.locals.unlockedCategories = user.enrolledCourses.map(c => c.category ? c.category.name.toUpperCase() : '');
            } else {
                res.locals.unlockedCategories = [];
            }
        } catch (err) {
            console.error("Error fetching user for locals:", err);
            res.locals.unlockedCategories = [];
        }
    } else {
        res.locals.unlockedCategories = [];
    }

    // Messages and user data
    res.locals.success_message = req.flash('success_message');
    res.locals.error_message = req.flash('error_message');
    res.locals.message = req.query.message || req.session.message || ''; // Keep backward compatibility

    // Clear any session messages after they're used
    if (req.session.message) delete req.session.message;

    // Check if client accepts JSON
    res.locals.wantsJson = req.accepts('json') && !req.accepts('html');

    next();
});


// Public routes (no authentication required)
// NOTE: Admin routes MOVED UP to ensure they are checked before indexRouter catch-alls
// Admin routes (protected)
const requireAuth = (req, res, next) => {
    if (!req.session.isAuthenticated) {
        if (req.accepts('json') && !req.accepts('html')) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: Please log in first'
            });
        }
        req.session.returnTo = req.originalUrl;
        return res.redirect('/login');
    }
    next();
};

app.use('/admin', requireAuth, adminRouter);
app.use('/users', usersRouter);

app.use('/', indexRouter);

// 404 handler for API requests
app.use(function (req, res, next) {
    const isApiRequest = req.accepts('json') ||
        (req.get('Content-Type') && req.get('Content-Type').includes('application/json')) ||
        (req.method !== 'GET' && req.method !== 'HEAD');

    if (isApiRequest) {
        return res.status(404).json({
            success: false,
            message: 'API Endpoint Not Found',
            path: req.path
        });
    }

    next(createError(404));
});

app.use(function (err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }

    res.status(err.status || 500);

    const isApiRequest = req.method !== 'GET' && req.method !== 'HEAD';

    if (isApiRequest || req.accepts('json')) {
        return res.json({
            success: false,
            message: err.message,
            error: req.app.get('env') === 'development' ? err : {}
        });
    }

    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.render('error');
});

module.exports = app;