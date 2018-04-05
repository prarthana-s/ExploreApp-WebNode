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
            console.log('error:', error);
        } else {
            body = JSON.parse(body);
            location.name = body.results[0].formatted_address;
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
            console.log('error:', error);
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
    
    let placeName = encodeURIComponent(query.name);
    let placeAddress1 = encodeURIComponent(query.address1);
    let placeCity = encodeURIComponent(query.city);
    let placeState = encodeURIComponent(query.state);
    let placeCountry = encodeURIComponent(query.country);
    let placePostalCode = encodeURIComponent(query.postal_code);
    
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
                console.log(e);
            });

        }
        else {
            console.log("No reviews!");
        }
    }).catch(e => {
        console.log(e);
    });
    
});
    

// Separate yelp-fusion API calls

// app.get('/yelpReviews', function(req, res) {

//     'use strict';
    
//     const yelp = require('yelp-fusion');
    
//     const client = yelp.client(yelpKey);
    
//     client.reviews('gary-danko-san-francisco').then(response => {
//       console.log(response.jsonBody.reviews[0].text);
//     }).catch(e => {
//       console.log(e);
//     }); 

// });

// app.get('/yelpBestMatch', function(req, res) {
    
//     'use strict';
    
//     const yelp = require('yelp-fusion');
    
//     const client = yelp.client(yelpKey);
    
//     // matchType can be 'lookup' or 'best'
//     client.businessMatch('best', {
//       name: 'Pannikin Coffee & Tea',
//       address1: '510 N Coast Hwy 101',
//       address2: 'Encinitas, CA 92024',
//       city: 'Encinitas',
//       state: 'CA',
//       country: 'US'
//     }).then(response => {
//       console.log(response.jsonBody.businesses);
//     }).catch(e => {
//       console.log(e);
//     });

// });



// Vanilla NodeJS Yelp API calls

// app.get('/yelpBestMatch', function(req, res) {
    
//     let country = 'US';

//     // Make these dynamic
//     let name = encodeURIComponent('Starbucks');
//     let city = encodeURIComponent('Los Angeles');
//     let state = 'CA';
//     let url = `https://api.yelp.com/v3/businesses/matches/best?name=${name}&city=${city}&state=${state}&country=${country}`;

//     request.get(url, {
//         'auth': {
//           'bearer': yelpKey
//         }
//       }, function (err, response, body) {
//         if(err){
//             console.log('error:', error);
//         } else {
//             console.log('body:', body);
//             body = JSON.parse(body);
//             console.log(body);
//         }
//     });
// });



// app.get('/yelpReviews', function(req, res) {
    
//     let id = 'gary-danko-san-francisco';

//     let url = `https://api.yelp.com/v3/businesses/${id}/reviews`;

//     request.get(url, {
//         'auth': {
//           'bearer': yelpKey
//         }
//       }, function (err, response, body) {
//         if(err){
//             console.log('error:', error);
//         } else {
//             console.log('body:', body);
//             body = JSON.parse(body);
//             console.log(body);
//         }
//     });
// });




app.listen(3000, () => console.log('Example app listening on port 3000!'))


// Vanilla NodeJS GET Request code

// let locationName = encodeURIComponent('University of Southern California');
// let url = `https://maps.googleapis.com/maps/api/geocode/json?address=${locationName}&key=${googleKey}`

// https.get(url, res => {
//   res.setEncoding("utf8");
//   let body = "";
//   res.on("data", data => {
//     body += data;
//   });
//   res.on("end", () => {
//     body = JSON.parse(body);
//     console.log(
//       `City: ${body.results[0].formatted_address} -`,
//       `Latitude: ${body.results[0].geometry.location.lat} -`,
//       `Longitude: ${body.results[0].geometry.location.lng}`
//     );
//   });
// });



