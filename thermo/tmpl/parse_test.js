goog.provide('thermo.tmpl.parse_test');

goog.require('goog.functions');
goog.require('goog.testing.jsunit');
goog.require('thermo.tmpl.parse');

var parse = thermo.tmpl.parse;


function testTag() {
  var expected = new parse.ElementNode('div');

  var result = thermo.tmpl.parse.run('<div></div>');
  assertTreeEquals(expected, result);

  result = thermo.tmpl.parse.run('  <div> </div>');
  assertTreeEquals(expected, result);

  result = thermo.tmpl.parse.run('<div>   </div>');
  assertTreeEquals(expected, result);
}

function testVoidTag() {
  var expected = new parse.ElementNode('img');

  var result = thermo.tmpl.parse.run('<img />');
  assertTreeEquals(expected, result);

  result = thermo.tmpl.parse.run('<img>');
  assertTreeEquals(expected, result);

  result = thermo.tmpl.parse.run('<img/>');
  assertTreeEquals(expected, result);
}

function testNestedTag() {
  var expected = new parse.ElementNode('div');
  expected.children.push(new parse.ElementNode('img'));

  var result = thermo.tmpl.parse.run('<div> <img /></div>');
  assertTreeEquals(expected, result);

  result = thermo.tmpl.parse.run('<div><img></div>');
  assertTreeEquals(expected, result);
}

function testNestedTag2() {
  var expected = new parse.ElementNode('div');
  expected.children.push(new parse.ElementNode('img'));

  var child = new parse.ElementNode('div');
  child.children.push(new parse.ElementNode('span'));
  child.children.push(new parse.ElementNode('span'));

  expected.children.push(child);

  var result = thermo.tmpl.parse.run(
      '<div><img /><div><span></span><span></span></div></div>');
  assertTreeEquals(expected, result);
}

function testVoidAttribute() {
  var expected = new parse.ElementNode('div');
  expected.attributes.push(new parse.AttributeNode('hidden'));

  var result = thermo.tmpl.parse.run('<div hidden></div>');
  assertTreeEquals(expected, result);
}


function testAttribute() {
  var expected = new parse.ElementNode('div');

  var attr = new parse.AttributeNode('style');
  attr.parts.push('display: none;');
  expected.attributes.push(attr);

  var result = thermo.tmpl.parse.run('<div style="display: none;"> </div>');
  assertTreeEquals(expected, result);
}


function testAttribute2() {
  var expected = new parse.ElementNode('span');

  var attr = new parse.AttributeNode('aria-role');
  attr.parts.push('button');
  expected.attributes.push(attr);

  attr = new parse.AttributeNode('style');
  attr.parts.push('color: red;');
  expected.attributes.push(attr);

  expected.attributes.push(new parse.AttributeNode('hidden'));

  var result = thermo.tmpl.parse.run(
      '<span aria-role="button" style="color: red;" hidden></span>');
  assertTreeEquals(expected, result);
}

function testAttribute3() {
  var expected = new parse.ElementNode('span');

  var attr = new parse.AttributeNode('class');
  attr.parts.push('foo ');

  var ifStmt = new parse.IfStmt();
  var branch = new parse.Branch();
  branch.func = function(data) { return data.bar; };
  branch.children.push('bar');
  ifStmt.branches.push(branch);
  ifStmt.deps.push(['bar']);
  attr.parts.push(ifStmt);
  attr.deps.push(['bar']);

  expected.attributes.push(attr);

  var result = thermo.tmpl.parse.run(
      '<span class="foo {if $bar}bar{/if}"></span>)');
  assertTreeEquals(expected, result);
}


function testConditionalNode() {
  var expected = new parse.ElementNode('div');

  var ifStmt = new parse.IfStmt();
  var branch = new parse.Branch();
  branch.func = function(data) { return data.foo < 5; };
  branch.children = [new parse.ElementNode('span')];
  ifStmt.branches.push(branch);
  ifStmt.deps.push(['foo']);

  branch = new parse.Branch();
  branch.func = goog.functions.TRUE;
  branch.children = [new parse.ElementNode('p')];
  ifStmt.branches.push(branch);
  expected.children.push(ifStmt);

  var result = thermo.tmpl.parse.run(
      '<div>{if $foo < 5}<span></span>{else}<p></p>{/if}</div>');
  assertTreeEquals(expected, result);
}

