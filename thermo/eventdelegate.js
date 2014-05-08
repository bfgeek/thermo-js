goog.provide('thermo.EventDelegate');

goog.require('goog.asserts');



/**
 * The event delegate abstracts the event subsystem.
 * @param {!thermo.Scheduler} scheduler
 * @constructor
 * @struct
 * @export
 */
thermo.EventDelegate = function(scheduler) {
  /** @private {!thermo.Scheduler} */
  this.scheduler_ = scheduler;

  /** @private {!Object.<boolean>} */
  this.eventTypes_ = {};

  /** @private {!Array.<!Element>} */
  this.roots_ = [];

  /** @private {!Object.<!Array.<!thermo.EventDelegate.Handler_>>} */
  this.handlers_ = {};

  /** @private {function(Event)} */
  this.listener_ = goog.bind(this.onEvent_, this);
};


/**
 * Adds a root element to capture events on.
 * @param {!Element} el
 * @export
 */
thermo.EventDelegate.prototype.addRoot = function(el) {
  this.roots_.push(el);

  for (var type in this.eventTypes_) {
    el.addEventListener(type, this.listener_, false);
  }
};


/**
 * Removes a root element.
 * @param {!Element} el
 * @export
 */
thermo.EventDelegate.prototype.removeRoot = function(el) {
  var idx = this.roots_.indexOf(el);
  goog.asserts.assert(idx >= 0, 'root never added to event delegate.');

  for (var type in this.eventTypes_) {
    el.removeEventListener(type, this.listener_, false);
  }

  this.roots_.splice(idx, 1);
};


/**
 * Registers a set of handlers with the event delegate. The map is an event or
 * gesture pair with a CSS selector.
 *
 * delegate.registerHandlers({
 *   'action .foo': this.onAction_,
 *   'keypress .blah': this.onKeyPress_
 * }, this);
 *
 * @param {!Object.<function(this:S)>} handlers The handler map.
 * @param {S} scope The scope in which to invoke the handlers.
 * @param {boolean=} opt_sync If the handler should be triggered syncronously or
 *     wait for a frame.
 * @template S
 * @export
 */
thermo.EventDelegate.prototype.registerHandlers =
    function(handlers, scope, opt_sync) {
  for (var handler in handlers) {
    var idx = handler.indexOf(' ');
    var type = handler.substr(0, idx);
    var selector = handler.substr(idx + 1);

    if (!this.handlers_[type]) {
      this.handlers_[type] = [];
      this.eventTypes_[type] = true;
      for (var i = 0; i < this.roots_.length; i++) {
        this.roots_[i].addEventListener(type, this.listener_, false);
      }
    }

    this.handlers_[type].push({
      handler: handlers[handler],
      selector: selector,
      scope: scope,
      sync: !!opt_sync
    });
  }
};


/**
 * @param {Event} evt
 * @private
 */
thermo.EventDelegate.prototype.onEvent_ = function(evt) {
  var handlers = this.handlers_[evt.type];
  for (var i = 0; i < handlers.length; i++) {
    var h = handlers[i];

    // NOTE(ikilpatrick): this target could potentially be cached, (in an LRU)
    // for quick lookup skipping this for loop.
    var target = evt.target;
    if ((target['matches'] ||
        target.webkitMatchesSelector ||
        target.mozMatchesSelector ||
        target.msMatchesSelector).call(target, h.selector)) {
      var fn = goog.bind(h.handler, h.scope, evt);
      if (h.sync) {
        fn();
      } else {
        this.scheduler_.requestEvent(fn);
      }
    }
  }
};


/**
 * @typedef {{
 *   handler: function(!Event),
 *   selector: string,
 *   sync: boolean,
 *   scope: !Object
 * }}
 */
thermo.EventDelegate.Handler_;
