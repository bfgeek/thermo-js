goog.provide('thermo.Scheduler');

goog.require('goog.events');



/**
 * The job scheduler.
 * @constructor
 * @struct
 * @export
 */
thermo.Scheduler = function() {
  /** @private {boolean} */
  this.inTest_ = false;

  /** @private {boolean} */
  this.blockDomJobs_ = true;

  /** @private {thermo.Scheduler.PhaseType_} */
  this.phase_ = thermo.Scheduler.PhaseType_.END;

  /** @private {?number} */
  this.frameRequestId_ = null;

  /** @private {!Array.<function()>} */
  this.eventJobs_ = [];

  /** @private {!Array.<function(): boolean>} */
  this.animationJobs_ = [];

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
 * @param {boolean} blockDomJobs Blocks everything after animation jobs to
 *     ensure smooth animations.
 * @export
 */
thermo.Scheduler.prototype.setBlockDomJobs = function(blockDomJobs) {
  this.blockDomJobs_ = blockDomJobs;
};


/**
 * Requests an Event job be scheduled.
 * @param {function()} eventJob The event job.
 * @export
 */
thermo.Scheduler.prototype.requestEvent = function(eventJob) {
  this.eventJobs_.push(eventJob);
  if (this.phase_ > thermo.Scheduler.PhaseType_.EVENT) {
    this.requestFrame_();
  }
};


/**
 * Requests an Animation job be scheduled.
 * @param {!TimedItem|!Player|function(): boolean} animJob The animation job.
 * @export
 */
thermo.Scheduler.prototype.requestAnimation = function(animJob) {
  if (animJob instanceof TimedItem) {
    // Wrap animation job within closure form.
    this.animationJobs_.push(thermo.Scheduler.wrapAnimation_(animJob));
  } else if (animJob instanceof Player) {
    if (!animJob.source) return; // TODO understand why this is.
    this.animationJobs_.push(thermo.Scheduler.wrapAnimation_(animJob.source));
  } else {
    this.animationJobs_.push(animJob);
  }
  if (this.phase_ > thermo.Scheduler.PhaseType_.ANIMATION) {
    this.requestFrame_();
  }
};


/**
 * Wraps the JS TimedItem within a closure.
 * @param {!TimedItem} timedItem
 * @return {function(): boolean}
 * @private
 */
thermo.Scheduler.wrapAnimation_ = function(timedItem) {
  var finished = false;

  goog.events.listen(timedItem, ['cancel', 'end'], function() {
    finished = true;
  });

  return function() {
    return finished;
  };
};


/**
 * Requests a DOM read job be scheduled.
 * @param {function()} domReadJob The DOM read job.
 * @export
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
 * @export
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
 * @export
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
  var idx = this.animationJobs_.length;
  while (idx--) {
    if (this.animationJobs_[i]()) {
      this.animationJobs_.splice(i, 1);
    }
  }

  // Check if we've got an early opt-out enabled for
  if (this.animationJobs_.length && this.blockDomJobs_) {
    this.phase_ = phaseType.END;
    return;
  }

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

  // Check that we've got no other jobs queued.
  this.phase_ = phaseType.NON_USER;
  if (!this.eventJobs_.length && !this.animationJobs_.length &&
      !this.domReadJobs_.length && !this.domWriteJobs_.length) {
    for (var i = 0; i < this.nonUserJobs_.length; i++) {
      this.nonUserJobs_[i]();
    }
    this.nonUserJobs_ = [];
  }

  this.phase_ = phaseType.END;
};