function testConditionalNode2() {
  var expected = new parse.ElementNode('div');

  var ifStmt = new parse.IfStmt();
  var branch = new parse.Branch();
  branch.func = function(data) { return data.foo < 6; };
  branch.children =
      [new parse.ElementNode('span'), new parse.ElementNode('div')];
  ifStmt.branches.push(branch);

  branch = new parse.Branch();
  branch.func = function(data) { return data.bar >= 7; };

  var child = new parse.ElementNode('div');
  child.children.push(new parse.ElementNode('span'));

  var attr = new parse.AttributeNode('id');
  attr.parts.push('1');
  child.attributes.push(attr);

  branch.children = [child];
  ifStmt.branches.push(branch);
  ifStmt.deps.push(['foo']);

  branch = new parse.Branch();
  branch.func = goog.functions.TRUE;

  child = new parse.ElementNode('div');
  child.children.push(new parse.ElementNode('div'));

  branch.children = [new parse.ElementNode('span'), child];
  ifStmt.branches.push(branch);
  ifStmt.deps.push(['bar']);
  expected.children.push(ifStmt);

  var result = thermo.tmpl.parse.run([
    '<div>',
    '  {if $foo < 6}',
    '    <span></span>',
    '    <div></div>',
    '  {elseif $bar >= 7}',
    '    <div id="1">',
    '      <span></span>',
    '    </div>',
    '  {else}',
    '    <span></span>',
    '    <div><div></div></div>',
    '  {/if}',
    '</div>'
  ].join(''));

  assertTreeEquals(expected, result);
}

function testConditionalNode3() {
  var expected = new parse.ElementNode('div');

  var ifStmt = new parse.IfStmt();
  var branch = new parse.Branch();
  branch.func = function(data) { return data.foo < 5; };

  var ifStmt2 = new parse.IfStmt();
  var branch2 = new parse.Branch();
  branch2.func = function(data) { return data.bar >= 5; };
  branch2.children = [new parse.ElementNode('div')];
  ifStmt2.branches.push(branch2);
  ifStmt2.deps.push(['bar']);

  branch2 = new parse.Branch();
  branch2.func = goog.functions.TRUE;
  branch2.children = [new parse.ElementNode('span')];
  ifStmt2.branches.push(branch2);

  branch.children.push(ifStmt2);
  ifStmt.branches.push(branch);
  ifStmt.deps.push(['foo']);

  expected.children.push(ifStmt);

  var result = thermo.tmpl.parse.run([
    '<div>',
    '  {if $foo < 5}',
    '    {if $bar >= 5}',
    '      <div></div>',
    '    {else}',
    '      <span></span>',
    '    {/if}',
    '  {/if}',
    '</div>'
  ].join(''));

  assertTreeEquals(expected, result);
}

function testForStatement() {
  var expected = new parse.ElementNode('ul');
  var foreachStmt = new parse.ForeachStmt();
  foreachStmt.localVar = 'thing';
  foreachStmt.dep = ['list'];

  var child = new parse.ElementNode('li');
  var attr = new parse.AttributeNode('id');
  var print = new parse.PrintStmt();
  print.func = function(data) { return data.thing.id; };
  print.deps.push(['thing', 'id']);
  attr.parts.push(print);
  attr.deps.push(['thing', 'id']);
  child.attributes.push(attr);
  var text = new parse.TextNode();
  var print = new parse.PrintStmt();
  print.func = function(data) { return data.thing.text; };
  print.deps.push(['thing', 'text']);
  text.parts.push(print);
  text.deps.push(['thing', 'text']);
  child.children.push(text);

  foreachStmt.children.push(child);
  foreachStmt.children.push(new parse.ElementNode('li'));

  child = new parse.ElementNode('span');
  text = new parse.TextNode();
  text.parts.push('Nothing!');
  child.children.push(text);
  foreachStmt.emptyChildren.push(child);
  foreachStmt.emptyChildren.push(new parse.ElementNode('div'));

  expected.children.push(foreachStmt);

  var result = thermo.tmpl.parse.run([
    '<ul>',
    '  {foreach $thing in $list}',
    '    <li id="{$thing.id}" >{$thing.text}</li>',
    '    <li></li>',
    '  {ifempty}',
    '    <span>Nothing!</span>',
    '    <div></div>',
    '  {/foreach}',
    '</ul>'
  ].join(''));

  assertTreeEquals(expected, result);
}

