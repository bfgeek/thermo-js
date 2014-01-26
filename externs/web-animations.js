/**
 * @fileoverview foo
 * @externs
 */

/** @constructor */
function Timeline() {};


/** @type {number} */
Timeline.prototype.currentTime;


/** @param {TimedItem} source */
Timeline.prototype.play = function(source) {};


/** @return {!Array.<!Player>} */ // TODO sequence return type?
Timeline.prototype.getCurrentPlayers = function() {};


/**
 * @param {number|!Event} otherTimeOrEvent
 * @param {!Timeline=} opt_other
 * @return {?number}
 */
Timeline.prototype.toTimelineTime = function(otherTimeOrEvent, opt_other) {};


/** @constructor */
function Player() {};


/** @type {TimedItem} */
Player.prototype.source;


/** @type {!Timeline} */
Player.prototype.timeline;


/** @type {number} */
Player.prototype.startTime;


/** @type {number} */
Player.prototype.currentTime;


/** @type {number} */
Player.prototype.playbackRate;


/** @type {boolean} */
Player.prototype.paused;


/**
 * @constructor
 * @implements {EventTarget}
 */
function TimedItem() {};


/** @type {number} */
TimedItem.prototype.localTime;


/** @type {number} */
TimedItem.prototype.currentIteration;


/** @type {!Timing} */
TimedItem.prototype.specified;


/** @type {number} */
TimedItem.prototype.startTime;


/** @type {number} */
TimedItem.prototype.iterationDuration;


/** @type {number} */
TimedItem.prototype.activeDuration;


/** @type {number} */
TimedItem.prototype.endTime;


/** @type {TimingGroup} */
TimedItem.prototype.parent;


/** @type {TimedItem} */
TimedItem.prototype.previousSibling;


/** @type {TimedItem} */
TimedItem.prototype.nextSibling;


/** @param {...!TimedItem} items */
TimedItem.prototype.before = function(items) {};


/** @param {...!TimedItem} items */
TimedItem.prototype.after = function(items) {};


/** @param {...!TimedItem} items */
TimedItem.prototype.replace = function(items) {};


TimedItem.prototype.remove = function() {};


/** @type {Player} */
TimedItem.prototype.player;


/** @type {?function(TimingEvent)} */
TimedItem.prototype.onstart;


/** @type {?function(TimingEvent)} */
TimedItem.prototype.oniteration;


/** @type {?function(TimingEvent)} */
TimedItem.prototype.onend;


/** @type {?function(TimingEvent)} */
TimedItem.prototype.oncancel;


/** @override */
TimedItem.prototype.addEventListener =
    function(type, listener, opt_useCapture) {};


/** @override */
TimedItem.prototype.removeEventListener =
    function(type, listener, opt_useCapture) {};


/** @override */
TimedItem.prototype.dispatchEvent = function(evt) {};


/** @constructor */
function Timing() {};


/** @type {number} */
Timing.prototype.startDelay;


/** @type {FillMode} */
Timing.prototype.fillMode;


/** @type {number} */
Timing.prototype.iterationStart;


/** @type {number} */
Timing.prototype.iterationCount;


/** @type {number|string} */
Timing.prototype.iterationDuration;


/** @type {number|string} */
Timing.prototype.activeDuration;


/** @type {number} */
Timing.prototype.playbackRate;


/** @type {PlaybackDirection} */
Timing.prototype.direction;


/** @type {string} */
Timing.prototype.timingFunction;


/**
 * @typedef {{
 *   startDelay: (number|undefined),
 *   fillMode: (FillMode|undefined),
 *   iterationStart: (number|undefined),
 *   iterationCount: (number|undefined),
 *   iterationDuration: (number|string|undefined),
 *   activeDuration: (number|string|undefined),
 *   playbackRate: (number|undefined),
 *   direction: (PlaybackDirection|undefined),
 *   timingFunction: (string|undefined)
 * }}
 */
var TimingInput;


/** @typedef {string} */
var FillMode;


/** @typedef {string} */
var PlaybackDirection;


/**
 * @constructor
 * @extends {TimedItem}
 */
