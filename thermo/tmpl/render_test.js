goog.provide('thermo.tmpl.render_test');

goog.require('goog.array');
goog.require('goog.object');
goog.require('goog.testing.dom');
goog.require('goog.testing.jsunit');
goog.require('thermo');
goog.require('thermo.Model');
goog.require('thermo.View');
goog.require('thermo.tmpl.render');



/**
 * @param {!Object} obj
 * @constructor
 * @extends {thermo.Model}
 */
Obj = function(obj) {
  goog.base(this);

  for (var key in obj) {
    var val = obj[key];
    if (!goog.isArray(val) && goog.isObject(val)) {
      val = new Obj(obj[key]);
    }
    this[key] = val;
  }
};
goog.inherits(Obj, thermo.Model);



/**
 * @param {!Object} obj
 * @constructor
 * @extends {thermo.View}
 */
View = function(obj) {
  goog.base(this, obj, '<span>{$data.num} - {$data.str}</span>');
};
goog.inherits(View, thermo.View);
thermo.view('foo.View', View);



/**
 * @param {!Object} obj
 * @param {string} tmpl
 * @constructor
 * @extends {thermo.View}
 */
RootView = function(obj, tmpl) {
  goog.base(this, obj, tmpl);
};
goog.inherits(RootView, thermo.View);


function setUp() {
  thermo.scheduler.setInTestDebugDebug(true);
}


function testElementBasic() {
  var html = '<div><span></span></div>';
  var node = thermo.tmpl.render.run(html);
  node.observe();
  goog.testing.dom.assertHtmlMatches(html, node.getFirstNode().outerHTML);
}

function testElementBasic2() {
  var html = [
    '<div>',
    '  <span>',
    '    <div></div>',
    '    <div></div>',
    '    <div></div>',
    '  </span>',
    '  <span></span>',
    '  <div></div>',
    '</div>'].join('');
  var node = thermo.tmpl.render.run(html);
  node.observe();
  goog.testing.dom.assertHtmlMatches(html, node.getFirstNode().outerHTML);
}

function testTextBasic() {
  var html = '<div>Text</div>';
  var node = thermo.tmpl.render.run(html);
  node.observe();
  goog.testing.dom.assertHtmlMatches(html, node.getFirstNode().outerHTML);
}

function testTextWithPrint() {
  var tmpl = '<div>Hi {$data.name}</div>';
  var html = '<div>Hi there!</div>';
  var node = thermo.tmpl.render.run(tmpl, {name: 'there!'});
  node.observe();
  goog.testing.dom.assertHtmlMatches(html, node.getFirstNode().outerHTML);
}

function testTextWithPrint2() {
  var tmpl = [
    '<div>',
    '  Hi {$data.name} <span>Foo {$data.obj.bar} quix.</span>',
    '  <span>{$data.obj.foo}</span>',
    '</div>'].join('');
  var html = '<div>Hi you!<span>Foo bar quix.</span><span>foo</span></div>';
  var node = thermo.tmpl.render.run(
      tmpl, {name: 'you!', obj: {bar: 'bar', foo: 'foo'}});
  node.observe();
  goog.testing.dom.assertHtmlMatches(html, node.getFirstNode().outerHTML);
}

function testIfStmt() {
  run([
    '<div>',
    '  {if $data.foo}',
    '    <span>FOO!</span>',
    '  {elseif $data.bar}',
    '    <div>BAR!</div>',
    '  {/if}',
    '</div>'
  ].join(''),
  [{foo: true, bar: false}, '<div><span>FOO!</span></div>'],
  [{foo: false, bar: true}, '<div><div>BAR!</div></div>'],
  [{foo: false, bar: false}, '<div></div>']
  );
}

function testIfStmt2() {
  run([
    '<div>',
    '  {if $data.foo}',
    '    {if $data.bar}',
    '      <div>HERE</div>',
    '      <div>HERE2</div>',
    '    {elseif $data.quix}',
    '      <span>OR HERE</span>',
    '    {else}',
    '      <span>NAH</span>',
    '    {/if}',
    '    <div>SIBLING</div>',
    '    <div>SIBLING2</div>',
    '  {/if}',
    '  TEXT SIBLING',
    '</div>'
  ].join(''),
  [{foo: false, bar: false, quix: false}, '<div>TEXT SIBLING</div>'],
  [{foo: true, bar: false, quix: false}, [
    '<div>',
    '  <span>NAH</span>',
    '  <div>SIBLING</div>',
    '  <div>SIBLING2</div>',
    'TEXT SIBLING',
    '</div>'].join('')],
  [{foo: true, bar: true, quix: false}, [
    '<div>',
    '  <div>HERE</div>',
    '  <div>HERE2</div>',
    '  <div>SIBLING</div>',
    '  <div>SIBLING2</div>',
    'TEXT SIBLING',
    '</div>'].join('')],
  [{foo: true, bar: false, quix: true}, [
    '<div>',
    '  <span>OR HERE</span>',
    '  <div>SIBLING</div>',
    '  <div>SIBLING2</div>',
    'TEXT SIBLING',
    '</div>'].join('')]);
}

