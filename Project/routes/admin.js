var express = require('express');
var router = express.Router();

// Set layout for all routes in this router
router.all('/*', function(req, res, next) {
    res.app.locals.layout = 'admin';
    next();
});

// Admin dashboard
router.get('/', function(req, res, next) {
    res.render('admin/index', { title: 'Admin Dashboard' });
});

// Category list
router.get('/category', function(req, res, next) {
    res.render('admin/category/category-list', { title: 'Category Management' });
});

// Product list (example)
router.get('/product', function(req, res, next) {
    res.render('admin/product/product-list', { title: 'Product Management' });
});

module.exports = router;