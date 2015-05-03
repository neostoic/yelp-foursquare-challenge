var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var yelpSchema = new Schema({
    id: String,
    name: String,
    url: String,
    phone: {type: String, index: {unique: true}},
    location: String,
    lat: String,
    long: String,
    zip: Number
}, {collection: 'yelp'});

var model = mongoose.model('Yelp', yelpSchema);

exports.Yelp = model;
