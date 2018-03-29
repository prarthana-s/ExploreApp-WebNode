// This is defined globally to fetch the current script
// Used later to fetch images from server for "Photos" feature
var script = document.currentScript;
var fullUrl = script.src;

var bodyElement = document.getElementsByTagName('body')[0];

var googleReviewsSet = '';
var yelpReviewsSet = '';

// Enable Search button only after user's geolocation is fetched
$.ajax({url: "http://ip-api.com/json", success: function(result){
    jsonObj = JSON.parse(JSON.stringify(result));
    var searchButton = document.getElementById('searchButton');
    searchButton.removeAttribute('disabled'); 

    document.getElementById('hereLatitude').value = jsonObj.lat; 
    document.getElementById('hereLongitude').value = jsonObj.lon;  
    
    var submitButton = document.getElementById('searchButton');
    submitButton.addEventListener('click',submitForm,false);
}});

var autocompleteFlag = false;

function initAutocomplete() {
    autocomplete = new google.maps.places.Autocomplete(document.getElementById('locationInputText'));
    autocomplete.addListener('place_changed', fillInAddress);

    autocomplete = new google.maps.places.Autocomplete(document.getElementById('fromLocation'));
    autocomplete.addListener('place_changed', fillInFromLocation);
}
initAutocomplete();

function fillInAddress() {
    var place = autocomplete.getPlace();
    var formElems = document.getElementById('mainForm').elements;
    autocompleteFlag = true;
    formElems.namedItem("hereLatitude").value = place.geometry.location.lat();
    formElems.namedItem("hereLongitude").value = place.geometry.location.lng();
}

// Handling of radio buttons
var radioSelectionLoc = document.getElementById('locationRadioLoc');
var radioSelectionHere = document.getElementById('locationRadioHere');        
var textInput = document.getElementById("locationInputText");

radioSelectionLoc.addEventListener('change',toggleRequired,false);
locationInputText.addEventListener('change',toggleAutocomplete, false);
radioSelectionHere.addEventListener('change',disableTextBox,false);

// Every time there is a change in location input text box, reset autocomplete flag
// This prevents old coordinates from being passed
// Example: User selected item from autocomplete list, but later entered a location text
function toggleAutocomplete() {
    autocompleteFlag = false;
}

// If "Location" is selected, enable the text field and make it required
function toggleRequired() {
    if (textInput.hasAttribute('required') !== true) {
        textInput.removeAttribute('disabled');
        textInput.setAttribute('required','required');
    }

    else {
        textInput.removeAttribute('required');  
    }
}

// Disable location text input if user selects "Here"
function disableTextBox() {
    if (radioSelectionHere.checked) {
        textInput.setAttribute('disabled','disabled');
        textInput.removeAttribute('required');  
        textInput.value = "";
    }
}


function submitForm() {
    
    var valid = false;

    var formElems = document.getElementById('mainForm').elements;
    if (formElems.namedItem("keyword").value) {
        if (formElems.namedItem("locationRadio").value == "location") {
            if (formElems.namedItem("locationInput").value) {
                valid = true;
            }
        }
        else {
            valid = true;
        }
    }

    if (valid) {
        var formElems = document.getElementById("mainForm").elements;

        var lat = formElems.namedItem("hereLatitude").value;
        var lon = formElems.namedItem("hereLongitude").value;

        if (!autocompleteFlag && formElems.namedItem("locationRadio").value == 'location') {
            $.ajax({
                method: "GET",
                url: "http://localhost:3000/geocode",
                crossDomain: true,
                data: {locationInput: formElems.namedItem("locationInput").value}
                })
                .done(function( result ) {
                    lat = result.lat;
                    lon = result.lon;
                    
                    $.ajax({
                        method: "GET",
                        url: "http://localhost:3000/nearbyPlaces",
                        crossDomain: true,
                        data: {keyword: formElems.namedItem("keyword").value, category: formElems.namedItem("category").value, distance: formElems.namedItem("distance").value, locationRadio: formElems.namedItem("locationRadio").value, locationInput: formElems.namedItem("locationInput").value, hereLatitude: lat, hereLongitude: lon}
                        })
                        .done(function( result ) {
                            constructResultsTable(JSON.stringify(result),0);
                        });
                });
        }
        else {
            // AJAX call to PHP script to fetch nearby places JSON data
            $.ajax({
                method: "GET",
                url: "http://localhost:3000/nearbyPlaces",
                crossDomain: true,
                data: {keyword: formElems.namedItem("keyword").value, category: formElems.namedItem("category").value, distance: formElems.namedItem("distance").value, locationRadio: formElems.namedItem("locationRadio").value, locationInput: formElems.namedItem("locationInput").value, hereLatitude: lat, hereLongitude: lon}
                })
                .done(function( result ) {
                    constructResultsTable(JSON.stringify(result),0);
                });
        }
    }
}

