var express = require('express');
var router = express.Router();
var settings = require('../settings.json');

// Homepage
router.route('/')
.get(function(req, res, next) {
        res.render('index', { title: settings.name });
})

// Check login
.post(function(req, res, next) {

});

module.exports = router;
