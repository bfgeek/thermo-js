goog.provide('thermo.Scheduler');



/**
 * The job scheduler.
 * @constructor
 * @struct
 */
thermo.Scheduler = function() {
  /** @private {boolean} */
  this.inTest_ = false;

  /** @private {thermo.Scheduler.PhaseType_} */
  this.phase_ = thermo.Scheduler.PhaseType_.END;

  /** @private {?number} */
  this.frameRequestId_ = null;

  /** @private {!Array.<function()>} */
  this.eventJobs_ = [];

  /** @private {!Array.<function()>} */
  this.animationJobs_ = []; // TODO change type of this.

  /** @private {!Array.<function()>} */
  this.domReadJobs_ = [];

  /** @private {!Array.<function()>} */
  this.domWriteJobs_ = [];

  /** @private {!Array.<function()>} */
  this.nonUserJobs_ = [];
};


/**
 * The current phase of the main run loop, used to optionally schedule a frame
 * @enum {number}
 * @private
 */
thermo.Scheduler.PhaseType_ = {
  EVENT: 1,
  ANIMATION: 2,
  DOM_READ: 3,
  DOM_WRITE: 4,
  NON_USER: 5,
  END: 6
};


/**
 * Generic requestAnimationFrame.
 * @private {function(function(number)): number}
 */
thermo.Scheduler.raf_ =
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame;


/**
 * Requests an Event job be scheduled.
 * @param {function()} eventJob The event job.
 */
thermo.Scheduler.prototype.requestEvent = function(eventJob) {
  this.eventJobs_.push(eventJob);
  if (this.phase_ > thermo.Scheduler.PhaseType_.EVENT) {
    this.requestFrame_();
  }
};


/**
 * Requests an Animation job be scheduled.
 * @param {function()} animationJob The animation job.
 */
thermo.Scheduler.prototype.requestAnimation = function(animationJob) {
  this.animationJobs_.push(animationJob);
  if (this.phase_ > thermo.Scheduler.PhaseType_.ANIMATION) {
    this.requestFrame_();
  }
};


/**
 * Requests a DOM read job be scheduled.
 * @param {function()} domReadJob The DOM read job.
 */
thermo.Scheduler.prototype.requestDomRead = function(domReadJob) {
  this.domReadJobs_.push(domReadJob);
  if (this.phase_ > thermo.Scheduler.PhaseType_.DOM_READ) {
    this.requestFrame_();
  }
};


/**
 * Requests a DOM write job be scheduled.
 * @param {function()} domWriteJob The DOM write job.
 */
thermo.Scheduler.prototype.requestDomWrite = function(domWriteJob) {
  this.domWriteJobs_.push(domWriteJob);
  if (this.phase_ > thermo.Scheduler.PhaseType_.DOM_WRITE) {
    this.requestFrame_();
  }
};


/**
 * Requests a non-user job be scheduled.
 * @param {function()} nonUserJob The non-user job.
 */
thermo.Scheduler.prototype.requestNonUser = function(nonUserJob) {
  this.nonUserJobs_.push(nonUserJob);
  if (this.phase_ > thermo.Scheduler.PhaseType_.NON_USER) {
    this.requestFrame_();
  }
};


/**
 * Requests an animation frame.
 * @private
 */
thermo.Scheduler.prototype.requestFrame_ = function() {
  if (this.inTest_ || this.frameRequestId_ != null) return;

  var func = goog.bind(this.run_, this);
  this.frameRequestId_ = thermo.Scheduler.raf_.call(window, func);
};


/** @param {boolean} inTest If the scheduler is currently in a test. */
thermo.Scheduler.prototype.setInTestDebugDebug = function(inTest) {
  this.inTest_ = inTest;
};


/** Makes the scheduler run a 'frame' for testing. */
thermo.Scheduler.prototype.runFrameDebugDebug = function() {
  this.run_(+(new Date));
};


/**
 * @param {number} time The current time.
 * @private
 */
thermo.Scheduler.prototype.run_ = function(time) {
  // Run through events, clear at end, not long lived.
  var phaseType = thermo.Scheduler.PhaseType_;

  this.frameRequestId_ = null;

  this.phase_ = phaseType.EVENT;
  for (var i = 0; i < this.eventJobs_.length; i++) {
    this.eventJobs_[i]();
  }
  this.eventJobs_ = [];

  this.phase_ = phaseType.ANIMATION;
  for (var i = 0; i < this.animationJobs_.length; i++) {
    this.animationJobs_[i]();
  }
  this.animationJobs_ = [];

  this.phase_ = phaseType.DOM_READ;
  for (var i = 0; i < this.domReadJobs_.length; i++) {
    this.domReadJobs_[i]();
  }
  this.domReadJobs_ = [];

  this.phase_ = phaseType.DOM_WRITE;
  for (var i = 0; i < this.domWriteJobs_.length; i++) {
    this.domWriteJobs_[i]();
  }
  this.domWriteJobs_ = [];

  this.phase_ = phaseType.END;
};
