goog.provide('thermo');

goog.require('thermo.EventDelegate');
goog.require('thermo.Scheduler');


/** @type {!thermo.Scheduler} */
thermo.scheduler = new thermo.Scheduler();


/** @type {!thermo.EventDelegate} */
thermo.events = new thermo.EventDelegate(thermo.scheduler);


thermo.observersById_ = {};

thermo.observeArray = function(arr, func, id) {
  var observer = new window['ArrayObserver'](arr, func);
  thermo.observersById_[id] = observer;

  /*thermo.scheduler.requestMicroCheckpoint(function() {
    observer.deliver();
  });*/
};


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
 */
thermo.view = function(id, ctor) {
  thermo.viewCtors_[id] = ctor;
};