// var prevPageFlag;
// var prevResult;

function constructResultsTable(result, tracker) {
    jsonObj = result;

    if (jsonObj) {
        jsonObj = JSON.parse(jsonObj);
        var nextPageToken = jsonObj.next_page_token;
        var results = jsonObj.results;
        var myLat = jsonObj.lat;
        var myLon = jsonObj.lon;

        // if (tracker) {
        //     prevPageFlag = 1;
        //     prevResult = result;
        // }
        // else {
        //     prevResult = result;
        // }

        var existingTable = document.getElementById('tableContainer');
        if (existingTable) {
            existingTable.parentNode.removeChild(existingTable);
        }

        if (!results.length) {
            tableHTML = '<div id="noRecordsFound">No records have been found.</div';
        }

        else {
            tableHTML = '<div class="table-responsive" id="tableContainer">' + 
            '<table class="table table-hover table-sm" id="placesTable" data-myLat="' + myLat + '" data-myLon="' + myLon + '">' + 
            '<tr><th scope="col">#</th>' + 
            '<th scope="col">Category</th>' + 
            '<th scope="col">Name</th>' + 
            '<th scope="col">Address</th>' + 
            '<th scope="col">Favorite</th>' + 
            '<th scope="col">Details</th></tr>';

            for (let i=0; i<results.length; i++) {
                var icon = results[i].icon;
                var name = results[i].name;
                var address = results[i].vicinity;
                var placeID = results[i].place_id;
                var lat = results[i].geometry.location.lat;
                var lng = results[i].geometry.location.lng;

                tableHTML += '<tr><th scope="row">' + (parseInt(i)+1) + '</th>' +
                '<td><img class="placeIcon" src="' + icon + '" alt="user image"/></td>' + 
                '<td class="placeName" data-placeid="' + placeID + '">' + name + '</td>' +
                '<td class="addressInfo">' + address + '</td>' + 
                '<td class="favIcon"><i class="far fa-star fa-1x fa-pull-left fa-border fav"></i></td>' + 
                '<td class="detailsIcon" data-lat="' + lat + '" data-lng="' + lng + '" data-placeID="' + placeID +
                '"><i class="fas fa-chevron-right fa-1x fa-pull-left fa-border"></i></td></tr>';
            }
            tableHTML += '</table></div>';
        }

        // if (prevPageFlag) {
        //     console.log("show previous button");
        //     tableHTML += '<button type="button" id="prevButton" class="btn btn-outline-dark">Previous</button>';
        // }

        if (nextPageToken && nextPageToken.length) {
            tableHTML += '<button type="button" id="nextButton" class="btn btn-outline-dark" data-token="' + nextPageToken + '">Next</button>';
        }

        var tableContainer =  document.getElementById('pills-results');
        tableContainer.innerHTML = tableHTML;
        bodyElement.appendChild(tableContainer);

        var placesTable = document.getElementById('placesTable');
        if (placesTable) {
            placesTable.addEventListener('click',processTableRowClick,false);
        }

        var nextButton = document.getElementById('nextButton');
        if (nextButton) {
            nextButton.addEventListener('click',displayNextResults,false);
        }

        // var prevButton = document.getElementById('prevButton');
        // if (prevButton) {
        //     prevButton.addEventListener('click',displayPrevResults,false);
        // }

    }
}

