goog.provide('thermo');


goog.require('goog.asserts');
goog.require('thermo.EventDelegate');
goog.require('thermo.Scheduler');
goog.require('thermo.array');


/**
 * @type {!thermo.Scheduler}
 * @export
 */
thermo.scheduler = new thermo.Scheduler();


/**
 * @type {!thermo.EventDelegate}
 * @export
 */
thermo.events = new thermo.EventDelegate(thermo.scheduler);


/**
 * @param {!Array.<T>} arr
 * @param {function(!Array.<{removed: !Array.<T>, index: number, addedCount: number}>)} func
 * @param {string} id
 * @template T
 * @export
 */
thermo.observeArray = function(arr, func, id) {
  var closure = thermo.createObserveArrayClosure_(arr, func);
  thermo.scheduler.addCheckJob(closure, id);
};


/**
 * @param {string} id
 * @export
 */
thermo.unobserveArrayById = function(id) {
  thermo.scheduler.removeCheckJob(id);
};


/**
 * Creates a function closure to poll for changes on an array. Clones the array
 * and then upon invoking the closure, checks for any changes and invokes the
 * callback.
 * @param {!Array.<T>} arr
 * @param {function(!Array.<{removed: !Array.<T>, index: number, addedCount: number}>)} func
 * @template T
 * @return {function()} The closure.
 * @private
 */
thermo.createObserveArrayClosure_ = function(arr, func) {
  var oldArray = arr.slice(0);
  return function() {
    var splices = thermo.array.computeSplices(oldArray, arr);
    if (splices.length == 0) return; // Short circuit.
    func(splices);
    oldArray = arr.slice(0);
  };
};


/** @private {!Object.<function(new:thermo.View, (!Object|undefined))>} */
thermo.viewCtors_ = {};


/**
 * Gets a view constructor by id.
 * @param {string} id The id of the view.
 * @return {function(new:thermo.View, (!Object|undefined))}
 */
thermo.getViewCtor = function(id) {
  return goog.asserts.assert(thermo.viewCtors_[id]);
};


/**
 * Registers a view to use within templates.
 * @param {string} id The id of the view.
 * @param {function(new:thermo.View)|function(new:thermo.View, !Object)} ctor
 *     The view constructor.
 * @export
 */
thermo.view = function(id, ctor) {
  thermo.viewCtors_[id] = ctor;
};