function testSwitchStatement() {
  var expected = new parse.ElementNode('div');

  var ifStmt = new parse.IfStmt();
  var branch = new parse.Branch();
  branch.func = function(data) { return data.foo == 'bar'; };
  branch.children = [new parse.ElementNode('span')];
  ifStmt.branches.push(branch);

  branch = new parse.Branch();
  branch.func = function(data) { return data.foo == 'quix'; };
  branch.children = [new parse.ElementNode('div')];
  ifStmt.branches.push(branch);

  branch = new parse.Branch();
  branch.func = goog.functions.TRUE;
  branch.children = [new parse.ElementNode('span')];
  ifStmt.branches.push(branch);
  ifStmt.deps.push(['foo']);

  expected.children.push(ifStmt);

  var result = thermo.tmpl.parse.run([
    '<div>',
    '  {switch $foo}',
    '    {case \'bar\'}',
    '      <span></span>',
    '    {case \'quix\'}',
    '      <div></div>',
    '    {default}',
    '      <span></span>',
    '  {/switch}',
    '</div>'
  ].join(''));

  assertTreeEquals(expected, result);
}

function testSwitchStatement2() {
  var expected = new parse.ElementNode('div');

  var ifStmt = new parse.IfStmt();
  var branch = new parse.Branch();
  branch.func = function(data) { return data.foo > 5; };

  var switchStmt = new parse.IfStmt();
  var switchBranch1 = new parse.Branch();
  switchBranch1.func = function(data) { return data.foo == 'bar'; };
  switchBranch1.children.push(new parse.ElementNode('span'));

  var switchBranch2 = new parse.Branch();
  switchBranch2.func = goog.functions.TRUE;
  switchBranch2.children.push(new parse.ElementNode('div'));

  switchStmt.branches.push(switchBranch1);
  switchStmt.deps.push(['foo']);
  switchStmt.branches.push(switchBranch2);

  branch.children.push(switchStmt);
  ifStmt.branches.push(branch);
  ifStmt.deps.push(['foo']);
  expected.children.push(ifStmt);

  var result = thermo.tmpl.parse.run([
    '<div>',
    '  {if $foo > 5}',
    '    {switch $foo}',
    '      {case \'bar\'}',
    '        <span></span>',
    '      {default}',
    '        <div></div>',
    '    {/switch}',
    '  {/if}',
    '</div>'
  ].join(''));

  assertTreeEquals(expected, result);
}

function testTextNode() {
  var expected = new parse.ElementNode('div');
  var text = new parse.TextNode();
  text.parts.push('foo');
  expected.children.push(text);

  var result = thermo.tmpl.parse.run('<div>   foo</div>');
  assertTreeEquals(expected, result);

  result = thermo.tmpl.parse.run('<div>   foo   </div>');
  assertTreeEquals(expected, result);

  result = thermo.tmpl.parse.run('<div>foo</div>');
  assertTreeEquals(expected, result);
}

function testTextNode2() {
  var expected = new parse.ElementNode('div');
  var text = new parse.TextNode();
  text.parts.push('foo');
  expected.children.push(text);

  var ifStmt = new parse.IfStmt();
  var branch = new parse.Branch();
  branch.func = function(data) { return data.bar; };
  text = new parse.TextNode();
  text.parts.push('bar');
  branch.children.push(text);
  ifStmt.branches.push(branch);
  ifStmt.deps.push(['bar']);

  expected.children.push(ifStmt);
  text = new parse.TextNode();
  text.parts.push('quix blah');
  expected.children.push(text);

  var result = thermo.tmpl.parse.run(
      '<div> foo{if $bar}bar{/if}quix blah</div>');
  assertTreeEquals(expected, result);
}

