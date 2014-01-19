goog.provide('thermo.View_test');

goog.require('goog.testing.dom');
goog.require('goog.testing.jsunit');
goog.require('thermo.View');



/**
 * @param {!Object=} opt_data
 * @constructor */
View = function(opt_data) {
  /** @private {Object} */
  this.data_ = opt_data || null;

  goog.base(this);
};
goog.inherits(View, thermo.View);


/** @override */
View.prototype.createDom = function() {
  var span = document.createElement('span');
  span.textContent = this.data_ ? this.data_.text : '';
  return span;
};


parentEl = null;


function setUp() {
  parentEl = document.createElement('div');
  thermo.scheduler.setInTestDebugDebug(true);
  document.body.appendChild(parentEl);
}


function tearDown() {
  document.body.removeChild(parentEl);
}


function testRender() {
  var view = new View({text: 'foo'});
  assertFalse(view.isAttachedDebugDebug());

  view.render(parentEl);
  assertTrue(view.isAttachedDebugDebug());

  thermo.scheduler.runFrameDebugDebug();
  goog.testing.dom.assertHtmlContentsMatch('<span>foo</span>', parentEl);
}


function testRenderBefore() {
  var el = document.createElement('div');
  parentEl.appendChild(el);
  var view = new View({text: 'bar'});
  assertFalse(view.isAttachedDebugDebug());

  view.renderBefore(el);
  assertTrue(view.isAttachedDebugDebug());

  thermo.scheduler.runFrameDebugDebug();
  goog.testing.dom.assertHtmlContentsMatch(
      '<span>bar</span><div></div>', parentEl);
}


function testRemove() {
  var view = new View({text: 'foo'});
  assertFalse(view.isAttachedDebugDebug());

  view.render(parentEl);
  assertTrue(view.isAttachedDebugDebug());

  thermo.scheduler.runFrameDebugDebug();
  goog.testing.dom.assertHtmlContentsMatch('<span>foo</span>', parentEl);

  view.remove();
  thermo.scheduler.runFrameDebugDebug();
  goog.testing.dom.assertHtmlContentsMatch('', parentEl);
  assertFalse(view.isAttachedDebugDebug());
}


function testAppendChild_pre() {
  var view = new View({text: 'foo'});
  var child1 = new View({text: 'bar'});
  var child2 = new View({text: 'quix'});

  view.appendChild(child1);
  view.appendChild(child2);

  view.render(parentEl);
  thermo.scheduler.runFrameDebugDebug();
  goog.testing.dom.assertHtmlContentsMatch(
      '<span>foo<span>bar</span><span>quix</span></span>', parentEl);
}


function testAppendChild_post() {
  var view = new View({text: 'foo'});
  var child1 = new View({text: 'bar'});
  var child2 = new View({text: 'quix'});

  view.render(parentEl);

  view.appendChild(child1);
  view.appendChild(child2);

  thermo.scheduler.runFrameDebugDebug();
  goog.testing.dom.assertHtmlContentsMatch(
      '<span>foo<span>bar</span><span>quix</span></span>', parentEl);
}


function testAppendChild_post2() {
  var view = new View({text: 'foo'});
  var child1 = new View({text: 'bar'});
  var child2 = new View({text: 'quix'});

  view.render(parentEl);
  thermo.scheduler.runFrameDebugDebug();
  goog.testing.dom.assertHtmlContentsMatch('<span>foo</span>', parentEl);

  view.appendChild(child1);
  view.appendChild(child2);

  thermo.scheduler.runFrameDebugDebug();
  goog.testing.dom.assertHtmlContentsMatch(
      '<span>foo<span>bar</span><span>quix</span></span>', parentEl);
}


function testInsertChildBefore_pre() {
  var view = new View({text: 'foo'});

  var div = document.createElement('div');
  view.getElement().appendChild(div);

  var child1 = new View({text: 'bar'});
  var child2 = new View({text: 'quix'});

  view.insertChildBefore(child2, div);
  view.insertChildBefore(child1, div);

  assertFalse(child1.isAttachedDebugDebug());
  assertFalse(child2.isAttachedDebugDebug());

  view.render(parentEl);

  assertTrue(child1.isAttachedDebugDebug());
  assertTrue(child2.isAttachedDebugDebug());

  thermo.scheduler.runFrameDebugDebug();
  goog.testing.dom.assertHtmlContentsMatch(
      '<span>foo<span>quix</span><span>bar</span><div></div></span>', parentEl);
}


function testInsertChildBefore_post() {
  var view = new View({text: 'foo'});

  var div = document.createElement('div');
  view.getElement().appendChild(div);
  view.render(parentEl);

  var child1 = new View({text: 'bar'});
  var child2 = new View({text: 'quix'});

  view.insertChildBefore(child2, div);
  view.insertChildBefore(child1, div);

  assertTrue(child1.isAttachedDebugDebug());
  assertTrue(child2.isAttachedDebugDebug());

  thermo.scheduler.runFrameDebugDebug();
  goog.testing.dom.assertHtmlContentsMatch(
      '<span>foo<span>quix</span><span>bar</span><div></div></span>', parentEl);

  view.removeChild(child1);
  assertFalse(child1.isAttachedDebugDebug());

  thermo.scheduler.runFrameDebugDebug();
  goog.testing.dom.assertHtmlContentsMatch(
      '<span>foo<span>quix</span><div></div></span>', parentEl);
}
