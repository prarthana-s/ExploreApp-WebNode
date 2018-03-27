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
console.log(radioSelectionLoc);
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

        console.log(formElems.namedItem("locationRadio").value);

        if (!autocompleteFlag && formElems.namedItem("locationRadio").value == 'location') {
            console.log("double call!");
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
                            // console.log(msg);
                            constructResultsTable(JSON.stringify(result),0);
                        });
                });
        }
        else {
            console.log("single call!");
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

function constructResultsTable(result, nextTracker) {
    jsonObj = result;

    if (jsonObj) {
        jsonObj = JSON.parse(jsonObj);
        console.log(jsonObj);
        var nextPageToken = jsonObj.next_page_token;
        var results = jsonObj.results;
        var myLat = jsonObj.lat;
        var myLon = jsonObj.lon;

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

                tableHTML += '<tr><th scope="row">' + (parseInt(i)+nextTracker+1) + '</th>' +
                '<td><img class="placeIcon" src="' + icon + '" alt="user image"/></td>' + 
                '<td class="placeName" data-placeid="' + placeID + '">' + name + '</td>' +
                '<td class="addressInfo">' + address + '</td>' + 
                '<td class="favIcon"><i class="far fa-star fa-1x fa-pull-left fa-border"></i></td>' + 
                '<td class="detailsIcon" data-lat="' + lat + '" data-lng="' + lng + '" data-placeID="' + placeID +
                '"><i class="fas fa-chevron-right fa-1x fa-pull-left fa-border"></i></td></tr>';
            }
            tableHTML += '</table></div>';
        }

        if (nextPageToken && nextPageToken.length) {
            console.log("show next button");
            tableHTML += '<div><button type="button" id="nextButton" class="btn btn-outline-dark" data-token="' + nextPageToken + '" data-tracker="' + nextTracker + '">Next</button></div>';
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
    var nextTracker = ev.target.dataset.tracker;
    console.log(ev);
    $.ajax({
        method: "GET",
        url: "http://localhost:3000/nextPage",
        crossDomain: true,
        data: {nextPageToken: nextPageToken}
        })
        .done(function( result ) {
            constructResultsTable(JSON.stringify(result),parseInt(nextTracker)+20);
        });
}

function processTableRowClick(ev){
    let target = ev.target.parentNode;
    if(target.className == 'detailsIcon') {
        console.log(target);
        var map;
        var request = {
            placeId: target.placeID
          };
          
          service = new google.maps.places.PlacesService(map);
          service.getDetails(request, callback);
          
          function callback(place, status) {
            if (status == google.maps.places.PlacesServiceStatus.OK) {
              console.log(place);
            }
          }
    }
}
    
