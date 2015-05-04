// Fetches all of the restaurants of the provided zip codes from Yelp and Foursquare
// and then converts the lat/long into what3words before saving it into a combo collection

// Fetch config
var settings = require('./settings.json');

// Miner for APIs
var miner = require('./miner');

// Combiner/sanatizer
var combo = require('./combo');

var fs = require('fs');
var _ = require('lodash');
var async = require('async');
var ansi = require('ansi');
var cursor = ansi(process.stdout);
var mongoose = require('mongoose');

// Connect to our db
mongoose.connect('mongodb://' + settings.db.url + '/' + settings.db.name);

// Read in zip codes file into array
var zips = fs.readFileSync("./zipcodes.txt").toString().split('\n');

// Remove empty line at end of file
zips.pop();

totalZips = zips.length

async.series([
    // Hide the cursor for clean output
    function(callback) {
        cursor.hide();
        callback();
    },

    // Output number of zipcodes to cycle through
    function(callback) {
        cursor.write(totalZips + " total zip codes provided.\n\n");
        callback();
    },

    // Yelp API datamining
    function(callback) {
        matches    = 0;
        duplicates = 0;
        total      = 0;
        complete   = 0;

        cursor.write("Using Yelp API...\n\n\n");

        _.forEach(zips, function(item, index) {
            if (miner.getPlaces("restaurants", item, "yelp", function() {
                callback();
            }));
        });
    },

    // Foursquare API datamining
    function(callback) {
        matches    = 0;
        duplicates = 0;
        total      = 0;
        complete   = 0;

        cursor.write("Using Foursquare API...\n\n\n");

        _.forEach(zips, function(item, index) {
            if (miner.getPlaces("restaurants", item, "foursquare", function() {
                callback();
            }));
        });
    },

    // Combine and sanatize data
    function(callback) {
        combo(function() {
            mongoose.connection.close();
        });
    }
]);
