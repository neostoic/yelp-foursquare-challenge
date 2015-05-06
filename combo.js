// This module finds similar places between the Yelp and Foursquare collections via phone number
// and then gets the threeWords longitude/latitude combo before it saves it to a combo collection

// Modules
var w3w      = require('./w3w');
var settings = require('./settings.json');
var _        = require('lodash');
var async    = require('async');
var ansi     = require('ansi');
var cursor   = ansi(process.stdout);

// Mongoose models
var Combo      = require('./models/combo.js').Combo;
var Foursquare = require('./models/foursquare.js').Foursquare;
var Yelp       = require('./models/yelp.js').Yelp;

// Export combo for run.js
module.exports = function combo(finished) {
    // Hold all of the yelp documents
    var yelpResults = [];
    var yelpPhones  = [];

    // Holds the total number of matching documents between Yelp and Foursquare
    var total       = 0;

    async.series([
        // Hide the cursor for clean output
        function(callback) {
            cursor.hide();
            callback();
        },

        // Get number of Foursquare results for stats
        function(callback) {
            Foursquare.count({}, function(err, count) {
                foursquareCount = count;
                callback();
            });
        },

        // Get all of the Yelp documents to compare with Foursquare
        function(callback) {
            Yelp.find({}, function(err, docs) {
                _.forEach(docs, function(doc, index) {
                    yelpResults.push(doc);
                    yelpPhones.push(doc.phone);
                });
                callback();
            });
        },

        // Get total matches first for estimations
        function(callback) {
            Foursquare.find({"phone": {$in: yelpPhones}}, function(err, docs) {
                total = docs.length;
                cursor.write(yelpResults.length + " Yelp results, " + foursquareCount + " Foursquare results, and " + total + " similar matches.\n");
                cursor.write("Duplicate:\t0\n");
                cursor.write("Saved:\t\t0\n");
                cursor.write("Total:\t\t0");

                // If there are no Yelp results or no Foursquare results, abort
                if (yelpResults.length == 0 || foursquareCount == 0) {
                    cursor.write("\nThere appear to be 0 Yelp or 0 Foursquare documents...aborting.\n");
                    cursor.show();
                    
                    mongoose.connection.close();
                    process.exit(1);
                }
                callback();
            });
        },

        // Iterate through Yelp results array and try to find match in Foursquare collection
        // If match is found, combine the best of the two documents into a new combo document
        function(callback) {
            var duplicates = 0;
            var matches    = 0;

            // Cycle through Yelp Array
            _.forEach(yelpResults, function(yelpDoc) {

                // Search for matching place (by phone) in Foursquare DB
                Foursquare.findOne({"phone": yelpDoc.phone}, function(err, foursquareDoc) {
                    
                    // If there is a match, combine and save the data into combo collection
                    /*
                        === Best DB to get details from ===
                        Name: Yelp - Tends to be more specific (ex. Grimaldi's Pizzeria vs Grimaldi's)
                        URL: Foursquare - Yelp's URLs are to Yelp's own entry and not the place's website
                        Phone: Either
                        Location: Foursquare - Tends to have a more accurate location
                        Lat/Long: Foursquare - Tends to be more accurate than Yelp
                        Zip: Either

                        === Algorithm ===
                        Get it from the best and if it is null, get from the other provider
                        For either, default to Yelp...if Yelp's is null, try Foursquare
                    */

                    if (foursquareDoc != null) {
                        var combo = new Combo();

                        // Determine which source to choose from based on algorithm above
                        combo.name     = yelpDoc.name != null ? yelpDoc.name : foursquareDoc.name;
                        combo.url      = foursquareDoc.url != null ? foursquareDoc.url : yelpDoc.url;
                        combo.phone    = yelpDoc.phone != null ? yelpDoc.phone : foursquareDoc.phone;
                        combo.location = foursquareDoc.location != null ? foursquareDoc.location : yelpDoc.location;

                        combo.lat      = foursquareDoc.lat != null ? foursquareDoc.lat : yelpDoc.lat;
                        combo.long     = foursquareDoc.long != null ? foursquareDoc.long : yelpDoc.long;

                        combo.zip      = yelpDoc.zip != null ? yelpDoc.zip : foursquareDoc.zip;

                        // Convert lat/long to what3words
                        // Once what3words is retrieved, save the combo document and output progress
                        combo.getThreeWords(function() {
                            combo.save(function(err, usr){
                                if (err) {
                                    cursor.previousLine().previousLine().horizontalAbsolute(0).eraseLine().write("Duplicate:\t" + ++duplicates + "\t" + combo.name).nextLine(2);
                                } else {
                                    cursor.previousLine().horizontalAbsolute(0).eraseLine().write("Saved:\t\t" + ++matches + "\t" + combo.name).nextLine();
                                }
                                
                                current = matches+duplicates;
                                cursor.horizontalAbsolute(0).eraseLine().write("Total:\t\t" + current + "/" + total + "\t" + Math.round((current/total)*100) + "%");
                                
                                // If current == total, we are finished.
                                if (current == total) {
                                    cursor.write("\nFinished combining and sanatizing data.\n");
                                    cursor.show();
                                    callback(null);
                                }
                            });
                        });
                    }
                });
            })
        },

        function(err) {
            finished();
        }
    ]);
};