function generateHTML(address, placeID, lat, lng) {
    addrHTML = '';
    addrHTML += '<div data-lat="' + lat + '" data-lng="' + lng + '" data-placeID="' + placeID + '" class="placeAddress"><div class="placeAddressLine">' + address + 
    '</div></div>';
    return addrHTML;
}

function displayNextResults(ev) {
    var nextPageToken = ev.target.dataset.token;
    $.ajax({
        method: "GET",
        url: "http://localhost:3000/nextPage",
        crossDomain: true,
        data: {nextPageToken: nextPageToken}
        })
        .done(function( result ) {
            constructResultsTable(JSON.stringify(result),1);
        });
}

// function displayPrevResults(ev) {
//     // constructResultsTable(JSON.stringify(prevResult),1);
// }

function convertPriceToDollar(price) {
    if (price >= 0 && price <= 1) {
        return "0";
    }
    else if (price > 1 && price <= 2) {
        return "$";
    }
    else if (price > 2 && price <= 3) {
        return "$$";
    }
    else if (price > 3 && price <= 4) {
        return "$$$";
    }
    else {
        return "$$$$";
    }
    
}

function processTableRowClick(ev){
    let target = ev.target.parentNode;

    // Details icon
    if(target.className == 'detailsIcon') {
        var lat = target.dataset.lat;
        var lng = target.dataset.lng;
        var placeID = target.dataset.placeid;

        var tabInterface = document.getElementById('detailsContent');
        tabInterface.style.display = 'block';

        let tableContainer = document.getElementById('tableContainer');
        tableContainer.style.display = 'none';

        var map;

        function getInfo() {
            let locationCoordinates = {lat: parseFloat(lat), lng: parseFloat(lng)}
            map = new google.maps.Map(document.getElementById('mapContainer'), {
                center: locationCoordinates,
                zoom: 14
            });

            var request = {
                placeId: placeID
            };

            var marker = new google.maps.Marker({
                position: locationCoordinates,
                map: map
            });
            
            service = new google.maps.places.PlacesService(map);
            service.getDetails(request, callback);
        }
        
        // Checks that the PlacesServiceStatus is OK, and adds a marker
        // using the place ID and location from the PlacesService.
        function callback(results, status) {
            if (status == google.maps.places.PlacesServiceStatus.OK) {

                console.log(results);

                // Info tab 

                var info = {};

                if (results.formatted_address) {
                    info['Address'] = results.formatted_address;
                }

                if (results.international_phone_number) {
                    info['Phone Number'] = results.international_phone_number;
                }

                if (results.price_level) {
                    info['Price Level'] = convertPriceToDollar(results.price_level);
                }

                if (results.rating) {
                    info['Rating'] = results.rating;
                }

                if (results.url) {
                    info['Google Page'] = '<a target="_blank" href="' + results.url + '">' + results.url + '</a>';
                }

                if (results.rating) {
                    info['Website'] = '<a target="_blank" href="' + results.website + '">' + results.website + '</a>';
                }

                var hours = results.opening_hours;
                if (hours) {
                    var hoursStatus = (hours.open_now == 1 ? "Open now:" : "Closed now:");
                    var dailyOpenModal = '<a href="#" data-toggle="modal" data-target="#exampleModalCenter">Daily Open Hours</a>';
                    var weekdayText = hours.weekday_text;

                    info['Hours'] = (results.open_now == 1 ? "Open Now" : "Closed Now") + " " + dailyOpenModal;

                    var openHoursModal = document.getElementById('main_modal_body');
                    var openHoursHTML = '<table class="table"><tbody>';
    
                    for (let i = 0 ; i < weekdayText.length ; i++) {
                        openHoursHTML += '<tr><th scope="row">' + weekdayText[i] + '</th></tr>';
                    };
                    openHoursHTML += '</tbody></table></div>';
                    openHoursModal.innerHTML = openHoursHTML;
                }

                var infoContainer = document.getElementById('infoTableBody');

                var infoHTML = '';

                Object.keys(info).forEach(function(key) {
                    infoHTML += '<tr><th scope="row">' + key + '</th><td>' + info[key] + '</td></tr>';
                });
                infoContainer.innerHTML = infoHTML;


                // Photos
                if (results.photos) {
                    var numPhotos = results.photos.length;
                    var rows;

                    switch(numPhotos) {
                        case 1,2,3,4: { rows = 1; break;}
                        case 5,6,7,8: { rows = 2; break;}
                        case 9,10: { rows = 3; break; }
                    }

                    var photosContainer = document.getElementById('photosDisplay');
                    var photosHTML = '';
                    var k = 0;
                    for (let i = 0; i < rows; i++) {
                        photosHTML += '<div class="row">';
                        for (let j = 0; j < 4; j++) {
                            if (k < numPhotos) {
                                var photoLink = results.photos[k].getUrl({'maxWidth': results.photos[k].width , 'maxHeight': results.photos[k].height });                            
                                k++;
                                photosHTML += '<div class="col-sm-3"><a target="_blank" href="' + photoLink + '"><img class="img-fluid img-thumbnail" src="' + photoLink + '"/></a></div>'; 
                            }
                            else {
                                break;
                            }
                        }
                        photosHTML += '</div>';
                    }
                    photosContainer.innerHTML = photosHTML;
                }

                // No photos
                else {
                    var photosContainer = document.getElementById('photosDisplay');
                    var photosHTML = '';
                    photosContainer.innerHTML = photosHTML;
                }


                // Google Reviews
                googleReviews = results.reviews;
                if (googleReviews) {
                    generateGoogleReviews(googleReviews,1);
                }


                // Yelp Reviews
                let yelpParams = {};
                yelpParams['name'] = results.name;

                for (let i =0 ; i < results.address_components.length ; i++) {
                    if (results.address_components[i].types.includes('route')){
                        yelpParams['address1'] = results.address_components[i].short_name; 
                    }
                    else if (results.address_components[i].types.includes('locality')){
                        yelpParams['city'] = results.address_components[i].short_name ;
                    }
                    else if (results.address_components[i].types.includes('administrative_area_level_1')){
                        yelpParams['state'] = results.address_components[i].short_name ;
                    }
                    else if (results.address_components[i].types.includes('country')){
                        yelpParams['country'] = results.address_components[i].short_name; 
                    }
                    else if (results.address_components[i].types.includes('postal_code')){
                        yelpParams['postal_code'] = results.address_components[i].short_name; 
                    }
                }


                $.ajax({
                    method: "GET",
                    url: "http://localhost:3000/yelpReviews",
                    crossDomain: true,
                    data: yelpParams
                    })
                    .done(function( yelpReviews ) {
                        if(yelpReviews.length) {
                            generateYelpReviews(yelpReviews,1);
                        }
                });


                // Map
                let toFieldValue = results.name + ", " + results.formatted_address;
                var toField = document.getElementById('toLocation');
                toField.value = toFieldValue; 

                var formElems = document.getElementById('directionsForm').elements;
                formElems.namedItem("toLatitude").value = results.geometry.location.lat();
                formElems.namedItem("toLongitude").value = results.geometry.location.lng();

                var mapSubmitButton = document.getElementById('submitMapForm');
                mapSubmitButton.addEventListener('click',getDirections,false);

            }
        }
        getInfo();
    }
}

