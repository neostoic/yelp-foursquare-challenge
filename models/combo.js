var mongoose = require("mongoose");
var w3w = require('../w3w');
var Schema = mongoose.Schema;

var comboSchema = new Schema({
    name: String,
    url: String,
    phone: {type: String, index: {unique: true}},
    location: String,
    lat: String,
    long: String,
    zip: Number,
    threeWords: Array
}, {collection: 'combo'});

// Run this before saving in order to get the threeWords from the longitude and latitude
comboSchema.methods.getThreeWords = function (callback) {
    var self = this;
    w3w.getWords(this.lat, this.long, function(err, data) {
        if (err) {
            console.log(err);
        } else {
            self.threeWords = [data[0], data[1], data[2]];
        }
        callback();
    });
}

exports.Combo = mongoose.model('Combo', comboSchema);