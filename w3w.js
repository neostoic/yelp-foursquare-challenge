// Fetch config
var settings = require('./settings.json');

// Make API requests
var request = require('request');

// What3words API key
var key = settings.w3w.key;

// Base url for making API requests
var base = "http://api.what3words.com/";

// Export methods and variables
module.exports = {

    // Converts lat and long into 3 words
    // Sometimes w3w returns an error, so retry 5 times before moving on
    getWords: function(lat, long, callback) {
        request(base + "position?key=" + key + "&position=" + lat + "," + long, function (error, response, body) {
            try {
                body = JSON.parse(body);
            } catch(e) {
                body = {"words": ["null", "null", "null"]};
            }
            if (!error && response.statusCode == 200 && typeof body.error === 'undefined') {
                callback(null, body.words);
            } else {
                callback("something bad happened", null);
            }
        });
    },

    // Convert 3 words into coordinates
    getCoords: function(word1, word2, word3, callback) {
        request(base + "w3w?key=" + key + "&string=" + word1 + "." + word2 + "." + word3, function (error, response, body) {
            body = JSON.parse(body);
            if (!error && response.statusCode == 200 && typeof body.error === 'undefined') {
                callback(null, body.position);
            } else {
                callback("something bad happened", null);
            }
        });
    }
};
