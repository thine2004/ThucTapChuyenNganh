var express = require('express');
var router = express.Router();

router.all('/*', function(req, res, next) {
    res.app.locals.layout = 'home';
    next();
})
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('home/index', { title: 'Home Page' });
});
router.get('/404', function(req, res, next) {
    res.render('home/404', { title: '404 Page' });
});

router.get('/about', function(req, res, next) {
    res.render('home/about', { title: 'about Page' });
});
router.get('/contact', function(req, res, next) {
    res.render('home/contact', { title: 'Contact Page' });
});
router.get('/courses', function(req, res, next) {
    res.render('home/courses', { title: 'courses Page' });
});
router.get('/team', function(req, res, next) {
    res.render('home/team', { title: 'team Page' }); // -> sẽ tự nhúng vào {{{body}}} trong layout.hbs
});
router.get('/testimonial', function(req, res, next) {
    res.render('home/testimonial', { title: 'testimonial Page' }); // -> sẽ tự nhúng vào {{{body}}} trong layout.hbs
});
module.exports = router;


