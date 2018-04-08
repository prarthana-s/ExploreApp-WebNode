var app = angular.module('myApp', ['ngAnimate']);
app.controller('myCtrl', function($scope) {
    $scope.animateDetails = false;
    $scope.animateResults = true;
    $scope.animateReviews = true;
    // console.log($scope.animateDetails);
});
// This is defined globally to fetch the current script
// Used later to fetch images from server for "Photos" feature
var script = document.currentScript;
var fullUrl = script.src;

var bodyElement = document.getElementsByTagName('body')[0];

var googleReviewsSet = '';
var yelpReviewsSet = '';

var panorama;

var results;
var resultsArr = [];
var currPageNumber = -1;

var favIndex = 1;

var userCurrLat = null;
var userCurrLon = null;

var userSelectedLocation = null;

var curLocObtained = false;
var keywordIsValid = false;
var locationIsValid = false;

var map;

// Enable Search button only after user's geolocation is fetched
$.ajax({url: "http://ip-api.com/json", success: function(result){
    jsonObj = JSON.parse(JSON.stringify(result));
    curLocObtained = true;

    document.getElementById('hereLatitude').value = jsonObj.lat; 
    document.getElementById('hereLongitude').value = jsonObj.lon; 
    
    userCurrLat = jsonObj.lat;
    userCurrLon = jsonObj.lon;
    
    var submitButton = document.getElementById('searchButton');
    submitButton.addEventListener('click',submitForm,false);
}});

var autocompleteFlag = false;
var autocompleteMapFlag = false;

var listButton = document.getElementById('backToList');
listButton.addEventListener('click',goBackToList,false);

function resetFunc() {
    document.getElementById('pills-results').innerHTML = '';
    document.getElementById('detailsContent').innerHTML = '';
    $('#pills-results-tab').tab('show')
}

function initAutocomplete() {
    autocompleteInSearch = new google.maps.places.Autocomplete(document.getElementById('locationInputText'));
    autocompleteInSearch.addListener('place_changed', fillInAddress);

    autocompleteInMap = new google.maps.places.Autocomplete(document.getElementById('fromLocation'));
    autocompleteInMap.addListener('place_changed', fillInFromLocation);

    document.getElementById('fromLocation').addEventListener('change',toggleAutocompleteMap, false);
}
initAutocomplete();

function fillInAddress() {
    var place = autocompleteInSearch.getPlace();
    userSelectedLocation = place.name + ", " + place.formatted_address;
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
    userSelectedLocation = null;
}

function toggleAutocompleteMap() {
    autocompleteMapFlag = false;
}


// If "Location" is selected, enable the text field and make it required
function toggleRequired() {
    if (textInput.hasAttribute('required') !== true) {
        textInput.removeAttribute('disabled');
        textInput.setAttribute('required','required');
        locationIsValid = false;
        activateSearchButton();
    }
    
    else {
        textInput.removeAttribute('required');  
    }
}

// Disable location text input if user selects "Here"
function disableTextBox() {
    if (radioSelectionHere.checked) {
        textInput.setAttribute('disabled','disabled');
        textInput.classList.remove('is-invalid');
        textInput.removeAttribute('required');  
        textInput.value = "";
        activateSearchButton();        
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

        // Show progress bar
        document.getElementById('progressBar').removeAttribute("hidden");

        resultsArr = [];

        if (!autocompleteFlag && formElems.namedItem("locationRadio").value == 'location') {
            $.ajax({
                method: "GET",
                url: "http://localhost:8081/geocode",
                crossDomain: true,
                data: {locationInput: formElems.namedItem("locationInput").value}
                })
                .done(function( result ) {
                    lat = result.lat;
                    lon = result.lon;
                    userSelectedLocation = result.addr;
                    
                    $.ajax({
                        method: "GET",
                        url: "http://localhost:8081/nearbyPlaces",
                        crossDomain: true,
                        data: {keyword: formElems.namedItem("keyword").value, category: formElems.namedItem("category").value, distance: formElems.namedItem("distance").value, locationRadio: formElems.namedItem("locationRadio").value, locationInput: formElems.namedItem("locationInput").value, hereLatitude: lat, hereLongitude: lon}
                        })
                        .done(function( result ) {
                            currPageNumber++;
                            resultsArr.push(result);
                            constructResultsTable(JSON.stringify(result),0);
                        });
                });
        }
        else {
            // AJAX call to fetch nearby places JSON data
            $.ajax({
                method: "GET",
                url: "http://localhost:8081/nearbyPlaces",
                crossDomain: true,
                data: {keyword: formElems.namedItem("keyword").value, category: formElems.namedItem("category").value, distance: formElems.namedItem("distance").value, locationRadio: formElems.namedItem("locationRadio").value, locationInput: formElems.namedItem("locationInput").value, hereLatitude: lat, hereLongitude: lon}
                })
                .done(function( result ) {
                    currPageNumber++;
                    resultsArr.push(result);
                    constructResultsTable(JSON.stringify(result),0);
                });
        }
    }
}

var prevPageFlag = false;
// var prevResult;

