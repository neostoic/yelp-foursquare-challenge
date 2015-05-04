// Modules and settings
var settings = require('../settings.json');
var express = require('express');
var mongoose = require('mongoose');
var async    = require('async');
var router = express.Router();

// Models to query DB
var Yelp = require('../models/yelp.js').Yelp;
var Foursquare = require('../models/foursquare.js').Foursquare;
var Combo = require('../models/combo.js').Combo;

// Connect to our db
mongoose.connect('mongodb://' + settings.db.url + '/' + settings.db.name);

// Homepage
router.route('/')
.get(function(req, res, next) {
    res.render('index', { title: settings.name });
})

// Accept queries
.post(function(req, res, next) {
    // Extract query from request
    query = req.body.query;

    // Results object to send back
    results = {};

    // If query is empty, send back empty results
    if (query.length == 0) {
        res.send(results);

    // Else, query all 3 collections for matches
    } else {

        async.series([
            function(callback) {
                Combo.find({"name": {$regex : new RegExp(query, "i")}}).limit(50).exec(function(err, docs) {
                    results.combo = docs;
                    callback();
                });
            },
            function(callback) {
                Yelp.find({"name": {$regex : new RegExp(query, "i")}}).limit(50).exec(function(err, docs) {
                    results.yelp = docs;
                    callback();
                });
            },
            function(callback) {
                Foursquare.find({"name": {$regex : new RegExp(query, "i")}}).limit(50).exec(function(err, docs) {
                    results.foursquare = docs;
                    callback();
                });
            },
            function(err) {
                res.send(results);
            }
        ]);
    }
});

module.exports = router;
