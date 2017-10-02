// TODO
// - Pretty-print dates
// - Focus map on load
// - Hide fullscreen on escape
// - Relative size prev and next buttons

var rootUrl = document.currentScript.src.split('/').slice(0, -1).join('/');

function fraction(start, end, x) {
  console.assert(typeof start === 'number');
  console.assert(typeof end === 'number');
  console.assert(typeof x === 'number');
  return (x - start) / (end - start);
}

function interpolate(start, end, x) {
  console.assert(typeof start === 'number');
  console.assert(typeof end === 'number');
  console.assert(typeof x === 'number');
  return (1 - x) * start + x * end;
}

var virtualMethod = function() {
  throw 'Implement me';
}

function Locatable() {}
Locatable.prototype.getX = virtualMethod;
Locatable.prototype.getY = virtualMethod;

function MeasuredLocatable() {}
MeasuredLocatable.prototype = Object.create(Locatable.prototype);
MeasuredLocatable.prototype.getMeasurement = virtualMethod;

function MeasuredPoint(x, y, measurement) {
  console.assert(typeof x === 'number', x);
  console.assert(typeof y === 'number', y);
  console.assert(typeof measurement === 'number');
  this.x_ = x;
  this.y_ = y;
  this.measurement_ = measurement;
};

MeasuredPoint.prototype = Object.create(MeasuredLocatable.prototype);

MeasuredPoint.prototype.toString = function() {
  return '(' + this.x_ + ', ' + this.y_ + ') @ ' + this.measurement_;
};

MeasuredPoint.prototype.getX = function() {
  return this.x_;
};

MeasuredPoint.prototype.getY = function() {
  return this.y_;
};

MeasuredPoint.prototype.getMeasurement = function() {
  return this.measurement_;
};

function MeasuredPolyLineBuilder_() {
  this.points_ = [];
}

MeasuredPolyLineBuilder_.prototype.append = function(point) {
  console.assert(point instanceof MeasuredLocatable);
  if (this.points_.length > 0) {
    console.assert(point.getMeasurement() >= this.points_[this.points_.length - 1].getMeasurement(), point.getMeasurement(), this.points_[this.points_.length - 1].getMeasurement(), this.points_.length);
  }
  this.points_.push(point);
  return this;
};

MeasuredPolyLineBuilder_.prototype.build = function() {
  return new MeasuredPolyLine(this.points_);
};

// Private
function MeasuredPolyLine(points) {
  this.points_ = points;
}

MeasuredPolyLine.builder = function() {
  return new MeasuredPolyLineBuilder_();
}

MeasuredPolyLine.prototype.pointAt = function(measurement) {
  console.assert(typeof measurement === 'number');
  var index = 1;
  while ((index < this.points_.length - 1) && (measurement > this.points_[index].getMeasurement())) {
    index++;
  }
  var f = fraction(this.points_[index - 1].getMeasurement(), this.points_[index].getMeasurement(), measurement);
  return new MeasuredPoint(
    interpolate(this.points_[index - 1].getX(), this.points_[index].getX(), f),
    interpolate(this.points_[index - 1].getY(), this.points_[index].getY(), f),
    measurement);
};

function Waypoint(address, lat, lng, arrivalDateString, departureDateString) {
  console.assert(typeof address === 'string');
  console.assert(typeof arrivalDateString === 'string');
  console.assert(typeof departureDateString === 'string');
  this.address = address;
  this.lat = lat;
  this.lng = lng;
  this.arrivalDate = new Date(arrivalDateString);
  this.departureDate = new Date(departureDateString);
  this.isOvernight = arrivalDateString.split('T')[0] !== departureDateString.split('T')[0];
};

function Photo(url, dateString) {
  console.assert(typeof url === 'string');
  console.assert(typeof dateString === 'string');
  this.url_ = url;
  this.date_ = new Date(dateString);
}

Photo.prototype.getUrl = function() {
  return this.url_;
};

Photo.prototype.getDate = function() {
  return this.date_;
};

