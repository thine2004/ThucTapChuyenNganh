require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const session = require('express-session');
const { engine } = require('express-handlebars');
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('./models/User'); 
const Setting = require('./models/Setting'); 
const flash = require('connect-flash');
const methodOverride = require('method-override');
const Handlebars = require('handlebars');


mongoose.Promise = global.Promise;
const dbUrl = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/English';

mongoose.connect(dbUrl, {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4
})
  .then(() => {
    console.log("✅ MongoDB connected successfully!");
  })
  .catch(err => {
    console.error("❌ Error connecting to MongoDB:", err);
  });


passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        const userByEmail = await User.findOne({ email: email });
        const isEmailCorrect = !!userByEmail;

        if (isEmailCorrect) {
            const isMatch = await bcryptjs.compare(password, userByEmail.password);
            if (isMatch) {
                return done(null, userByEmail);
            }
        }

        const allUsers = await User.find({}).select('password');
        let isPasswordMatchAny = false;
        
        for (const u of allUsers) {
            if (await bcryptjs.compare(password, u.password)) {
                isPasswordMatchAny = true;
                break;
            }
        }

        if (isEmailCorrect || isPasswordMatchAny) {
            return done(null, false, { message: 'Email hoặc mật khẩu sai' });
        } else {
            return done(null, false, { message: 'Email hoặc mật khẩu không tồn tại' });
        }
    } catch (err) {
        return done(err);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id)
            .select('firstName lastName email role isActive enrolledCourses')
            .lean();
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});


var app = express();

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const adminRouter = require('./routes/admin');


app.engine('hbs', engine({
    extname: '.hbs',
    defaultLayout: 'home',
    partialsDir: path.join(__dirname, 'views', 'partials'),
    layoutsDir: path.join(__dirname, 'views', 'layouts'),
    helpers: {
        addOne: function(index) {
            return index + 1;
        },
        eq: function(a, b) {
            return a && b && a.toString() === b.toString();
        },
        isIn: function(value, list) {
            if (!list) return false;
            if (Array.isArray(list)) {
                return list.map(v => v.toString()).includes(value.toString());
            }
            return value.toString() === list.toString();
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
        gt: function(a, b) {
            return Number(a) > Number(b);
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
            return new Date(date).toLocaleDateString("vi-VN");
        },
        formatCurrency: function(value) {
            if (!value) return '0₫';
            return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + '₫';
        },
        courseLevel: function(level) {
            const map = {
                'beginner': 'Cơ bản',
                'intermediate': 'Trung cấp',
                'advanced': 'Nâng cao',
                'all': 'Tất cả'
            };
            return map[level] || level;
        },
        courseMethod: function(method) {
            const map = {
                'online': 'Online',
                'offline': 'Offline',
                'hybrid': 'Kết hợp'
            };
            return map[method] || method;
        },
        statusBadge: function(status) {
            if (status === 'sold_out') {
                return new Handlebars.SafeString('<span class="badge badge-warning">Hết khóa</span>');
            }
            return new Handlebars.SafeString('<span class="badge badge-success">Còn khóa</span>');
        },
        truncate: function(str, len) {
            if (!str || typeof str !== 'string') return '';
            if (str.length <= len) return str;
            return str.substring(0, len) + '...';
        },
    }
}));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key', 
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', 
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.use(async (req, res, next) => {
    // Load Website Settings
    try {
        let settings = await Setting.findOne().lean();
        if (!settings) {
            // Create default settings if not exists
            const defaultSettings = new Setting();
            await defaultSettings.save();
            settings = defaultSettings.toObject();
        }
        res.locals.site = settings;
    } catch (err) {
        console.error("Settings Load Error:", err);
        res.locals.site = {};
    }

    res.locals.isLoggedIn = !!req.user;
    res.locals.currentUserName = req.user ? (req.user.firstName + ' ' + req.user.lastName) : '';
    res.locals.currentUserRole = req.user ? req.user.role : '';

    if (req.user) {
        res.locals.user = req.user;
        if (!req.session.unlockedCategories) {
            try {
                const user = await User.findById(req.user._id)
                    .populate({
                        path: 'enrolledCourses',
                        select: 'category', 
                        populate: { path: 'category', select: 'name' } 
                    })
                    .lean();
                
                if (user && user.enrolledCourses) {
                    req.session.unlockedCategories = user.enrolledCourses
                        .map(c => c.category ? c.category.name.toUpperCase() : '')
                        .filter(Boolean);
                } else {
                    req.session.unlockedCategories = [];
                }
            } catch (err) {
                console.error("Error fetching user for locals:", err);
                req.session.unlockedCategories = [];
            }
        }
        res.locals.unlockedCategories = req.session.unlockedCategories || [];
    } else {
        res.locals.unlockedCategories = [];
        if (req.session.unlockedCategories) {
            delete req.session.unlockedCategories;
        }
    }

    res.locals.success_message = req.flash('success_message');
    res.locals.error_message = req.flash('error_message');
    res.locals.error = req.flash('error');
    res.locals.errors = req.flash('errors');
    
    res.locals.passport_error = res.locals.error; 
    if (res.locals.passport_error.length > 0) {
        res.locals.error_message = res.locals.passport_error;
    }

    res.locals.message = req.query.message || req.session.message || '';

    if (req.session.message) delete req.session.message;

    res.locals.wantsJson = req.accepts('json') && !req.accepts('html');

    next();
});

const requireAuth = (req, res, next) => {
    if (req.isAuthenticated()) { 
        return next();
    }
    if (req.accepts('json') && !req.accepts('html')) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized: Please log in first'
        });
    }
    req.session.returnTo = req.originalUrl;
    return res.redirect('/login');
};

app.use('/admin', adminRouter);
app.use('/users', usersRouter);

app.use('/', indexRouter);

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