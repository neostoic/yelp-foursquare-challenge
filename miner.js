// Mines the Yelp and Foursquare APIs for a specific category in a zipcode

// Fetch config
var settings = require('./settings.json');

// Make API requests
var request = require('request');

// Modules
var _ = require('lodash');
var async = require('async');
var ansi = require('ansi');
var cursor = ansi(process.stdout);

// Mongoose Models
var Foursquare = require('./models/foursquare.js').Foursquare;
var Yelp = require('./models/yelp.js').Yelp;

// Yelp Library
var yelp = require("yelp").createClient({
    consumer_key: settings.yelp.consumer_key, 
    consumer_secret: settings.yelp.consumer_secret,
    token: settings.yelp.token,
    token_secret: settings.yelp.token_secret
});

/* Foursquare vars */
// Four Square client id/secret
var client_id     = settings.foursquare.client_id;
var client_secret = settings.foursquare.client_secret;

// Base url for making API requests
var base = "https://api.foursquare.com/v2/venues/explore?client_id=" + client_id + "&client_secret=" + client_secret + "&v=20140806&";
////////////////////

// Constructor
function Miner(category, zipcodes, type) {
    // food, restaurants
    this.category   = category;

    // zip code list to cycle through
    this.zipcodes   = zipcodes;

    // default type is yelp
    this.type       = type || "yelp";

    // Stats tracking
    this.matches     = 0;
    this.duplicates  = 0;
    this.total       = 0;
    this.complete    = 0;
    this.lastError   = 0;
    this.lastSuccess = 0;
}

// Cycles through all of the zips
Miner.prototype.run = function(finished) {
    var self = this;

    _.forEach(this.zipcodes, function(item, index) {
        if (self.getPlaces(item, function() {
            finished();
        }));
    });
};

Miner.prototype.getPlaces = function(zipcode, finished) {
    var self = this;

    var page = 0;
    var done = false;

    // Continuously increase offset until error
    async.whilst(
        function () { page++; return !done; },
        function (callback) {

            self.search(zipcode, page, function(err, data) {
                if (err) {
                    done = true;
                } else {
                    // Save every item
                    _.forEach(data, function(item, index) {

                        // If type isn't Yelp, use Foursquare and apply slight item differences
                        if (self.type != "yelp") {
                            var place = new Foursquare();

                            // Foursquare's items are in the venue subgroup
                            item = item.venue;

                            // Phone is under contanct
                            item.phone = item.contact.phone;

                            // Coordinates under location
                            item.location.latitude = item.location.lat;
                            item.location.longitude = item.location.lng

                            // Zip
                            item.location.postal_code = item.location.postalCode || 0;
                        } else {
                            var place = new Yelp();

                            // Yelps address is an array for some reason
                            item.location.address = item.location.address[0];

                            // Yelps coordinate setup
                            if (item.location.coordinate != null) {
                                item.location.latitude = item.location.coordinate.latitude
                                item.location.longitude = item.location.coordinate.longitude
                            }
                        }

                        // Store values into model
                        place.id = item.id || null;
                        place.name = item.name || null;
                        place.url = item.url || null;
                        place.phone = item.phone || null;
                        place.location = item.location.address || null;

                        if (item.location != null) {
                            place.lat = item.location.latitude || null;
                            place.long = item.location.longitude || null;
                        } else {
                            place.lat = null;
                            place.long = null;
                        }

                        place.zip = item.location.postal_code || 0;

                        // Save into collection and output progress
                        place.save(function(err, usr){
                            if (err) {
                                ++self.duplicates;
                                self.lastError = place.name;
                            } else {
                                ++self.matches;
                                self.lastSuccess = place.name;
                            }
                            self.total = self.matches + self.duplicates;
                        })
                    });
                }
                callback();
            });
        },
        function (err) {
            // If complete == total zip codes we are finished.
            // Also does a final progress update to show 100% completion
            if (++self.complete == totalZips) {
                finished();
            }
        }
    );
};

// Returns search results by page
Miner.prototype.search = function(zipcode, page, callback) {
    var self = this;

    // Default to 1st page
    page = page || 1;

    // Use Yelp or Foursquare
    if (self.type == "yelp") {
        // Use the Yelp module
        yelp.search({term: self.category, location: zipcode, limit: 20, offset: (page-1)*20}, function(error, data) {
            if (!error) {
                callback(null, data.businesses);
            } else {
                callback(error, null);
            }
        });
    } else {
        // No Foursquare modules (or they were unstable), so manually use request to query the API
        request(base + "limit=50&section=" + self.category + "&near=" + zipcode + "&offset=" + page*50, function (error, response, body) {
            body = JSON.parse(body);
            if (!error && response.statusCode == 200 && !body.response.warning) {
                callback(null, body.response.groups[0].items);
            } else {
                callback(body.response.warning, null);
            }
        });
    }
};

Miner.prototype.getStats = function() {
    return [this.matches, this.duplicates, this.total, this.complete, this.lastError, this.lastSuccess];
};

module.exports = Miner;