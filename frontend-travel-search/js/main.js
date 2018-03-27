// This is defined globally to fetch the current script
// Used later to fetch images from server for "Photos" feature
var script = document.currentScript;
var fullUrl = script.src;

var bodyElement = document.getElementsByTagName('body')[0];

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
                '<td class="favIcon"><i class="far fa-star fa-1x fa-pull-left fa-border"></i></td>' + 
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

        var map;

        function initialize() {
            map = new google.maps.Map(document.getElementById('map'), {
            center: {lat: parseFloat(lat), lng: parseFloat(lng)},
            zoom: 15
            });

            var request = {
            placeId: placeID
            };
            
            service = new google.maps.places.PlacesService(map);
            service.getDetails(request, callback);
        }
        
        // Checks that the PlacesServiceStatus is OK, and adds a marker
        // using the place ID and location from the PlacesService.
        function callback(results, status) {
            if (status == google.maps.places.PlacesServiceStatus.OK) {

                var hours = results.opening_hours;
                var hoursStatus = (hours.open_now == 1 ? "Open now:" : "Closed now:");
                var dailyOpenModal = '<a href="#" data-toggle="modal" data-target="#exampleModalCenter">Daily Open Hours</a>';
                var weekdayText = hours.weekday_text;

                var info = {
                    'Address' : results.formatted_address,
                    'Phone Number' : results.international_phone_number,
                    'Price Level': convertPriceToDollar(results.price_level),
                    'Rating' : results.rating,
                    'Google Page' :  '<a target="_blank" href="' + results.url + '">' + results.url + '</a>',
                    'Website' : '<a target="_blank" href="' + results.website + '">' + results.website + '</a>',
                    'Hours' : (results.open_now == 1 ? "Open Now" : "Closed Now") + " " + dailyOpenModal
                }

                var infoContainer = document.getElementById('infoTableBody');

                var infoHTML = '';

                Object.keys(info).forEach(function(key) {
                    infoHTML += '<tr><th scope="row">' + key + '</th><td>' + info[key] + '</td></tr>';
                });
                infoContainer.innerHTML = infoHTML;

                var openHoursModal = document.getElementById('main_modal_body');
                var openHoursHTML = '<table class="table"><tbody>';

                for (let i = 0 ; i < weekdayText.length ; i++) {
                    openHoursHTML += '<tr><th scope="row">' + weekdayText[i] + '</th></tr>';
                };
                openHoursHTML += '</tbody></table></div>';
                openHoursModal.innerHTML = openHoursHTML;
            }
        }
        
        initialize();

    }
}
    