function testTextNode3() {
  var expected = new parse.ElementNode('span');

  expected.children.push(new parse.ElementNode('div'));
  var text = new parse.TextNode();
  text.parts.push('foo');
  expected.children.push(text);

  var ifStmt = new parse.IfStmt();
  var branch = new parse.Branch();
  branch.func = function(data) { return data.bar; };
  var div = new parse.ElementNode('div');
  text = new parse.TextNode();
  text.parts.push('quix');
  div.children.push(text);
  branch.children.push(div);
  text = new parse.TextNode();
  text.parts.push('bar');
  branch.children.push(text);

  ifStmt.branches.push(branch);
  ifStmt.deps.push(['bar']);
  expected.children.push(ifStmt);

  var result = thermo.tmpl.parse.run([
    '<span>',
    '  <div></div>',
    '  foo',
    '  {if $bar}',
    '    <div> quix</div>',
    '    bar',
    '  {/if}',
    '</span>'
  ].join(''));
  assertTreeEquals(expected, result);
}

function testConditionalAttribute() {
  var expected = new parse.ElementNode('div');
  var ifStmt = new parse.IfStmt();
  var branch = new parse.Branch();
  branch.func = function(data) { return data.bar != 'foo'; };
  branch.children.push(new parse.AttributeNode('hidden'));
  ifStmt.branches.push(branch);
  ifStmt.deps.push(['bar']);
  expected.attributes.push(ifStmt);

  var result = thermo.tmpl.parse.run(
      '<div {if $bar != \'foo\'}hidden{/if}></div>');
  assertTreeEquals(expected, result);
}

function testPrintNode() {
  var expected = new parse.ElementNode('span');

  var text = new parse.TextNode();
  text.deps.push(['foo']);
  var print = new parse.PrintStmt();
  print.func = function(data) { return data.foo; };
  print.deps.push(['foo']);
  text.parts.push(print);

  expected.children.push(text);

  var result = thermo.tmpl.parse.run('<span> {$foo} </span>');
  assertTreeEquals(expected, result);

  result = thermo.tmpl.parse.run('<span>{$foo}</span>');
  assertTreeEquals(expected, result);
}

function testPrintNode2() {
  var expected = new parse.ElementNode('span');

  var text = new parse.TextNode();
  text.deps.push(['foo']);
  var print = new parse.PrintStmt();
  print.func = function(data) { return data.foo; };
  print.deps.push(['foo']);
  text.parts.push(print);
  text.parts.push(' bar');

  expected.children.push(text);

  var result = thermo.tmpl.parse.run('<span> {$foo} bar </span>');
  assertTreeEquals(expected, result);

  result = thermo.tmpl.parse.run('<span>{$foo} bar</span>');
  assertTreeEquals(expected, result);
}


function testPrintNode3() {
  var expected = new parse.ElementNode('div');

  var attr = new parse.AttributeNode('class');
  var print = new parse.PrintStmt();
  print.func = function(data) { return data.foo; };
  print.deps.push(['foo']);
  attr.parts.push(print);
  attr.parts.push(' bar');
  attr.deps.push(['foo']);

  expected.attributes.push(attr);

  var result = thermo.tmpl.parse.run('<div class="{$foo} bar"></div>');
  assertTreeEquals(expected, result);
}

function testPrintNode4() {
  var expected = new parse.ElementNode('div');

  var attr = new parse.AttributeNode('class');
  var ifStmt = new parse.IfStmt();
  var branch = new parse.Branch();
  branch.func = function(data) { return data.foo; };
  branch.children.push('bar ');
  var print = new parse.PrintStmt();
  print.func = function(data) { return data.quix; };
  print.deps.push(['quix']);
  branch.children.push(print);

  ifStmt.branches.push(branch);
  ifStmt.deps.push(['foo']);
  attr.parts.push(ifStmt);
  attr.deps.push(['foo']);
  attr.deps.push(['quix']);
  attr.parts.push(' boo');

  expected.attributes.push(attr);

  var result = thermo.tmpl.parse.run(
      '<div class="{if $foo}bar {$quix}{/if} boo"></div>');
  assertTreeEquals(expected, result);
}

