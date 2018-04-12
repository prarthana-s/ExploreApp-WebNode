const express = require('express')
const app = express()
let request = require('request');

var config = require('config');
let googleKey = config.get('APIKeys.Google');
let yelpKey = config.get('APIKeys.Yelp');

const https = require("https");

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// var urlebody = bodyParser.urlencoded({ extended: false });

app.use(express.static('public'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + "/" + "index.html");
})

app.get('/index.html', function(req,res) {
    res.sendFile( __dirname + "/" + "index.html");
})

app.get('/css/styles.css', function(req,res) {
    res.sendFile( __dirname + "/css/styles.css");
})

app.get('/js/main.js', function(req,res) {
    res.sendFile( __dirname + "/js/main.js");
})

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/geocode', function(req, res) {

    let query = req.query;

    let locationInput = encodeURIComponent(query.locationInput);
    let location = {addr: '', lat: '', lon: ''};

    let url = `https://maps.googleapis.com/maps/api/geocode/json?address=${locationInput}&key=${googleKey}`
    request(url, function (err, response, body) {
        if(err){
            res.send(null);
            console.log('error:', error);
        } else {
            body = JSON.parse(body);
            location.addr = body.results[0].formatted_address;
            location.lat = body.results[0].geometry.location.lat;
            location.lon = body.results[0].geometry.location.lng;
            res.send(location);
        }
    });
});


app.get('/nearbyPlaces', function(req, res) {

    let query = req.query;

    // Use current location coordinates
    let lat = query.hereLatitude;
    let lon = query.hereLongitude;
    
    // Miles to metres conversion
    let distance = query.distance;
    if (distance == '') {
        distance = 10;
    }
    let radius = distance * 1609.34;


    // Handle case where keyword consists of multiple words/special characters
    let keyword = encodeURIComponent(query.keyword);
    let type = query.category;

    //If type is default, pass empty string as type parameter
    if (type == 'default') {
        type = "";
    }

    let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=${radius}&type=${type}&keyword=${keyword}&key=${googleKey}`;
    request(url, function (err, response, body) {
        if(err){
            res.send(null);;
        } else {
            body = JSON.parse(body);
            res.send(body);
        }
    });


});


app.get('/nextPage', function(req, res) {
    
    let query = req.query;
    
    let nextPageToken = encodeURIComponent(query.nextPageToken);

    let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${nextPageToken}&key=${googleKey}`

    request(url, function (err, response, body) {
        if(err){
            res.send(null);
            console.log('error:', error);
        } else {
            body = JSON.parse(body);
            res.send(body);
        }
    });

});


app.get('/yelpReviews', function(req, res) {

    'use strict';

    let query = req.query;
    
    let placeName = query.name;
    let placeAddress1 = query.address1;
    let placeCity = query.city;
    let placeState = query.state;
    let placeCountry = query.country;
    let placePostalCode = query.postal_code;
    
    const yelp = require('yelp-fusion');
    
    const client = yelp.client(yelpKey);
    
    // Check if business best match API call returns any result
    // matchType can be 'lookup' or 'best'
    client.businessMatch('best', {
        name: placeName,
        address1: placeAddress1,
        city: placeCity,
        state: placeState,
        country: placeCountry,
        postal_code: placePostalCode
    }).then(response => {
        if (response.jsonBody.businesses.length != 0) {
            let id = response.jsonBody.businesses[0].id;
            client.reviews(id).then(response => {
                res.send(response.jsonBody.reviews);
            }).catch(e => {
                res.send(null);
            });

        }
        else {
            res.send(null);
        }
    }).catch(e => {
        res.send(null);
    });
    
});
    
var port = process.env.PORT || 8081;
app.listen(port, function() {
    console.log("Server started on port 8081");
});