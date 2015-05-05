// Fetches all of the restaurants of the provided zip codes from Yelp and Foursquare
// and then converts the lat/long into what3words before saving it into a combo collection

// Fetch config
var settings = require('./settings.json');

// Miner for APIs
var Miner = require('./miner');

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
    }
]);

var yelp;
var yelpStats;
var foursquare;
var foursquareStats;

async.parallel([
    // Yelp API datamining
    function(callback) {
        yelp = new Miner("restaurants", zips, "yelp");

        yelp.run(function() {
            callback();
        });

        yelpTimer = setInterval(function() {
            yelpStats = yelp.getStats()
        }, 250);
    },

    // Foursquare API datamining
    function(callback) {
        foursquare = new Miner("restaurants", zips, "foursquare");

        foursquare.run(function() {
            callback();
        });

        foursquareTimer = setInterval(function() {
            foursquareStats = foursquare.getStats()
        }, 250);

    // Combine and sanatize data
    }], function(callback) {
        clearInterval(yelpTimer);
        clearInterval(foursquareTimer);

        clearInterval(stats);

        clearInterval(yelp.hangCheck);
        clearInterval(foursquare.hangCheck);

        // Show stats one last time with 100%s
        showStats(true, true);

        combo(function() {
            mongoose.connection.close();
            process.exit(1);
        });
    }
);
console.log("\n\n\n\n\n\n\n\n\n");

// Update stats every 250 ms
stats = setInterval(function() {
    showStats(yelpStats[6], foursquareStats[6]);
}, 250);

yelpHangCheck = setInterval(function() {
    if (yelp.isHung()) {
        yelp.quit = true;
    }
}, 30000);

foursquareHangCheck = setInterval(function() {
    if (foursquare.isHung()) {
        foursquare.quit = true;
    }
}, 30000);

// Display progress
function showStats(yelpDone, foursquareDone) {
    yelpDone = yelpDone || false;
    foursquareDone = foursquareDone || false;

    yelpEstimate = yelpStats[2]/623;
    foursquareEstimate = foursquareStats[2]/300;

    if (yelpDone) {
        yelpStats[3] = yelpEstimate = totalZips;
    }

    if (foursquareDone) {
        foursquareStats[3] = foursquareEstimate = totalZips;
    }

    // Yelp stats
    cursor.previousLine(10).horizontalAbsolute(0).eraseLine().write("Using " + yelp.type + " API...").nextLine();
    cursor.horizontalAbsolute(0).eraseLine().write("Duplicate:\t" + yelpStats[1] + "\t" + yelpStats[4]).nextLine();
    cursor.horizontalAbsolute(0).eraseLine().write("Saved:\t\t" + yelpStats[0] + "\t" + yelpStats[5]).nextLine();
    cursor.horizontalAbsolute(0).eraseLine().write("Total:\t\t" + yelpStats[2] + "\t" + yelpStats[3] + "/" + totalZips + "\t" + Math.round((yelpStats[3]/totalZips)*100) + "%\t~" + (((yelpEstimate)/totalZips)*100).toFixed(2) + "%").nextLine(2);

    // Foursquare stats
    cursor.horizontalAbsolute(0).eraseLine().write("Using " + foursquare.type + " API...").nextLine();
    cursor.horizontalAbsolute(0).eraseLine().write("Duplicate:\t" + foursquareStats[1] + "\t" + foursquareStats[4]).nextLine();
    cursor.horizontalAbsolute(0).eraseLine().write("Saved:\t\t" + foursquareStats[0] + "\t" + foursquareStats[5]).nextLine();
    cursor.horizontalAbsolute(0).eraseLine().write("Total:\t\t" + foursquareStats[2] + "\t" + foursquareStats[3] + "/" + totalZips + "\t" + Math.round((foursquareStats[3]/totalZips)*100) + "%\t~" + (((foursquareEstimate)/totalZips)*100).toFixed(2) + "%").nextLine(2);
}