function testPrintNode5() {
  var expected = new parse.ElementNode('div');
  var ifStmt = new parse.IfStmt();
  var branch = new parse.Branch();
  branch.func = function(data) { return data.bar; };
  var text = new parse.TextNode();
  var print = new parse.PrintStmt();
  print.func = function(data) { return data.foo; };
  print.deps.push(['foo']);
  text.parts.push(print);
  text.deps.push(['foo']);
  text.parts.push(' bar ');
  var print2 = new parse.PrintStmt();
  print2.func = function(data) { return data.quix; };
  print2.deps.push(['quix']);
  text.parts.push(print2);
  text.deps.push(['quix']);
  branch.children.push(text);
  branch.children.push(new parse.ElementNode('span'));
  ifStmt.branches.push(branch);
  ifStmt.deps.push(['bar']);
  expected.children.push(ifStmt);

  var result = thermo.tmpl.parse.run([
    '<div>',
    '  {if $bar}',
    '    {$foo} bar {$quix}',
    '    <span></span>',
    '  {/if}',
    '</div>'
  ].join(''));
  assertTreeEquals(expected, result);
}

function testBrace() {
  var expected = new parse.ElementNode('div');
  var attr = new parse.AttributeNode('data-foo');
  attr.parts.push('{');
  attr.parts.push('bar');
  attr.parts.push('}');
  expected.attributes.push(attr);

  var result = thermo.tmpl.parse.run('<div data-foo="{lb}bar{rb}"></div>');
  assertTreeEquals(expected, result);
}

function testBrace2() {
  var expected = new parse.ElementNode('div');
  var attr = new parse.AttributeNode('foo');
  var ifStmt = new parse.IfStmt();
  var branch = new parse.Branch();
  branch.func = function(data) { return data.foo; };
  branch.children.push('{');
  branch.children.push(' text ');
  branch.children.push('}');
  ifStmt.branches.push(branch);
  ifStmt.deps.push(['foo']);
  attr.parts.push(ifStmt);
  attr.deps.push(['foo']);
  attr.parts.push(' bar');
  attr.parts.push('}');
  expected.attributes.push(attr);

  var result = thermo.tmpl.parse.run(
      '<div foo="{if $foo}{lb} text {rb}{/if} bar{rb}"></div>');
  assertTreeEquals(expected, result);
}

function testBrace3() {
  var expected = new parse.ElementNode('span');
  var text = new parse.TextNode();
  text.parts.push('{');
  text.parts.push('bar');
  text.parts.push('}');
  expected.children.push(text);

  var result = thermo.tmpl.parse.run('<span>{lb}bar{rb}</span>');
  assertTreeEquals(expected, result);

  result = thermo.tmpl.parse.run('<span>  {lb}bar{rb}  </span>');
  assertTreeEquals(expected, result);
}

function testBrace4() {
  var expected = new parse.ElementNode('span');
  var ifStmt = new parse.IfStmt();
  var branch = new parse.Branch();
  branch.func = function(data) { return data.bar; };
  var text = new parse.TextNode();
  text.parts.push('{');
  text.parts.push(' ');
  var print = new parse.PrintStmt();
  print.func = function(data) { return data.foo; };
  print.deps.push(['foo']);
  text.parts.push(print);
  text.parts.push(' ');
  text.parts.push('}');
  text.deps.push(['foo']);
  branch.children.push(text);
  ifStmt.branches.push(branch);
  ifStmt.deps.push(['bar']);
  expected.children.push(ifStmt);

  var result = thermo.tmpl.parse.run(
      '<span>{if $bar}{lb} {$foo} {rb}{/if}</span>');
  assertTreeEquals(expected, result);
}

function testView() {
  var expected = new parse.ElementNode('span');
  var viewStmt = new parse.ViewStmt();
  viewStmt.view = 'foo.Btn';
  viewStmt.dep = ['data', 'foo'];
  expected.children.push(viewStmt);

  var result = thermo.tmpl.parse.run(
      '<span> {view foo.Btn $data.foo} </span>');
  assertTreeEquals(expected, result);
}

function testView2() {
  var expected = new parse.ElementNode('div');
  var ifStmt = new parse.IfStmt();
  var branch = new parse.Branch();
  branch.func = function(data) { return data.bar; };
  ifStmt.deps.push(['bar']);
  var viewStmt = new parse.ViewStmt();
  viewStmt.view = 'foo.blah.Btn';
  viewStmt.dep = ['data', 'quix', 'blah'];
  branch.children.push(viewStmt);
  ifStmt.branches.push(branch);
  expected.children.push(ifStmt);

  var result = thermo.tmpl.parse.run(
      '<div> {if $bar} {view foo.blah.Btn $data.quix.blah}{/if} </div>');
  assertTreeEquals(expected, result);
}

