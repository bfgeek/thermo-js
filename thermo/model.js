goog.provide('thermo.Model');



/**
 * @constructor
 * @export
 */
thermo.Model = function() {
  /** @private {!Object.<!Array.<function(*,*)>>} */
  this.observers_ = {};

  /** @private {!Object.<!Object.<function(*,*)>>} */
  this.observersById_ = {};
};


if (goog.DEBUG) {
  /** @type {number} */
  thermo.Model.observerCount = 0;
}


/**
 * Observes a property on the model.
 * @param {string} key The key of the property to observe.
 * @param {function(T, T)|function(T)} func The function to invoke when the
 *     value changes.
 * @param {!Object=} opt_scope The optional scope to invoke the function in.
 * @param {string=} opt_id The id to use to unobserve with.
 * @template T
 * @export
 */
thermo.Model.prototype.observe = function(key, func, opt_scope, opt_id) {
  if (!this.observers_[key]) {
    this.observers_[key] = [];
    this.observersById_[key] = {};

    this.defineProp_(key);
  }

  var f = func.bind(opt_scope || null);
  this.observers_[key].push(f);

  if (opt_id) {
    this.observersById_[key][opt_id] = f;
  }

  if (goog.DEBUG) {
    thermo.Model.observerCount++;
  }
};


/**
 * Unobserves a property on the model by id.
 * @param {string} key
 * @param {string} id
 * @export
 */
thermo.Model.prototype.unobserveById = function(key, id) {
  var observer = this.observersById_[key][id];
  if (!observer) return;

  var idx = this.observers_[key].indexOf(observer);
  goog.asserts.assert(idx != -1);
  this.observers_[key].splice(idx, 1); // Remove from observers array.

  if (goog.DEBUG) {
    thermo.Model.observerCount--;
  }
};


/**
 * If Object.observe isn't implemented, provide an observable property by
 * re-defining the property on the object.
 * @param {string} key The property to re-define.
 * @private
 */
thermo.Model.prototype.defineProp_ = function(key) {
  var shadow = this[key];
  var observers = this.observers_[key];

  Object.defineProperty(this, key, {
    set: function(value) {
      var oldValue = shadow;
      shadow = value;

      for (var i = 0; i < observers.length; i++) {
        observers[i](shadow, oldValue);
      }
    },
    get: function() {
      return shadow;
    }
  });
};