function generateYelpReviews(yelpReviews, originalResult=0) {
    if (originalResult){
        yelpReviewsSet = JSON.parse(JSON.stringify(yelpReviews));
    }

    var yelpReviewsHTML = '';

    for (let i = 0 ; i < yelpReviews.length; i++) {
        yelpReviewsHTML += '<div class="card"><div class="card-body"> \
            <a target="_blank" href="' + yelpReviews[i].url + '"><img class="authorPic" src="' + yelpReviews[i].user.image_url + '"/></a>\
            <a target="_blank" href="' + yelpReviews[i].url + '"><p class="card-text author-name authorName">' + yelpReviews[i].user.name + '</p></a>';

        for (let j = 0 ; j < yelpReviews[i].rating; j++) {
            yelpReviewsHTML += '<i class="fas fa-star rating"></i>';
        }
            
        yelpReviewsHTML += '<span class="card-text text-muted time-stamp">' + yelpReviews[i].time_created + '</span>' + 
            '<p class="card-text review-text">' + yelpReviews[i].text + '</p></div></div>';
    }

    var yelpReviewsContainer = document.getElementById('yelpReviews');
    yelpReviewsContainer.innerHTML = yelpReviewsHTML;
}

function generateGoogleReviews(googleReviews, originalResult=0) {

    if (originalResult){
        googleReviewsSet = JSON.parse(JSON.stringify(googleReviews));
    }

    var googleReviewsHTML = '';

    for (let i = 0 ; i < googleReviews.length; i++) {
        var timestamp = moment(moment.unix(googleReviews[i].time)._d).format("YYYY-MM-DD HH:mm:ss");
        googleReviewsHTML += '<div class="card"><div class="card-body"> \
            <a target="_blank" href="' + googleReviews[i].author_url + '"><img class="authorPic" src="' + googleReviews[i].profile_photo_url + '"/></a>\
            <a target="_blank" href="' + googleReviews[i].author_url + '"><p class="card-text author-name authorName">' + googleReviews[i].author_name + '</p></a>';

        for (let j = 0 ; j < googleReviews[i].rating; j++) {
            googleReviewsHTML += '<i class="fas fa-star rating"></i>';
        }
            
        googleReviewsHTML += '<span class="card-text text-muted time-stamp">' + timestamp + '</span>' + 
            '<p class="card-text review-text">' + googleReviews[i].text + '</p></div></div>';
    }

    var googleReviewsContainer = document.getElementById('googleReviews');
    googleReviewsContainer.innerHTML = googleReviewsHTML;
}

