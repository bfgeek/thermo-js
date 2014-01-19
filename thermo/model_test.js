goog.provide('thermo.Model_test');

goog.require('goog.testing.jsunit');
goog.require('goog.testing.recordFunction');
goog.require('thermo.Model');



/** @constructor */
Obj = function() {
  goog.base(this);

  /** @type {string} */
  this.foo = '';

  /** @type {number} */
  this.bar = 0;
};
goog.inherits(Obj, thermo.Model);


function testObserve() {
  var obj = new Obj();

  var f1 = goog.testing.recordFunction();
  var f2 = goog.testing.recordFunction();

  obj.foo = 'test';
  obj.observe('foo', f1);
  obj.foo = 'another';
  obj.observe('foo', f2);
  obj.foo = 'quix';

  var calls = f1.getCalls();
  assertEquals(2, calls.length);
  assertArrayEquals(['another', 'test'], calls[0].getArguments());
  assertArrayEquals(['quix', 'another'], calls[1].getArguments());

  var calls = f2.getCalls();
  assertEquals(1, calls.length);
  assertArrayEquals(['quix', 'another'], calls[0].getArguments());
}

function testObserve2() {
  var obj = new Obj();

  var f1 = goog.testing.recordFunction();
  var f2 = goog.testing.recordFunction();

  obj.foo = 'test';
  obj.observe('foo', f1);
  obj.foo = 'another';
  obj.observe('bar', f2);
  obj.foo = 'quix';
  obj.bar = 1;

  var calls = f1.getCalls();
  assertEquals(2, calls.length);
  assertArrayEquals(['another', 'test'], calls[0].getArguments());
  assertArrayEquals(['quix', 'another'], calls[1].getArguments());

  var calls = f2.getCalls();
  assertEquals(1, calls.length);
  assertArrayEquals([1, 0], calls[0].getArguments());
}
