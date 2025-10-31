var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
    res.render('404', { title: '404 Page' }); // -> sẽ tự nhúng vào {{{body}}} trong layout.hbs
});

module.exports = router;

