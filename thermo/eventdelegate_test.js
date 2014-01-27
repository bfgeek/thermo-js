goog.provide('thermo.EventDelegate_test');

goog.require('goog.testing.jsunit');
goog.require('goog.testing.recordFunction');
goog.require('thermo');
goog.require('thermo.EventDelegate');

f1 = null;
f2 = null;
f3 = null;
el1 = null;
el2 = null;
delegate = null;


function setUp() {
  f1 = goog.testing.recordFunction();
  f2 = goog.testing.recordFunction();
  f3 = goog.testing.recordFunction();

  // Create testing divs.
  el1 = document.createElement('div');
  el1.className = 'foo bar';
  document.body.appendChild(el1);

  el2 = document.createElement('div');
  el2.className = 'quix';
  document.body.appendChild(el2);

  // Setup event delegate.
  delegate = new thermo.EventDelegate(thermo.scheduler);
}


function tearDown() {
  document.body.removeChild(el1);
  document.body.removeChild(el2);
}


/** Tests basic events with a root added after handlers are registered. */
function testEvent_post() {
  delegate.registerHandlers({
    'mousedown .foo': f1,
    'mousemove .quix': f2
  }, {});

  delegate.addRoot(document.body);

  el1.dispatchEvent(createMouseEvent('mousedown'));
  el2.dispatchEvent(createMouseEvent('mousedown'));

  thermo.scheduler.runFrameDebugDebug();
  assertEvents(f1, ['mousedown']);
  assertEvents(f2, []);
}


/** Tests basic events with a rood added before handlers are registered. */
function testEvent_pre() {
  delegate.addRoot(document.body);

  delegate.registerHandlers({
    'mousedown .foo': f1,
    'mousemove .quix': f2
  }, {});

  el1.dispatchEvent(createMouseEvent('mousedown'));
  el2.dispatchEvent(createMouseEvent('mousedown'));

  thermo.scheduler.runFrameDebugDebug();
  assertEvents(f1, ['mousedown']);
  assertEvents(f2, []);
}


/** Tests removing a root. */
function testRemoveRoot() {
  delegate.addRoot(document.body);

  delegate.registerHandlers({
    'mousedown .foo': f1,
    'mousemove .quix': f2
  }, {});

  delegate.removeRoot(document.body);

  el1.dispatchEvent(createMouseEvent('mousedown'));
  el2.dispatchEvent(createMouseEvent('mousemove'));

  thermo.scheduler.runFrameDebugDebug();
  assertEvents(f1, []);
  assertEvents(f2, []);
}


/** Tests moar. */
function testComplex() {
  delegate.addRoot(document.body);

  delegate.registerHandlers({
    'mousedown .foo': f1,
    'mousemove .quix': f2
  }, {});

  el1.dispatchEvent(createMouseEvent('mousedown'));
  el2.dispatchEvent(createMouseEvent('mousemove'));

  thermo.scheduler.runFrameDebugDebug();
  assertEvents(f1, ['mousedown']);
  assertEvents(f2, ['mousemove']);

  delegate.registerHandlers({
    'mousemove .bar': f3
  }, {});

  el1.dispatchEvent(createMouseEvent('mousedown'));
  el1.dispatchEvent(createMouseEvent('mousemove'));
  el1.dispatchEvent(createMouseEvent('mousemove'));
  el2.dispatchEvent(createMouseEvent('mousemove'));
  el2.dispatchEvent(createMouseEvent('mousemove'));

  thermo.scheduler.runFrameDebugDebug();
  assertEvents(f1, ['mousedown']);
  assertEvents(f2, ['mousemove', 'mousemove']);
  assertEvents(f3, ['mousemove', 'mousemove']);
}


/** Tests a syncronous handler. */
function testSync() {
  delegate.addRoot(document.body);

  delegate.registerHandlers({
    'mousedown .foo': f1
  }, {}, true);

  el1.dispatchEvent(createMouseEvent('mousedown'));
  assertEvents(f1, ['mousedown']);
}


function assertEvents(rf, types) {
  var calls = rf.getCalls();
  assertEquals(types.length, calls.length);
  for (var i = 0; i < types.length; i++) {
    assertEquals(types[i], calls[i].getArguments()[0].type);
  }
  rf.reset();
}


function createMouseEvent(type) {
  var evt = document.createEvent('MouseEvent');
  evt.initMouseEvent(type, true, true, window, 0, 0, 0, 0, 0,
      false, false, false, false, 0, null);
  return evt;
}
