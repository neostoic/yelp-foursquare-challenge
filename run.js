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
var colors = require('colors');
var moment = require('moment');
var numeral = require('numeral');

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
        cursor.write(numeral(totalZips).format('0,0') + " total zip codes provided.\n\n");
        callback();
    }
]);

// Miner vars
var yelp;
var yelpStats;
var foursquare;
var foursquareStats;

// ETA estimate
var start = Date.now();

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

// Make room for showStats
console.log("\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n");

// Display progress
function showStats(yelpDone, foursquareDone) {
    yelpDone       = yelpDone || false;
    foursquareDone = foursquareDone || false;

    // Average places per zip
    var yelpAvg       = 449;
    var foursquareAvg = 300;

    // Estimate % complete
    var yelpEstimate       = yelpStats[2]/yelpAvg;
    var foursquareEstimate = foursquareStats[2]/foursquareAvg;

    // Time estimates
    var diff           = Date.now() - start;
    var yelpTime       = convSecs((((yelpAvg*totalZips)/yelpStats[2])*diff)/1000);
    var foursquareTime = convSecs((((foursquareAvg*totalZips)/foursquareStats[2])*diff)/1000);

    if (yelpDone) {
        yelpStats[3] = yelpEstimate = totalZips;
    }

    if (foursquareDone) {
        foursquareStats[3] = foursquareEstimate = totalZips;
    }

    // Yelp stats
    cursor.previousLine(18).horizontalAbsolute(0).eraseLine().write("=== " + yelp.type + " ===").nextLine();
    cursor.horizontalAbsolute(0).eraseLine().write("Duplicate:\t" + numeral(yelpStats[1]).format('0,0').toString().red + "\t" + yelpStats[4]).nextLine();
    cursor.horizontalAbsolute(0).eraseLine().write("Saved:\t\t" + numeral(yelpStats[0]).format('0,0').toString().green + "\t" + yelpStats[5]).nextLine();
    cursor.horizontalAbsolute(0).eraseLine().write("Total:\t\t" + numeral(yelpStats[2]).format('0,0') + "\t" + numeral(yelpStats[3]).format('0,0') + "/" + numeral(totalZips).format('0,0') + " zips").nextLine();
    cursor.horizontalAbsolute(0).eraseLine().write("Estimates:\t~" + (((yelpEstimate)/totalZips)*100).toFixed(2) + "%\tRatio:\t" + ((yelpStats[0]/(yelpStats[0]+yelpStats[1]))*100).toFixed(2) + "%\tETA:\t" + yelpTime).nextLine(2);

    // Foursquare stats
    cursor.horizontalAbsolute(0).eraseLine().write("=== " + foursquare.type + " ===").nextLine();
    cursor.horizontalAbsolute(0).eraseLine().write("Duplicate:\t" + numeral(foursquareStats[1]).format('0,0').toString().red + "\t" + foursquareStats[4]).nextLine();
    cursor.horizontalAbsolute(0).eraseLine().write("Saved:\t\t" + numeral(foursquareStats[0]).format('0,0').toString().green + "\t" + foursquareStats[5]).nextLine();
    cursor.horizontalAbsolute(0).eraseLine().write("Total:\t\t" + numeral(foursquareStats[2]).format('0,0') + "\t" + numeral(foursquareStats[3]).format('0,0') + "/" + numeral(totalZips).format('0,0') + " zips").nextLine();
    cursor.horizontalAbsolute(0).eraseLine().write("Estimates:\t~" + (((foursquareEstimate)/totalZips)*100).toFixed(2) + "%\tRatio:\t" + ((foursquareStats[0]/(foursquareStats[0]+foursquareStats[1]))*100).toFixed(2) + "%\tETA:\t" + foursquareTime).nextLine(2);

    // Total stats
    cursor.horizontalAbsolute(0).eraseLine().write("=== Totals ===").nextLine();
    cursor.horizontalAbsolute(0).eraseLine().write("Duplicate:\t" + numeral((yelpStats[1]+foursquareStats[1])).format('0,0').toString().red).nextLine();
    cursor.horizontalAbsolute(0).eraseLine().write("Saved:\t\t" + numeral((yelpStats[0]+foursquareStats[0])).format('0,0').toString().green).nextLine();
    cursor.horizontalAbsolute(0).eraseLine().write("Total:\t\t" + numeral((yelpStats[2]+foursquareStats[2])).format('0,0')).nextLine();
    cursor.horizontalAbsolute(0).eraseLine().write("Estimates:\t~" + (((foursquareEstimate+yelpEstimate)/(totalZips*2))*100).toFixed(2) + "%\tRatio:\t" + (((yelpStats[0]+foursquareStats[0])/(foursquareStats[0]+foursquareStats[1]+yelpStats[0]+yelpStats[1]))*100).toFixed(2) + "%\tETA:\t" + (foursquareTime > yelpTime ? foursquareTime : yelpTime)).nextLine(2);
}

function convSecs(seconds) {
    var d = moment.duration(seconds, 'seconds');
    var hours = Math.floor(d.asHours());
    var mins = Math.floor(d.asMinutes()) - hours * 60;
    var seconds = Math.floor(d.asSeconds()) - mins * 60 - hours * 3600;

    return hours + ":" + zeroPad(mins, 2) + ":" + zeroPad(seconds, 2);
}

function zeroPad(num, places) {
    var zero = places - num.toString().length + 1;
    return Array(+(zero > 0 && zero)).join("0") + num;
}