var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var foursquareSchema = new Schema({
    id: String,
    name: String,
    url: String,
    phone: {type: String, index: {unique: true}},
    location: String,
    lat: String,
    long: String,
    zip: Number
}, {collection: 'foursquare'});

var model = mongoose.model('Foursquare', foursquareSchema);

exports.Foursquare = model;
