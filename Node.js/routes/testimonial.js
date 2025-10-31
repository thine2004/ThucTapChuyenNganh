var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
    res.render('testimonial', { title: 'testimonial Page' }); // -> sẽ tự nhúng vào {{{body}}} trong layout.hbs
});

module.exports = router;