// Dynamic sorting
function compareValues(key, order='asc') {
    return function(a, b) {
        if(!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
        // property doesn't exist on either object
            return 0; 
        }

        const varA = (typeof a[key] === 'string') ? 
        a[key].toUpperCase() : a[key];
        const varB = (typeof b[key] === 'string') ? 
        b[key].toUpperCase() : b[key];

        let comparison = 0;
        if (varA > varB) {
        comparison = 1;
        } else if (varA < varB) {
        comparison = -1;
        }
        return (
        (order == 'desc') ? (comparison * -1) : comparison
        );
    };
}

var dropdownButtons = document.getElementById('dropdownButtons');
dropdownButtons.addEventListener('click',dropdownAction,false);

function dropdownAction(ev) {
    // Toggle Reviews

    // TODO: Check if already being displayed
    // Page rescrolls to top, FIX THIS
    // Remove hidden and use display:none
    if (ev.target.parentNode.id == 'reviewsToggle') {
        
        let dropdownButton = document.getElementById('dropdownReviews');

        if (ev.target.id == 'yelpReviewsButton') {
            document.getElementById('yelpReviews').removeAttribute("hidden");;
            document.getElementById('googleReviews').setAttribute("hidden","hidden"); 
            
            dropdownButton.innerHTML = 'Yelp Reviews';
        }
        else if (ev.target.id == 'googleReviewsButton') {
            document.getElementById('yelpReviews').setAttribute("hidden","hidden");
            document.getElementById('googleReviews').removeAttribute("hidden");     
            
            dropdownButton.innerHTML = 'Google Reviews';
        }
    }

    // Sort reviews
    else if (ev.target.parentNode.id == 'reviewsSort') {

        let dropdownButton = document.getElementById('dropdownSort');

        if(ev.target.id == 'defaultOrderSort') {
            generateYelpReviews(yelpReviewsSet,0);
            generateGoogleReviews(googleReviewsSet,0);

            dropdownButton.innerHTML = 'Default Order';
        }
        else if(ev.target.id == 'highestRatingSort') {
            let tempYelpReviews = JSON.parse(JSON.stringify(yelpReviewsSet));
            tempYelpReviews.sort(compareValues('rating', 'desc'));
            generateYelpReviews(tempYelpReviews,0);

            let tempGoogleReviews = JSON.parse(JSON.stringify(googleReviewsSet));
            tempGoogleReviews.sort(compareValues('rating', 'desc'));
            generateGoogleReviews(tempGoogleReviews,0);

            dropdownButton.innerHTML = 'Highest Rating';
        }
        else if(ev.target.id == 'lowestRatingSort') {
            let tempYelpReviews = JSON.parse(JSON.stringify(yelpReviewsSet));
            tempYelpReviews.sort(compareValues('rating'));
            generateYelpReviews(tempYelpReviews,0);

            let tempGoogleReviews = JSON.parse(JSON.stringify(googleReviewsSet));
            tempGoogleReviews.sort(compareValues('rating'));
            generateGoogleReviews(tempGoogleReviews,0);

            dropdownButton.innerHTML = 'Lowest Rating';
        }
        else if(ev.target.id == 'mostRecentSort') {
            let tempYelpReviews = JSON.parse(JSON.stringify(yelpReviewsSet));
            tempYelpReviews.sort(compareValues('time_created','desc'));
            generateYelpReviews(tempYelpReviews,0);

            let tempGoogleReviews = JSON.parse(JSON.stringify(googleReviewsSet));
            tempGoogleReviews.sort(compareValues('time','desc'));
            generateGoogleReviews(tempGoogleReviews,0);

            dropdownButton.innerHTML = 'Most Recent';
        }
        else if(ev.target.id == 'leastRecentSort') {
            let tempYelpReviews = JSON.parse(JSON.stringify(yelpReviewsSet));
            tempYelpReviews.sort(compareValues('time_created'));
            generateYelpReviews(tempYelpReviews,0);

            let tempGoogleReviews = JSON.parse(JSON.stringify(googleReviewsSet));
            tempGoogleReviews.sort(compareValues('time'));
            generateGoogleReviews(tempGoogleReviews,0);

            dropdownButton.innerHTML = 'Least Recent';
        }
    }
}