function testPrintAttribute() {
  run(
      '<div class="{$data.foo}"></div>',
      [{foo: 'enabled'}, '<div class="enabled"></div>'],
      [{foo: 'disabled'}, '<div class="disabled"></div>']);
}

function testPrintAttribute2() {
  run(
      '<div class="{$data.foo} {$data.bar}"></div>',
      [{foo: 'enabled', bar: 'foo'}, '<div class="enabled foo"></div>'],
      [{foo: 'enabled', bar: 'bar'}, '<div class="enabled bar"></div>'],
      [{foo: 'disabled', bar: 'quix'}, '<div class="disabled quix"></div>']);
}

function testAttributeConditional() {
  run(
      [
       '<div class="{if $data.foo}enabled{/if}">',
       '  <span data-foo="{if $data.bar}{$data.quix}{/if}"></span>',
       '</div>'].join(''),
      [{foo: true, bar: false, quix: 'enabled'},
       '<div class="enabled"><span data-foo></span></div>'],
      [{foo: true, bar: true, quix: 'disabled'},
       '<div class="enabled"><span data-foo="disabled"></span></div>'],
      [{foo: false, bar: false, quix: 'enabled'},
       '<div class><span data-foo></span></div>']);
}

function testAttributeConditional2() {
  run(
      '<div class="{if $data.foo}{if $data.bar}{$data.quix}{/if}{/if}"></div>',
      [{foo: true, bar: false, quix: 'test'}, '<div class=""></div>'],
      [{foo: true, bar: true, quix: 'now'}, '<div class="now"></div>'],
      [{foo: false, bar: true, quix: 'blah'}, '<div class=""></div>']);
}

function testConditionalAttribute() {
  run(
      '<div {if $data.foo}hidden{/if}></div>',
      [{foo: true}, '<div hidden></div>'],
      [{foo: false}, '<div></div>']);
}

function testConditionalAttribute2() {
  run(
      '<div {if $data.foo}class="{$data.quix}"{/if}></div>',
      [{foo: true, quix: 'enabled'}, '<div class="enabled"></div>'],
      [{foo: true, quix: 'enabled2'}, '<div class="enabled2"></div>'],
      [{foo: false, quix: 'disabled'}, '<div></div>'],
      [{foo: false, quix: 'disabled2'}, '<div></div>']);
}

function testConditionalAttribute3() {
  run(
      '<div {if $data.foo}class="{$data.quix}" hidden{/if}></div>',
      [{foo: true, quix: 'enabled'}, '<div class="enabled" hidden></div>'],
      [{foo: true, quix: 'enabled2'}, '<div class="enabled2" hidden></div>'],
      [{foo: false, quix: 'disabled'}, '<div></div>'],
      [{foo: false, quix: 'disabled2'}, '<div></div>']);
}

function testForeach() {
  run([
    '<div>',
    '  {foreach $foo in $data.foo}',
    '    {if $foo.blah > 3}',
    '      <div>{$foo.blah}</div>',
    '      <div>HERE</div>',
    '    {/if}',
    '  {ifempty}',
    '    <span>Nothing to hide.</span>',
    '  {/foreach}',
    '</div>'
  ].join(''),
  [{foo: [{blah: 2}, {blah: 5}, {blah: 4}]},
    '<div><div>5</div><div>HERE</div><div>4</div><div>HERE</div></div>'],
  [{foo: [{blah: 2}]}, '<div></div>'],
  [{foo: []}, '<div><span>Nothing to hide.</span></div>']);
}

function testView() {
  run([
    '<div>',
    '  {view foo.View $data.blah}',
    '</div>'
  ].join(''),
  [{blah: {num: 42, str: 'hi'}}, '<div><span>42 - hi</span></div>'],
  [{blah: {num: 2, str: 'boo'}}, '<div><span>2 - boo</span></div>'],
  [{blah: {num: 5, str: 'yow'}}, '<div><span>5 - yow</span></div>']);
}

function testView2() {
  run([
    '<div>',
    '  {if $data.enable}',
    '    {view foo.View $data.blah}',
    '  {/if}',
    '</div>'
  ].join(''),
  [{enable: true, blah: {num: 42, str: 'hi'}},
   '<div><span>42 - hi</span></div>'],
  [{enable: false, blah: {num: 2, str: 'foo'}}, '<div></div>'],
  [{enable: true, blah: {num: 1, str: 'one'}},
   '<div><span>1 - one</span></div>']);
}