function constructResultsTable(result, currPageNumber) {
    jsonObj = result;

    if (jsonObj) {
        jsonObj = JSON.parse(jsonObj);
        var nextPageToken = jsonObj.next_page_token;
        results = jsonObj.results;
        var tableHTML = '';
        var favsArray = null;

        if (currPageNumber > 0) {
            prevPageFlag = true;
        }
        else {
            prevPageFlag = false;
        }

        var existingTable = document.getElementById('tableContainer');
        if (existingTable) {
            existingTable.innerHTML = '';
        }

        if (!results.length) {
            tableHTML = '<div class="alert alert-warning" role="alert">No records.</div>';
        }

        else {
            // tableHTML += '<div id="tableContainer">';
            tableHTML += '<button type="button" class="btn btn-outline-dark float-right detailsButton" disabled>Details<i class="fas fa-chevron-right fa-1x fa-float-right"></i></button>';
            tableHTML += '<div class="table-responsive"><table class="table table-hover table-sm" id="placesTable">' + 
            '<tr><th scope="col">#</th>' + 
            '<th scope="col">Category</th>' + 
            '<th scope="col">Name</th>' + 
            '<th scope="col">Address</th>' + 
            '<th scope="col">Favorite</th>' + 
            '<th scope="col">Details</th></tr>';

            // Add filled star styling to already existing favorites in places table
            if ("favs" in localStorage) {
                favsArray = localStorage.getItem("favs");
            }

            for (let i=0; i<results.length; i++) {
                var icon = results[i].icon;
                var name = results[i].name;
                var address = results[i].vicinity;
                var placeID = results[i].place_id;
                var lat = results[i].geometry.location.lat;
                var lng = results[i].geometry.location.lng;
                var isFavItem = false;

                tableHTML += '<tr id="tr_' + placeID + '"><th scope="row">' + (parseInt(i)+1) + '</th>' +
                '<td><img class="placeIcon" src="' + icon + '" alt="user image"/></td>' + 
                '<td class="placeName" data-placeid="' + placeID + '">' + name + '</td>' +
                '<td class="addressInfo">' + address + '</td>';

                if (favsArray) {
                    currentFavsArray = JSON.parse(favsArray);
                    for (let i = 0 ; i < currentFavsArray.length; i++) {
                        if (placeID in currentFavsArray[i]) {
                            tableHTML += '<td class="favIcon" data-index="' + i + '" data-placeID="' + placeID + '"><i class="fas fa-star fa-1x fa-pull-left fa-border fav filledStar"></i></td>';                  
                            isFavItem = true;
                            break;
                        }
                    }
                }

                if (!isFavItem){
                    tableHTML +='<td class="favIcon" data-index="' + i + '" data-placeID="' + placeID + '"><i class="far fa-star fa-1x fa-pull-left fa-border fav"></i></td>'; 
                }
                tableHTML += '<td class="detailsIcon" data-index="' + i + '" data-lat="' + lat + '" data-lng="' + lng + '" data-placeID="' + placeID +
                '"><i class="fas fa-chevron-right fa-1x fa-pull-left fa-border detailsArrow"></i></td></tr>';
            }
            tableHTML += '</table></div>';
        }



        if (prevPageFlag) {
            tableHTML += '<button type="button" id="prevButton" class="btn btn-outline-dark">Previous</button>';
        }

        if (nextPageToken && nextPageToken.length) {
            tableHTML += '<button type="button" id="nextButton" class="btn btn-outline-dark" data-token="' + nextPageToken + '">Next</button></div>';
        }
        // else {
        //     tableHTML += '</div>';
        // }

        // Hide progress bar
        document.getElementById('progressBar').setAttribute("hidden","hidden"); 

        var tableContainer =  document.getElementById('tableContainer');
        tableContainer.innerHTML = tableHTML;

        var placesTable = document.getElementById('placesTable');
        if (placesTable) {
            placesTable.addEventListener('click',processTableRowClick,false);
        }

        var nextButton = document.getElementById('nextButton');
        if (nextButton) {
            nextButton.addEventListener('click',displayNextResults,false);
        }

        var prevButton = document.getElementById('prevButton');
        if (prevButton) {
            prevButton.addEventListener('click',displayPrevResults,false);
        }

        var detailsButtons = document.getElementsByClassName('detailsButton');
        if(detailsButtons) {
            for (let i = 0 ; i < detailsButtons.length; i++) {
                detailsButtons[i].style.display = 'block';
            }
        }
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

    // Show progress bar
    document.getElementById('progressBar').removeAttribute("hidden");

    $.ajax({
        method: "GET",
        url: "http://localhost:8081/nextPage",
        crossDomain: true,
        data: {nextPageToken: nextPageToken}
        })
        .done(function( result ) {
            currPageNumber++;
            resultsArr.push(result);
            constructResultsTable(JSON.stringify(result),currPageNumber);
        });
}

function displayPrevResults(ev) {
    currPageNumber--;
    constructResultsTable(JSON.stringify(resultsArr[currPageNumber]),currPageNumber);
}

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

function arrayRotate(arr, count) {
    count -= arr.length * Math.floor(count / arr.length)
    arr.push.apply(arr, arr.splice(0, count))
    return arr
}

var createGroupedArray = function(arr, chunkSize) {
    var groups = [], i;
    for (i = 0; i < arr.length; i += chunkSize) {
        groups.push(arr.slice(i, i + chunkSize));
    }
    return groups;
}

var previousSelectedRow = null;

function processTableRowClick(ev){
    let target = ev.target.parentNode;

    // Details icon
    if(target.className == 'detailsIcon') {
        var lat = target.dataset.lat;
        var lng = target.dataset.lng;
        var placeID = target.dataset.placeid;
        var index = target.dataset.index;

        var rowName = "tr_" + placeID;

        if (previousSelectedRow) {
            var previousRow = document.getElementById(previousSelectedRow);
            if (previousRow) {
                previousRow.classList.remove("table-warning");
            }
        }

        previousSelectedRow = rowName;

        var correspondingRow = document.getElementById(rowName);
        correspondingRow.classList.add("table-warning");

        // Show progress bar
        document.getElementById('progressBar').removeAttribute("hidden");


        function getInfo() {
            let locationCoordinates = {lat: parseFloat(lat), lng: parseFloat(lng)};
            map = new google.maps.Map(document.getElementById('mapContainer'), {
                center: locationCoordinates,
                zoom: 14,
                streetViewControl: false
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

            panorama = map.getStreetView();
            panorama.setPosition(locationCoordinates);
            panorama.setPov(/** @type {google.maps.StreetViewPov} */({
                heading: 265,
                pitch: 0
            }));
        }
        
        // Checks that the PlacesServiceStatus is OK, and adds a marker
        // using the place ID and location from the PlacesService.
        function callback(results, status) {
            if (status == google.maps.places.PlacesServiceStatus.OK) {

                var headerDiv = document.getElementById('detailsHeader');
                headerDiv.innerHTML = results.name;

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
                    info['Rating'] = results.rating +'<span id="rateYo"></span>';
                }


                if (results.url) {
                    info['Google Page'] = '<a target="_blank" href="' + results.url + '">' + results.url + '</a>';
                }

                if (results.website) {
                    info['Website'] = '<a target="_blank" href="' + results.website + '">' + results.website + '</a>';
                }

                // Open Hours Modal Pane
                var utc_offset = results.urc_offset;
                var todayDay = moment.utc(utc_offset).format("dddd");
                var hours = results.opening_hours;
                if (hours) {
                    var dailyOpenModal = '&nbsp;&nbsp;&nbsp;<a href="#" id="dailyOpenLink" data-toggle="modal" data-target="#exampleModalCenter">Daily Open Hours</a>';
                    var weekdayText = hours.weekday_text;

                    for (let i = 0 ; i < weekdayText.length; i++) {
                        weekdayText[i] =  (weekdayText[i].split(/:(.+)/));   
                        weekdayText[i][1] = weekdayText[i][1].trim();              
                    }
                    
                    for(let i = 0 ; i < weekdayText.length; i++) {
                        if (weekdayText[0][0] != todayDay) {
                            arrayRotate(weekdayText,1);
                        }
                        else {
                            break;
                        }
                    }

                    
                    var openHoursModal = document.getElementById('main_modal_body');
                    var openHoursHTML = '<table class="table"><tbody>';
                    
                    for (let i = 0 ; i < weekdayText.length ; i++) {
                        if (i ==0) {
                            openHoursHTML += '<tr><th scope="row">' + weekdayText[i][0] + '</th><th>' + weekdayText[i][1] + '</th></tr>';
                            if (hours.open_now) {
                                info['Hours'] = 'Open now: ' + weekdayText[i][1] + ' ' + dailyOpenModal;
                            }
                            else {
                                info['Hours'] = 'Closed ' + dailyOpenModal;
                            }
                        }
                        else {
                            openHoursHTML += '<tr><td>' + weekdayText[i][0] + '</td><td>' + weekdayText[i][1] + '</td></tr>';
                        }
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

                $("#rateYo").rateYo({
                    rating: parseFloat(results.rating),
                    starWidth: "15px",
                    normalFill: "transparent"
                });

                var infoFavButton = document.getElementsByClassName('infoFavIcon')[0];
                infoFavButton.dataset.index = index;
                infoFavButton.dataset.placeid = placeID;
                let starElem = infoFavButton.childNodes[0];

                var isFav = false;
                if ("favs" in localStorage) {
                    favsArray = localStorage.getItem("favs");
                }
                if (favsArray) {
                    currentFavsArray = JSON.parse(favsArray);
                    for (let i = 0 ; i < currentFavsArray.length; i++) {
                        if (placeID in currentFavsArray[i]) {
                            starElem.classList.add("filledStar");
                            starElem.classList.remove("far");
                            starElem.classList.add("fas");
                            isFav = true;
                            break;
                        }
                    }
                }

                if (!isFav) {
                    // Replace filled star by empty star
                    starElem.classList.remove("filledStar");
                    starElem.classList.remove("fas");
                    starElem.classList.add("far");
                }

                infoFavButton.addEventListener('click', processInfoFav,false);

                // Photos
                if (results.photos) {
                    var chunkedPhotoArr = createGroupedArray(results.photos,4);
                    var photosContainer = document.getElementById('photosDisplay');
                    var photosHTML = '<div class="row">';
                    for (let i = 0 ; i < chunkedPhotoArr[0].length; i++) {
                        photosHTML += '<div class="column">';
                        for (let j = 0 ; j < chunkedPhotoArr.length; j++) {
                            if (chunkedPhotoArr[j][i]) {
                                let photoLink = chunkedPhotoArr[j][i].getUrl({'maxWidth': chunkedPhotoArr[j][i].width , 'maxHeight': chunkedPhotoArr[j][i].height });                            
                                if (photoLink) {
                                    photosHTML += '<a target="_blank" href="' + photoLink + '"><img class="img-thumbnail" src="' + photoLink + '" alt="Card image cap"/></a>';
                                }
                            }
                        }
                        photosHTML += '</div>';
                    }
                    photosHTML += '</div>';

                    photosContainer.innerHTML = photosHTML;
                }

                // No photos
                else {
                    var photosContainer = document.getElementById('photosDisplay');
                    var photosHTML = '<div class="alert alert-warning" role="alert">No records.</div>';
                    photosContainer.innerHTML = photosHTML;
                }


                // Google Reviews
                var googleReviewsContainer = document.getElementById('googleReviews');
                googleReviewsContainer.innerHTML = '';
                googleReviews = results.reviews;
                if (googleReviews) {
                    generateGoogleReviews(googleReviews,1);
                }
                else {
                    googleReviewsContainer.innerHTML = '<div class="alert alert-warning" role="alert">No records.</div>';
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


                var yelpReviewsContainer = document.getElementById('yelpReviews');
                yelpReviewsContainer.innerHTML = '';
                $.ajax({
                    method: "GET",
                    url: "http://localhost:8081/yelpReviews",
                    crossDomain: true,
                    data: yelpParams
                    })
                    .done(function( yelpReviews ) {
                        console.log(yelpReviews);
                        if(yelpReviews.length) {
                            generateYelpReviews(yelpReviews,1);
                        }
                        else {
                            yelpReviewsContainer.innerHTML = '<div class="alert alert-warning" role="alert">No records.</div>';
                        }
                });


                // Map
                let toFieldValue = results.name + ", " + results.formatted_address;
                var toField = document.getElementById('toLocation');
                toField.value = toFieldValue; 

                var mainFormElems = document.getElementById('mainForm').elements;
                var fromField = document.getElementById('fromLocation');
                // Come back here
                if (mainFormElems.namedItem("locationRadio").value == 'location') {
                    fromField.value = userSelectedLocation;
                }
                else {
                    fromField.value = "Your location";
                }
                
                var formElems = document.getElementById('directionsForm').elements;
                formElems.namedItem("toLatitude").value = results.geometry.location.lat();
                formElems.namedItem("toLongitude").value = results.geometry.location.lng();

                var mapSubmitButton = document.getElementById('submitMapForm');
                mapSubmitButton.addEventListener('click',obtainMapFromCoords,false);

                var toggleStreetButton = document.getElementById('streetViewToggle');
                toggleStreetButton.addEventListener('click',toggleStreetView,false);


                // Tweet button
                var tweetButton = document.getElementById('tweet');

                var text = 'Check out ' + results.name + ' located at ' + results.formatted_address + '. Website: ' + (results.website ? results.website : results.url);
                
                tweetButton.href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&hashtags=TravelAndEntertainmentSearch'  ;
            }
        }
        getInfo();

        // var scope = angular.element(document.getElementById('tableContainer'));
        // console.log(scope);
        // scope.animateDetails = true;
        // scope.$apply();
        // var tableContainer = document.getElementById('tableContainer');
        // if (tableContainer) {
        //     tableContainer.style.display = 'none';
        // }

        // Hide progress bar
        document.getElementById('progressBar').setAttribute("hidden","hidden"); 

        let detailsButtons = document.getElementsByClassName('detailsButton');
        if (detailsButtons) {
            for (let i = 0 ; i < detailsButtons.length; i++) {
                detailsButtons[i].removeAttribute("disabled");
                detailsButtons[i].addEventListener('click',showDetailsPane,false);
            }
        }

        let favsContainer = document.getElementById('favTableContainer');
        if (favsContainer) {
            favsContainer.style.display = 'none';
        }

        // var scopeFav = angular.element(document.getElementById('favTableContainer')).scope();
        // scopeFav.animateDetails = true;
        // scopeFav.$apply();

        // var tabInterface = document.getElementById('detailsContent');
        // tabInterface.style.display = 'block';
        // console.log(angular.element(document.getElementById('body')).scope());
        var scopeDetails = angular.element(document.getElementById('body')).scope();
        scopeDetails.animateDetails = true;
        scopeDetails.animateResults = false;
        scopeDetails.$apply();

    }
    else if (target.className == 'favIcon' || target.className == 'infoFavIcon') {

        let index = target.dataset.index;
        let placeID = target.dataset.placeid;

        let starElem = target.childNodes[0];

        // Obtain local storage contents
        let favsArray = localStorage.getItem("favs");

        // Check if executing unfavourite
        if (starElem.classList.contains("filledStar")) {

            // Replace filled star by empty star
            starElem.classList.remove("filledStar");
            starElem.classList.remove("fas");
            starElem.classList.add("far");

            // Find place object in array and remove
            currentFavsArray = JSON.parse(favsArray);
            for (let i = 0 ; i < currentFavsArray.length; i++) {
                if (placeID in currentFavsArray[i]) {
                    currentFavsArray.splice(i, 1);
                    break;
                }
            }

            // Rewrite updated array to local storage
            localStorage.setItem("favs", JSON.stringify(currentFavsArray));
        }

        // Executing add to favourites
        else {

            // Replace empty star by filled star
            starElem.classList.add("filledStar");
            starElem.classList.remove("far");
            starElem.classList.add("fas");

            // If local storage hasn't been initialized, if none exists
            if (!favsArray) {
                var newFavsArray = [];
                newFavsArray.push({ [placeID] : results[index]});
                localStorage.setItem("favs", JSON.stringify(newFavsArray));
            }

            // Add new place to favourites list
            else {
                currentFavsArray = JSON.parse(favsArray);
                currentFavsArray.push({ [placeID] : results[index]});
                localStorage.setItem("favs", JSON.stringify(currentFavsArray));
            }
        }

    }
    else if (target.className == 'delIcon') { 
        let placeID = target.dataset.placeid;
        let startIndex = target.dataset.startindex;
        // Obtain local storage contents
        let favsArray = localStorage.getItem("favs");

        // Find place object in array and remove
        currentFavsArray = JSON.parse(favsArray);
        let curFavsArrayLen = currentFavsArray.length;
        for (let i = 0 ; i < curFavsArrayLen; i++) {
            if (placeID in currentFavsArray[i]) {
                currentFavsArray.splice(i, 1);
                break;
            }
        }

        curFavsArrayLen = currentFavsArray.length;
        if (curFavsArrayLen % 20 == 0) {
            startIndex = curFavsArrayLen - 20;
        }

        // Rewrite updated array to local storage
        localStorage.setItem("favs", JSON.stringify(currentFavsArray));

        generateFavsTable(startIndex);
    }
}

function goBackToList(ev) {
    if (ev.target.parentNode.dataset.from == 'results'){
        let tableContainer = document.getElementById('tableContainer');
        tableContainer.style.display = 'block';
    }
    else {
        let favTableContainer = document.getElementById('favTableContainer');
        favTableContainer.style.display = 'block';
    }

    // let tabInterface = document.getElementById('detailsContent');
    // tabInterface.style.display = 'none';

    var scopeDetails = angular.element(document.getElementById('body')).scope();
    scopeDetails.animateDetails = false;
    scopeDetails.animateResults = true;
    scopeDetails.$apply();
}

function generateYelpReviews(yelpReviews, originalResult=0) {
    if (originalResult){
        yelpReviewsSet = JSON.parse(JSON.stringify(yelpReviews));
    }

    var yelpReviewsHTML = '';

    for (let i = 0 ; i < yelpReviews.length; i++) {
        yelpReviewsHTML += '<div class="card reviewsCard"><div class="card-body"><div class="media"> \
            <a target="_blank" href="' + yelpReviews[i].url + '"><img class="align-self-start mr-3 yelpAuthorPic" src="' + yelpReviews[i].user.image_url +'" alt="Generic placeholder image"/></a>\
            <div class="media-body"><a target="_blank" href="' + yelpReviews[i].url + '"><h6 class="mt-0 card-text author-name authorName">' + yelpReviews[i].user.name + '</h6></a>';

        for (let j = 0 ; j < yelpReviews[i].rating; j++) {
            yelpReviewsHTML += '<i class="fas fa-star filledStar"></i>';
        }
            
        yelpReviewsHTML += ' <span class="card-text text-muted time-stamp">' + yelpReviews[i].time_created + '</span>' + 
            '<p class="card-text review-text">' + yelpReviews[i].text + '</p></div></div></div></div>';
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
        googleReviewsHTML += '<div class="card reviewsCard"><div class="card-body"><div class="media"> \
            <a target="_blank" href="' + googleReviews[i].author_url + '"><img class="align-self-start mr-3 authorPic" src="' + googleReviews[i].profile_photo_url +'" alt="Generic placeholder image"/></a>\
            <div class="media-body"><a target="_blank" href="' + googleReviews[i].author_url + '"><h6 class="mt-0 card-text author-name authorName">' + googleReviews[i].author_name + '</h6></a>';

        for (let j = 0 ; j < googleReviews[i].rating; j++) {
            googleReviewsHTML += '<i class="fas fa-star filledStar"></i>';
        }
            
        googleReviewsHTML += ' <span class="card-text text-muted time-stamp">' + timestamp + '</span>' + 
            '<p class="card-text review-text">' + googleReviews[i].text + '</p></div></div></div></div>';
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
    if (ev.target.parentNode.id == 'reviewsToggle') {
        
        let dropdownButton = document.getElementById('dropdownReviews');

        if (ev.target.id == 'yelpReviewsButton') {
            // document.getElementById('yelpReviews').removeAttribute("hidden");;
            // document.getElementById('googleReviews').setAttribute("hidden","hidden"); 

            var scopeDetails = angular.element(document.getElementById('body')).scope();
            scopeDetails.animateReviews = false;
            scopeDetails.$apply();
            
            dropdownButton.innerHTML = 'Yelp Reviews';
        }
        else if (ev.target.id == 'googleReviewsButton') {
            // document.getElementById('yelpReviews').setAttribute("hidden","hidden");
            // document.getElementById('googleReviews').removeAttribute("hidden"); 
            
            var scopeDetails = angular.element(document.getElementById('body')).scope();
            scopeDetails.animateReviews = true;
            scopeDetails.$apply();
            
            dropdownButton.innerHTML = 'Google Reviews';
        }
    }

    // Sort reviews
    else if (ev.target.parentNode.id == 'reviewsSort') {

        let dropdownButton = document.getElementById('dropdownSort');

        if(ev.target.id == 'defaultOrderSort') {
            if (yelpReviewsSet) {
                generateYelpReviews(yelpReviewsSet,0);
            }
            if (googleReviewsSet) {
                generateGoogleReviews(googleReviewsSet,0);
            }

            dropdownButton.innerHTML = 'Default Order';
        }
        else if(ev.target.id == 'highestRatingSort') {
            let tempYelpReviews = JSON.parse(JSON.stringify(yelpReviewsSet));
            if (tempYelpReviews) {
                tempYelpReviews.sort(compareValues('rating', 'desc'));
                generateYelpReviews(tempYelpReviews,0);
            }

            let tempGoogleReviews = JSON.parse(JSON.stringify(googleReviewsSet));
            if (tempGoogleReviews) {
                tempGoogleReviews.sort(compareValues('rating', 'desc'));
                generateGoogleReviews(tempGoogleReviews,0);
            }

            dropdownButton.innerHTML = 'Highest Rating';
        }
        else if(ev.target.id == 'lowestRatingSort') {
            let tempYelpReviews = JSON.parse(JSON.stringify(yelpReviewsSet));
            if (tempYelpReviews) {
                tempYelpReviews.sort(compareValues('rating'));
                generateYelpReviews(tempYelpReviews,0);
            }

            let tempGoogleReviews = JSON.parse(JSON.stringify(googleReviewsSet));
            if (tempGoogleReviews) {
                tempGoogleReviews.sort(compareValues('rating'));
                generateGoogleReviews(tempGoogleReviews,0);
            }

            dropdownButton.innerHTML = 'Lowest Rating';
        }
        else if(ev.target.id == 'mostRecentSort') {
            let tempYelpReviews = JSON.parse(JSON.stringify(yelpReviewsSet));
            if (tempYelpReviews) {
                tempYelpReviews.sort(compareValues('time_created','desc'));
                generateYelpReviews(tempYelpReviews,0);
            }

            let tempGoogleReviews = JSON.parse(JSON.stringify(googleReviewsSet));
            if (tempGoogleReviews) {
                tempGoogleReviews.sort(compareValues('time','desc'));
                generateGoogleReviews(tempGoogleReviews,0);
            }

            dropdownButton.innerHTML = 'Most Recent';
        }
        else if(ev.target.id == 'leastRecentSort') {
            let tempYelpReviews = JSON.parse(JSON.stringify(yelpReviewsSet));
            if (tempYelpReviews) {
                tempYelpReviews.sort(compareValues('time_created'));
                generateYelpReviews(tempYelpReviews,0);
            }

            let tempGoogleReviews = JSON.parse(JSON.stringify(googleReviewsSet));
            if (tempGoogleReviews) {
                tempGoogleReviews.sort(compareValues('time'));
                generateGoogleReviews(tempGoogleReviews,0);
            }

            dropdownButton.innerHTML = 'Least Recent';
        }
    }
}

function fillInFromLocation() {
    var place = autocompleteInMap.getPlace();
    var formElems = document.getElementById('directionsForm').elements;
    autocompleteMapFlag = true;
    formElems.namedItem("fromLatitude").value = place.geometry.location.lat();
    formElems.namedItem("fromLongitude").value = place.geometry.location.lng();
}

function obtainMapFromCoords() {
    var formElems = document.getElementById('directionsForm').elements;
    
    var toLat = formElems.namedItem("toLatitude").value;
    var toLng = formElems.namedItem("toLongitude").value;
    
    var fromLat, fromLon;
    
    if (!autocompleteMapFlag) {
        if (formElems.namedItem("fromLocation").value == 'My location' || formElems.namedItem("fromLocation").value == 'Your location' ){
            fromLat = userCurrLat;
            fromLon = userCurrLon;
            getDirections(fromLat,fromLon,toLat,toLng);
        }
        else {
            $.ajax({
                method: "GET",
                url: "http://localhost:8081/geocode",
                crossDomain: true,
                data: {locationInput: formElems.namedItem("fromLocation").value}
                })
                .done(function( result ) {
                    fromLat = result.lat;
                    fromLon = result.lon;
                    getDirections(fromLat,fromLon,toLat,toLng);
            });
        }
    }
    else {
        fromLat = formElems.namedItem("fromLatitude").value;
        fromLon = formElems.namedItem("fromLongitude").value;
        getDirections(fromLat,fromLon,toLat,toLng);
    }
}

function getDirections(fromLat,fromLon,toLat,toLng){
    // If Get Directions is clicked more than once, clear the old directions panel
    document.getElementById('directionsPanel').innerHTML = '';
    
    var formElems = document.getElementById('directionsForm').elements;
    var directionsService = new google.maps.DirectionsService();
    var directionsDisplay = new google.maps.DirectionsRenderer();
    var originCoords = new google.maps.LatLng(fromLat,fromLon);
    var destCoords = new google.maps.LatLng(toLat,toLng);
    var mapOptions = {
        zoom: 15,
        center: destCoords
    }

    map = new google.maps.Map(document.getElementById("mapContainer"), mapOptions);
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

function toggleStreetView() {
    var toggle = panorama.getVisible();
    var gMapImg = document.getElementById('gMapImg');
    var pegmanImg = document.getElementById('pegmanImg');
    if (toggle == false) {
      panorama.setVisible(true);
      gMapImg.style.display = 'block';
      pegmanImg.style.display = 'none';
    } 
    else {
      panorama.setVisible(false);
      gMapImg.style.display = 'none';
      pegmanImg.style.display = 'block';
    }
}

$('a[data-toggle="pill"]').on('show.bs.tab', function (e) {
    if (e.target.id == 'pills-favorites-tab' ) {
        generateFavsTable(0);
        listButton.dataset.from = 'favs';
    }

    // Cross verify if favourited items still exist as favorited items
    else if (e.target.id == 'pills-results-tab') {
        listButton.dataset.from = 'results';
        var allFavIcons = document.getElementsByClassName('favIcon');
        if (allFavIcons) {
            if ("favs" in localStorage) {
                favsArray = localStorage.getItem("favs");
            }

            var favChecker = false;
            for (let i = 0 ; i < allFavIcons.length; i++) {
                let starElem = allFavIcons[i].childNodes[0];
                let isFav = starElem.classList.contains('filledStar');
                if (isFav) {
                    placeID = allFavIcons[i].dataset.placeid;
                    if (favsArray) {
                        currentFavsArray = JSON.parse(favsArray);
                        for (let i = 0 ; i < currentFavsArray.length; i++) {
                            if (placeID in currentFavsArray[i]) {
                                favChecker = true;
                                break;
                            }
                        }
                        if (!favChecker) {
                            starElem.classList.remove("filledStar");
                            starElem.classList.remove("fas");
                            starElem.classList.add("far");
                        }
                        favChecker = false;
                    }
                }
            }
        }
    }
})

function generateFavsTable(startingIndex=0) {
    let favsTab = document.getElementById('pills-favorites');
    let favsInnerHTML = '';
    let showNextFavButton = false;
    let showPrevFavButton = false;
    if ("favs" in localStorage) {
        let favItems = JSON.parse(localStorage["favs"]);
        let length = favItems.length;

        if (favItems.length) {
            favsInnerHTML = '<div class="table-responsive" id="favTableContainer">' +
            '<button type="button" class="btn btn-outline-dark float-right detailsButton" disabled>Details<i class="fas fa-chevron-right fa-1x fa-float-right"></i></button>' +  
            '<table class="table table-hover table-sm table-responsive" id="favsTable">' + 
            '<tr><th scope="col">#</th>' + 
            '<th scope="col">Category</th>' + 
            '<th scope="col">Name</th>' + 
            '<th scope="col">Address</th>' + 
            '<th scope="col">Favorite</th>' + 
            '<th scope="col">Details</th></tr>';

            if (length - startingIndex > 20) {
                length = startingIndex + 20;
                showNextFavButton = true;
            }

            if (startingIndex >= 20) {
                showPrevFavButton = true;
            }

            for (let i = startingIndex ; i < length; i++) {  
                let favItem = (Object.values(favItems[i])[0]);              
                let icon = favItem.icon;
                let name = favItem.name;
                let address = favItem.vicinity;
                let placeID = favItem.place_id;
                let lat = favItem.geometry.location.lat;
                let lng = favItem.geometry.location.lng;
                let currentRowID = 'tr_' + placeID;
                if (previousSelectedRow == currentRowID) {
                    favsInnerHTML += '<tr id="tr_' + placeID + '" class="table-warning">';
                }
                else {
                    favsInnerHTML += '<tr id="tr_' + placeID + '">';
                }
                
                favsInnerHTML += '<th scope="row">' + (parseInt(i)+1) + '</th>' +
                '<td><img class="placeIcon" src="' + icon + '" alt="user image"/></td>' + 
                '<td class="placeName" data-placeid="' + placeID + '">' + name + '</td>' +
                '<td class="addressInfo">' + address + '</td>' + 
                '<td class="delIcon" data-index="' + i + '" data-placeID="' + placeID + '" data-startindex="' + startingIndex + '"><i class="fas fa-trash-alt fa-1x fa-pull-left fa-border fav"></i></td>' + 
                '<td class="detailsIcon" data-index="' + i + '" data-lat="' + lat + '" data-lng="' + lng + '" data-placeID="' + placeID +
                '"><i class="fas fa-chevron-right fa-1x fa-pull-left fa-border detailsArrow"></i></td></tr>';
            }
            favsInnerHTML += '</table>';

            if (showPrevFavButton) {
                favsInnerHTML += '<button type="button" id="prevFavsButton" class="btn btn-outline-dark" data-nextstartindex="' + (startingIndex-20) + '">Previous</button>';
            }
            
            if (showNextFavButton) {
                favsInnerHTML += '<button type="button" id="nextFavsButton" class="btn btn-outline-dark" data-nextstartindex="' + (startingIndex+20) + '">Next</button>';
            }
            favsInnerHTML += '</div>';
        }
        else {
            favsInnerHTML = '<div class="alert alert-warning" role="alert">No records.</div>';
        }
    }
    else {
        favsInnerHTML = '<div class="alert alert-warning" role="alert">No records.</div>';
    }

    favsTab.innerHTML = favsInnerHTML;

    // var favsTable = document.getElementById('favsTable');
    // if (favsTable) {
    //     favsTable.addEventListener('click',processTableRowClick,false);
    // }

    var favsContainer = document.getElementById('favTableContainer');
    if (favsContainer) {
        favsContainer.addEventListener('click',processFavsTableClick,false);
    }

    
    var detailsButtons = document.getElementsByClassName('detailsButton');
    if(detailsButtons) {
        for (let i = 0 ; i < detailsButtons.length; i++) {
            detailsButtons[i].style.display = 'block';
        }
        if (previousSelectedRow){
            for (let i = 0 ; i < detailsButtons.length; i++) {
                detailsButtons[i].removeAttribute("disabled");
                detailsButtons[i].addEventListener('click',showDetailsPane,false);
            }
        }
    }
}
    
function processInfoFav(ev) {
    // Treat the fav icon click as if clicked in row
    processTableRowClick(ev);
}

function showDetailsPane(ev) {
    // let tableContainer = document.getElementById('tableContainer');
    // tableContainer.style.display = 'none';

    // var tabInterface = document.getElementById('detailsContent');
    // tabInterface.style.display = 'block';

    var scopeDetails = angular.element(document.getElementById('detailsContent')).scope();
    scopeDetails.animateDetails = true;
    scopeDetails.animateResults = false;
    scopeDetails.$apply();

    let favsContainer = document.getElementById('favTableContainer');
    if (favsContainer) {
        favsContainer.style.display = 'none';
    }
}

function processFavsTableClick(ev) {
    if (ev.target.parentNode.className == 'detailsIcon' || ev.target.parentNode.className == 'delIcon') {
        processTableRowClick(ev);
    }
    else if (ev.target.id == 'nextFavsButton' || ev.target.id == 'prevFavsButton') {
        generateFavsTable(ev.target.dataset.nextstartindex);
    }
}

var searchButton = document.getElementById('searchButton');

// Form validation
$( "#keyword" )
.focusout(function() {
    let val = $('#keyword').val();
    if (/\S/.test(val)){
        $( "#keyword" ).removeClass( "is-invalid" );
        keywordIsValid = true; 
        activateSearchButton();
    }
    else {
        $( "#keyword" ).removeClass( "form-control" ).addClass( "form-control is-invalid" );  
        keywordIsValid = false;  
        activateSearchButton();
    }
})

$( "#locationInputText" )
.focusout(function() {
    let val = $('#locationInputText').val();
    if (/\S/.test(val)){
        $( "#locationInputText" ).removeClass( "is-invalid" );
        locationIsValid = true;
        activateSearchButton();
    }
    else {
        $( "#locationInputText" ).removeClass( "form-control" ).addClass( "form-control is-invalid" ); 
        locationIsValid = false;
        activateSearchButton();
    }
})

$( "#keyword" ).keyup(function() {
    let val = $('#keyword').val();
    if (/\S/.test(val)){
        $( "#keyword" ).removeClass( "is-invalid" );
        keywordIsValid = true; 
        activateSearchButton();
    }
    else {
        keywordIsValid = false;
        activateSearchButton();    
    }
});

$( "#locationInputText" ).keyup(function() {
    let val = $('#locationInputText').val();
    if (/\S/.test(val)){
        $( "#locationInputText" ).removeClass( "is-invalid" );
        locationIsValid = true;
        activateSearchButton();
    }
    else {
        locationIsValid = false;
        searchButton.setAttribute('disabled','disabled');
        activateSearchButton();
    }
});

function activateSearchButton() {
    var formElems = document.getElementById('mainForm').elements;
    if (curLocObtained) {
        if (keywordIsValid) {
            if (formElems.namedItem("locationRadio").value == "location") {
                if (locationIsValid) {
                    searchButton.removeAttribute('disabled'); 
                }
                else {
                    searchButton.setAttribute('disabled','disabled');
                }
            }
            else {
                searchButton.removeAttribute('disabled'); 
            }
        }
        else {
            searchButton.setAttribute('disabled','disabled'); 
        }
    }
}