// TODO
// - Preload images

var rootUrl = document.currentScript.src.split('/').slice(0, -1).join('/');

function Slideshow(element, urls) {
  addStylesheet({
    '.visibility_hidden': {
      'visibility': 'hidden !important',
    },
    'div.slideshow': {
      'display': 'flex',
      'align-items': 'center',
      'background': 'rgba(0, 0, 0, 0.7)',
    },
    'div.slideshow > a': {
      'display': 'block',
      'width': '70px',
      'height': '100%',
      'background-image': 'url(' + rootUrl + '/left.png)',
      'background-repeat': 'no-repeat',
      'background-size': '50px',
      'background-position': 'center',
      'cursor': 'pointer',
      'flex-shrink': '0',
    },
    'div.slideshow > a:nth-child(3)': {
      'transform': 'rotate(0.5turn)',
    },
    'div.slideshow > div': {
      'height': '100%',
      'flex-grow': '1',
      'display': 'flex',
      'justify-content': 'center',
      'align-items': 'center',
    },
    'div.slideshow > div > img': {
      'max-height': '100%',
      'max-width': '100%',
    },
  });
  this.element_ = element;
  this.urls_ = urls;
  this.prev_ = document.createElement('a');
  this.next_ = document.createElement('a');
  var imageContainer = document.createElement('div');
  this.image_ = document.createElement('img');
  imageContainer.appendChild(this.image_);
  this.element_.appendChild(this.prev_);
  this.element_.appendChild(imageContainer);
  this.element_.appendChild(this.next_);
  this.element_.classList.add('slideshow');
  this.prev_.addEventListener('click', function() { this.show(this.index_ - 1); }.bind(this));
  this.next_.addEventListener('click', function() { this.show(this.index_ + 1); }.bind(this));
  this.image_.addEventListener('click', function(e) {
    if (typeof this.onclick === 'function') {
      this.onclick(this.index_);
    }
  }.bind(this));
  // Allow it to be focusable programmatically, but not with the tab key.
  this.element_.tabIndex = -1;
  this.element_.addEventListener('keydown', function(event) {
    // Prevent other things responding to any keys.
    event.stopPropagation();
  });
  this.element_.addEventListener('keyup', function(event) {
    switch(event.key) {
      case 'ArrowLeft':
        if (this.index_ > 0) {
          this.show(this.index_ - 1);
        }
        break;
      case 'ArrowRight':
        if (this.index_ < this.urls_.length - 1) {
          this.show(this.index_ + 1);
        }
        break;
    }
    event.stopPropagation();
  }.bind(this));
}

Slideshow.prototype.focus = function() {
  this.element_.focus();
};

Slideshow.prototype.show = function(index) {
  console.assert(index >= 0 && index < this.urls_.length);
  var prevIndex = this.index_;
  this.index_ = index;
  this.image_.src = this.urls_[index];
  conditionallyApplyClass(this.prev_, 'visibility_hidden', index === 0);
  conditionallyApplyClass(this.next_, 'visibility_hidden', index === this.urls_.length - 1);
  if (typeof this.onshow === 'function') {
    this.onshow(prevIndex, this.index_);
  }
};

function conditionallyApplyClass(element, className, condition) {
  if (condition) {
    element.classList.add(className);
  } else {
    element.classList.remove(className);
  }
}

function addStylesheet(map) {
  var style = document.createElement('style');
  for (selector in map) {
    style.innerHTML += selector + '{\n';
    var rules = map[selector];
    for (property in rules) {
      style.innerHTML += '  ' + property + ': ' + rules[property] + ';\n';
    }
    style.innerHTML += '}\n';
  }
  document.head.appendChild(style);
}