function testView3() {
  var expected = new parse.ElementNode('span');
  var viewStmt = new parse.ViewStmt();
  viewStmt.view = 'foo.Btn';
  expected.children.push(viewStmt);

  var result = thermo.tmpl.parse.run(
      '<span> {view foo.Btn} </span>');
  assertTreeEquals(expected, result);
}

function assertTreeEquals(expected, result) {
  if (expected instanceof parse.ElementNode) {
    assertTrue(result instanceof parse.ElementNode);
    assertEquals('Incorrect tag for element.', expected.tag, result.tag);

    assertEquals('Incorrect number of children.',
        expected.children.length, result.children.length);
    for (var i = 0; i < expected.children.length; i++) {
      assertTreeEquals(expected.children[i], result.children[i]);
    }

    assertEquals(expected.attributes.length, result.attributes.length);
    for (var i = 0; i < expected.attributes.length; i++) {
      assertTreeEquals(expected.attributes[i], result.attributes[i]);
    }
  } else if (expected instanceof parse.AttributeNode) {
    assertTrue(result instanceof parse.AttributeNode);
    assertEquals(expected.name, result.name);

    assertArrayEquals(expected.deps, result.deps);

    assertEquals('Incorrect number of attribute parts.',
        expected.parts.length, result.parts.length);
    for (var i = 0; i < expected.parts.length; i++) {
      assertTreeEquals(expected.parts[i], result.parts[i]);
    }
  } else if (expected instanceof parse.IfStmt) {
    assertTrue(result instanceof parse.IfStmt);

    assertArrayEquals(expected.deps, result.deps);

    assertEquals(expected.branches.length, result.branches.length);
    for (var i = 0; i < expected.branches.length; i++) {
      assertTreeEquals(expected.branches[i], result.branches[i]);
    }
  } else if (expected instanceof parse.Branch) {
    assertTrue(result instanceof parse.Branch);

    if (window.uneval) {
      assertEquals(uneval(expected.func), uneval(result.func));
    }

    assertEquals(expected.children.length, result.children.length);
    for (var i = 0; i < expected.children.length; i++) {
      assertTreeEquals(expected.children[i], result.children[i]);
    }
  } else if (expected instanceof parse.TextNode) {
    assertTrue(result instanceof parse.TextNode);

    assertArrayEquals(expected.deps, result.deps);

    assertEquals(expected.parts.length, result.parts.length);
    for (var i = 0; i < expected.parts.length; i++) {
      assertTreeEquals(expected.parts[i], result.parts[i]);
    }
  } else if (expected instanceof parse.PrintStmt) {
    assertTrue(result instanceof parse.PrintStmt);

    assertArrayEquals(expected.deps, result.deps);

    if (window.uneval) {
      assertEquals(uneval(expected.func), uneval(result.func));
    }
  } else if (expected instanceof parse.ForeachStmt) {
    assertTrue(result instanceof parse.ForeachStmt);

    assertArrayEquals(expected.dep, result.dep);
    assertEquals(expected.localVar, result.localVar);

    assertEquals(expected.children.length, result.children.length);
    for (var i = 0; i < expected.children.length; i++) {
      assertTreeEquals(expected.children[i], result.children[i]);
    }

    assertEquals(expected.emptyChildren.length, result.emptyChildren.length);
    for (var i = 0; i < expected.emptyChildren.length; i++) {
      assertTreeEquals(expected.emptyChildren[i], result.emptyChildren[i]);
    }
  } else if (expected instanceof parse.ViewStmt) {
    assertTrue(result instanceof parse.ViewStmt);

    if (expected.dep == null) {
      assertNull(result.dep);
    } else {
      assertArrayEquals(expected.dep, result.dep);
    }
    assertEquals(expected.view, result.view);
  } else if (goog.isString(expected)) {
    assertEquals(expected, result);
  } else {
    fail('Unexpected type of node: ' + (typeof expected));
  }
}