function initMap(mapDiv, fullscreenDiv, waypoints, photos) {

  addStylesheet({
    'body': {
      'margin': '0px',
      'position': 'absolute',  // So percentage sizes are relative to window
      'width': '100%',
      'height': '100%',
    },
    'div#map': {
      'height': '100%',
    },
    'div#map div#slideshow': {
      'width': '500px',
      'height': '300px',
    },
    'div#fullscreen div#slideshow': {
      'height': '100%',
    },
    '.display_none': {
      'display': 'none',
    },
    'div#fullscreen': {
      'position': 'absolute',
      'top': '0px',
      'height': '100%',
      'width': '100%',
    },
  });

  map = new google.maps.Map(mapDiv);


  var bounds = new google.maps.LatLngBounds();
  var builder = MeasuredPolyLine.builder();
  waypoints.forEach(function(waypoint, index) {
    var latLng = { lat: waypoint.lat, lng: waypoint.lng };
    bounds.extend(latLng);
    builder.append(new MeasuredPoint(waypoint.lat, waypoint.lng, waypoint.arrivalDate.getTime()));
    builder.append(new MeasuredPoint(waypoint.lat, waypoint.lng, waypoint.departureDate.getTime()));
    if (waypoint.isOvernight || index === 0 || index === waypoints.length - 1) {
      new google.maps.Marker({
        map: map,
        position: latLng,
        title: waypoint.address + ': ' + waypoint.arrivalDate + ' to ' + waypoint.departureDate,
        icon: rootUrl + '/tentMarker.png'
      });
    }
  });
  var polyline = builder.build();

  photos = photos.sort(function(x, y) {
    return x.getDate().getTime() - y.getDate().getTime();
  });
  var slideshowDiv = document.createElement('div');
  slideshowDiv.id = 'slideshow';
  var infowindow = new google.maps.InfoWindow({
    content: slideshowDiv,
  });
  var slideshow = new Slideshow(slideshowDiv, photos.map(function(photo) { return photo.getUrl(); }));
  var mapFocusElement;
  var markers = photos.map(function(photo, i) {
    var measuredPoint = polyline.pointAt(photo.getDate().getTime());
    var latLng = { lat: measuredPoint.getX(), lng: measuredPoint.getY() };
    bounds.extend(latLng);
    var marker = new google.maps.Marker({
      map: map,
      position: latLng,
      title: photo.getDate().toString(),
      icon: rootUrl + '/cameraMarker.png'
    });
    marker.addListener('click', function() {
      // I can't get event listeners on the infowindow content to work. Instead,
      // listen to events on the map and forward to the slideshow.
      google.maps.event.addDomListener(mapDiv, 'keydown', function(e) {
        e.stopPropagation();
        slideshowDiv.dispatchEvent(new KeyboardEvent('keydown', {key: e.key}));
      });
      google.maps.event.addDomListener(mapDiv, 'keyup', function(e) {
        e.stopPropagation();
        if (e.key === 'Escape') {
          infowindow.close();
          google.maps.event.clearListeners(mapDiv, 'keyup');
          google.maps.event.clearListeners(mapDiv, 'keydown');
        }
        slideshowDiv.dispatchEvent(new KeyboardEvent('keyup', {key: e.key}));
      });

      // Capture the focusable element for the map, as I can't find any other
      // way to focus the map programmatically.
      mapFocusElement = document.activeElement;
      slideshow.show(i);
    });
    return marker;
  });
  map.fitBounds(bounds);

  infowindow.addListener('closeclick', function() {
    google.maps.event.clearListeners(mapDiv, 'keyup');
    google.maps.event.clearListeners(mapDiv, 'keydown');
  });
  var isFullscreen = false;

  slideshow.onshow = function(prevIndex, nextIndex) {
    if (!isFullscreen) {
      infowindow.open(map, markers[nextIndex]);
    }
  };

  slideshow.onclick = function(index) {
    if (isFullscreen) {
      fullscreenDiv.classList.add('display_none');
      infowindow.setContent(slideshowDiv);
      infowindow.open(map, markers[index]);
      mapFocusElement.focus();
    } else {
      infowindow.close();
      fullscreenDiv.appendChild(slideshowDiv);
      fullscreenDiv.classList.remove('display_none');
      slideshow.focus();
    }
    isFullscreen = !isFullscreen;
  };
}

var rootUrl = document.currentScript.src.split('/').slice(0, -1).join('/');

function buildPhotomap(googleApiKey, waypoints, photos) {
  document.body.innerHTML = '';

  var mapDiv = document.createElement('div');
  mapDiv.id = 'map';
  document.body.appendChild(mapDiv);

  var fullscreenDiv = document.createElement('div');
  fullscreenDiv.id = 'fullscreen';
  fullscreenDiv.className = 'display_none';
  document.body.appendChild(fullscreenDiv);

  go = EventualCallback.build(2, function() {
    initMap(mapDiv, fullscreenDiv, waypoints, photos);
  });

  addScript(rootUrl + '/slideshow.js', go);
  addScript('https://maps.googleapis.com/maps/api/js?key=' + googleApiKey + '&callback=go');
}

function EventualCallback(count, callback) {
  this.count_ = count;
  this.callback_ = callback;
}

EventualCallback.prototype.call = function(x) {
  if (--this.count_ === 0) {
     this.callback_(x);
  }
};

EventualCallback.build = function(count, callback) {
  var x = new EventualCallback(count, callback);
  return x.call.bind(x);
};

function addScript(src, callback) {
  var script = document.createElement('script');
  script.src = src;
  script.onload = callback;
  document.head.appendChild(script);
}
