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
    let location = {lat: '', lon: ''};

    let url = `https://maps.googleapis.com/maps/api/geocode/json?address=${locationInput}&key=${googleKey}`
    
    request(url, function (err, response, body) {
        if(err){
            console.log('error:', error);
        } else {
            body = JSON.parse(body);
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
    console.log(url);
    request(url, function (err, response, body) {
        if(err){
            console.log('error:', error);
        } else {
            // console.log('body:', body);
            body = JSON.parse(body);
            // console.log(body);
            res.send(body);
        }
    });


});


app.get('/nextPage', function(req, res) {
    
    let query = req.query;
    
    let nextPageToken = encodeURIComponent(query.nextPageToken);
    // let nextPageToken = 'CrQCLQEAAEAIDJjxnTa0U4PoEGUePN1i1_658Ljju0qOFDc-nbn71Xhm-cRRbQDZmuqi597p0LnnWd_mtB0VFsFcfgUUOZtP4UQAXhqfxB-Nx4xwWFdr2vuCRehQ3XdolewC-POfDMb2IYE3rM5t_VfBfjeayMJrM6H01lPeWRjnvMH78aHb__Bwy4M1WjiHF4-zZrpdX71V_5QFEHou1BA4TO93T57Wp22-41J2KAA6wqTEplMHEuxGJdiGcYNmQwl_ss5UV7E1KUaw3BSbG0dzehxsecD7kMUSKi60rvwG-6tLMbGPKaKLjJZJeuAslA7WWxyprkdAXJK5AanncxtkL9KxBVxSv6P-Fq5S1lw_kGuQvfFF7AovURbyiqzTBZPZZIGw2RaVlgYnTolnL_YSr913KhASEPAh73OMu1Qmv_Zl6uFiphQaFBUua7PSchLd9mSS9Zo4_4VKdJMI';
    
    let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${nextPageToken}&key=${googleKey}`

    request(url, function (err, response, body) {
        if(err){
            console.log('error:', error);
        } else {
            console.log('body:', body);
            body = JSON.parse(body);
            console.log(body);
            res.send(body);
        }
    });

});


app.get('/yelpReviews', function(req, res) {
    
    'use strict';
    
    const yelp = require('yelp-fusion');
    
    const client = yelp.client(yelpKey);
    
    // Check if business best match API call returns any result
    // matchType can be 'lookup' or 'best'
    client.businessMatch('best', {
        name: 'Pan',
        address1: '510 N Coast Hwy 101',
        address2: 'Encinitas, CA 92024',
        city: 'Encinitas',
        state: 'CA',
        country: 'US'
    }).then(response => {
        if (response.jsonBody.businesses.length != 0) {

            let id = response.jsonBody.businesses[0].id;
            client.reviews(id).then(response => {
                console.log(response.jsonBody.reviews[0].text);
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