function fillInFromLocation() {
    var place = autocomplete.getPlace();
    var formElems = document.getElementById('directionsForm').elements;
    formElems.namedItem("fromLatitude").value = place.geometry.location.lat();
    formElems.namedItem("fromLongitude").value = place.geometry.location.lng();
}

function getDirections(){
    var formElems = document.getElementById('directionsForm').elements;

    var toLat = formElems.namedItem("toLatitude").value;
    var toLng = formElems.namedItem("toLongitude").value;
    
    var fromLat = formElems.namedItem("fromLatitude").value;
    var fromLon = formElems.namedItem("fromLongitude").value;

    var directionsService = new google.maps.DirectionsService();
    var directionsDisplay = new google.maps.DirectionsRenderer();
    var originCoords = new google.maps.LatLng(fromLat,fromLon);
    var destCoords = new google.maps.LatLng(toLat,toLng);
    var mapOptions = {
        zoom: 15,
        center: destCoords
    }

    map = new google.maps.Map(document.getElementById("mapContainer"), {
        center: originCoords,
        zoom: 15
    });

    var map = new google.maps.Map(document.getElementById("mapContainer"), mapOptions);
    directionsDisplay.setMap(map);
    directionsDisplay.setPanel(document.getElementById('directionsPanel'));

    var request = {
        origin: originCoords,
        destination: destCoords,
        travelMode: formElems.namedItem("travelMode").value.toUpperCase(),
        provideRouteAlternatives: true
    };
    directionsService.route(request, function(response, status) {
        if (status == 'OK') {
        directionsDisplay.setDirections(response);
        }
    });

}
    