function testView3() {
  run([
    '<div>',
    '  {foreach $foo in $data.foo}',
    '    {view foo.View $foo}',
    '  {/foreach}',
    '</div>'
  ].join(''),
  [{foo: [{num: 1, str: 'one'}, {num: 2, str: 'two'}]},
   '<div><span>1 - one</span><span>2 - two</span></div>'],
  [{foo: [{num: 1, str: 'one'}, {num: 6, str: 'six'}, {num: 4, str: 'f'}]},
   '<div><span>1 - one</span><span>6 - six</span><span>4 - f</span></div>'],
  [{foo: []}, '<div></div>']);
}


/**
 * Runs the actual test. Given a template string (1st arg) and a list of state,
 * result pairs performs various operations including.
 *   - Performing a 1-shot render of the template.
 *   - Runs over all permutations of the states with one template making sure
 *       the reactive binding works.
 */
function run() {
  var args = Array.prototype.slice.call(arguments);
  var tmpl = args.shift();
  var states = args;

  // Initially run through all of the potential states with being non-reactive.
  for (var i = 0; i < states.length; i++) {
    var state = states[i];
    var view = new RootView(state[0], tmpl);
    view.render(document.body);
    thermo.scheduler.runFrameDebugDebug();
    goog.testing.dom.assertHtmlMatches(state[1], view.getElement().outerHTML);
    view.remove();
    thermo.scheduler.runFrameDebugDebug();
  }

  // Create all the different states.
  var permutations = permute(states);
  for (var i = 0; i < permutations.length; i++) {
    // Make the initial state observable.
    var initialState = permutations[i][0];
    var obj = new Obj(initialState[0]);

    // Create the templated node & assert the initial state.
    var view = new RootView(obj, tmpl);
    view.render(document.body);
    assertNotEquals(0, thermo.Model.observerCount);
    thermo.scheduler.runFrameDebugDebug();
    assertHtmlMatches(initialState[1], view.getElement().outerHTML);
    for (var j = 1; j < permutations[i].length; j++) {
      var state = permutations[i][j];
      var keys = goog.object.getKeys(state[0]);
      goog.array.shuffle(keys);

      for (var k = 0; k < keys.length; k++) {
        var key = keys[k];
        obj[key] = state[0][key];
      }

      // Kick the scheduler.
      thermo.scheduler.runFrameDebugDebug();
      assertHtmlMatches(state[1], view.getElement().outerHTML);
    }

    // unobserve and make sure we unobserved everything.
    view.remove();
    thermo.scheduler.runFrameDebugDebug();
    assertEquals(0, thermo.Model.observerCount);
  }

  // Loop over the states and perform and unobserve/observe between each update.
  for (var i = 0; i < permutations.length; i++) {
    // Make the initial state observable.
    var initialState = permutations[i][0];
    var obj = new Obj(initialState[0]);

    // Create the templated node & assert the initial state.
    var view = new RootView(obj, tmpl);
    view.render(document.body);
    thermo.scheduler.runFrameDebugDebug();
    assertHtmlMatches(initialState[1], view.getElement().outerHTML);

    // Unobserve.
    view.remove();
    thermo.scheduler.runFrameDebugDebug();

    // Go through other states.
    for (var j = 1; j < permutations[i].length; j++) {
      var state = permutations[i][j];
      var keys = goog.object.getKeys(state[0]);

      for (var k = 0; k < keys.length; k++) {
        var key = keys[k];
        obj[key] = state[0][key];
      }

      // observe so the node catches up & check state.
      view.render(document.body);
      thermo.scheduler.runFrameDebugDebug();
      assertNotEquals(0, thermo.Model.observerCount);
      assertHtmlMatches(state[1], view.getElement().outerHTML);

      // unobserve and make sure we unobserved everything.
      view.remove();
      thermo.scheduler.runFrameDebugDebug();
      assertEquals(0, thermo.Model.observerCount);
    }
  }
}


/**
 * Permutes a given array.
 * @param {!Array.<T>} arr The array to permute.
 * @param {!Array.<!Array.<T>>=} opt_resultArr The optional array to place the
 *     result in.
 * @param {!Array.<T>=} opt_used The used items.
 * @return {!Array.<!Array.<T>>} The result.
 * @template T
 */
function permute(arr, opt_resultArr, opt_used) {
  var resultArr = opt_resultArr || [];
  var used = opt_used || [];

  for (var i = 0; i < arr.length; i++) {
    var item = arr.splice(i, 1)[0];
    used.push(item);
    if (arr.length == 0) resultArr.push(used.slice());
    permute(arr, resultArr, used);
    arr.splice(i, 0, item);
    used.pop();
  }
  return resultArr;
}


function assertHtmlMatches(htmlPattern, actual) {
  var div = document.createElement('div');
  div.innerHTML = actual;

  goog.testing.dom.assertHtmlContentsMatch(htmlPattern, div, true);
}