function TimingGroup() {};


/** @type {TimedItemList} */
TimingGroup.prototype.children;


/** @type {TimedItem} */
TimingGroup.prototype.firstChild;


/** @type {TimedItem} */
TimingGroup.prototype.lastChild;


/** @param {...!TimedItem} items */
TimingGroup.prototype.prepend;


/** @param {...!TimedItem} items */
TimingGroup.prototype.append;


/** @constructor */
function TimedItemList() {};


/** @type {number} */
TimedItemList.prototype.length;


/**
 * @param {Array.<!TimedItem>} children
 * @param {(?number|TimingInput)=} opt_timing
 * @constructor
 * @extends {TimingGroup}
 */
function ParGroup(children, opt_timing) {};


/** @return {!ParGroup} */
ParGroup.prototype.clone = function() {};


/**
 * @param {Array.<!TimedItem>} children
 * @param {(?number|TimingInput)=} opt_timing
 * @constructor
 * @extends {TimingGroup}
 */
function SeqGroup(children, opt_timing) {};


/** @return {!SeqGroup} */
SeqGroup.prototype.clone = function() {};


/**
 * @param {?AnimationTarget} element
 * @param {?AnimationEffect|?OneOrMoreKeyframes} effect
 * @param {(?number|TimingInput)=} opt_timing
 * @constructor
 * @extends {TimedItem}
 */
function Animation(element, effect, opt_timing) {};


/** @type {?AnimationEffect} */
Animation.prototype.effect;


/** @type {?AnimationTarget} */
Animation.prototype.target;


/** @return {!Animation} */
Animation.prototype.clone;


/**
 * @param {!Element} element
 * @param {string} pseudoElement
 * @constructor
 */
function PseudoElementReference(element, pseudoElement) {};


/** @type {!Element} */
PseudoElementReference.prototype.element;


/** @type {string} */
PseudoElementReference.prototype.pseudoElement;


/** @typedef {!Element|!PseudoElementReference} */
var AnimationTarget;


/** @constructor */
function AnimationEffect() {};


/** @type {AccumulateOperation} */
AnimationEffect.prototype.accumulate;


/** @return {!AnimationEffect} */
AnimationTarget.prototype.clone;


/** @typedef {string} */
var AccumulateOperation;


/** @typedef {string} */
var CompositeOperation;


/**
 * @param {!OneOrMoreKeyframes} frame
 * @param {CompositeOperation=} opt_composite
 * @param {AccumulateOperation=} opt_accumulate
 * @constructor
 * @extends {AnimationEffect}
 */
function KeyframeAnimationEffect(frame, opt_composite, opt_accumulate) {};


/**
 * @typedef {{
 *   offset: (number|undefined),
 *   composite: (CompositeOperation|undefined)
 * }}
 */
var Keyframe;


/** @typedef {!Keyframe|!Array.<!Keyframe>} */
var OneOrMoreKeyframes;


/**
 * @param {string} type
 * @param {!TimingEventInit=} opt_eventInit
 * @constructor
 * @extends {Event}
 */
function TimingEvent(type, opt_eventInit) {};


/** @type {?number} */
TimingEvent.prototype.localTime;


/** @type {?number} */
TimingEvent.prototype.timelineTime;


/** @type {?number} */
TimingEvent.prototype.iterationIndex;


/** @type {?boolean} */
TimingEvent.prototype.seeked;


/**
 * @typedef {{
 *   localTime: (number|undefined),
 *   timelineTime: (number|undefined),
 *   iterationIndex: (number|undefined),
 *   seeked: (boolean|undefined)
 * }}
 */
var TimingEventInit;


/** @type {!Timeline} */
Document.prototype.timeline;


/**
 * @param {?AnimationEffect|?OneOrMoreKeyframes} effect
 * @param {(?number|TimingInput)=} opt_timing
 * @return {!Animation}
 */
Element.prototype.animate = function(effect, opt_timing) {};


/** @return {!Array.<!Animation>} */
Element.prototype.getCurrentAnimations = function() {};


/** @return {!Array.<!Player>} */
Element.prototype.getCurrentPlayers = function() {};
