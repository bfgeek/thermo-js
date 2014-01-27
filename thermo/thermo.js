goog.provide('thermo');

goog.require('thermo.EventDelegate');
goog.require('thermo.Scheduler');


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


/** @private {!Object.<!Object>} */
thermo.observersById_ = {};


/**
 * @param {!Array} arr
 * @param {function(!Array.<!Object>)} func
 * @param {string} id
 * @export
 */
thermo.observeArray = function(arr, func, id) {
  var observer = new window['ArrayObserver'](arr, func);
  thermo.observersById_[id] = observer;

  /*thermo.scheduler.requestMicroCheckpoint(function() {
    observer.deliver();
  });*/
};


/**
 * @param {string} id
 * @export
 */
thermo.unobserveArrayById = function(id) {
  thermo.observersById_[id].disconnect();
  delete thermo.observersById_[id];
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
