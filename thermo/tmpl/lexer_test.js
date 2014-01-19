goog.provide('thermo.tmpl.lexer_test');

goog.require('goog.testing.jsunit');
goog.require('thermo.tmpl.lexer');


var type = thermo.tmpl.lexer.TokenType;


function testTag() {
  var expected = [
    {type: type.TAG, value: 'div'},
    {type: type.TAG_CLOSE},
    {type: type.TAG_END, value: 'div'}
  ];

  var result = thermo.tmpl.lexer.run('<div></div>');
  assertTokens(expected, result);

  result = thermo.tmpl.lexer.run('<div>   </div>');
  assertTokens(expected, result);

  result = thermo.tmpl.lexer.run('  <div>  </div>');
  assertTokens(expected, result);
}

function testVoidTag() {
  var expected = [
    {type: type.TAG, value: 'img'},
    {type: type.TAG_CLOSE}
  ];

  var result = thermo.tmpl.lexer.run(' <img/>');
  assertTokens(expected, result);

  result = thermo.tmpl.lexer.run('<img>');
  assertTokens(expected, result);

  result = thermo.tmpl.lexer.run(' <img  />');
  assertTokens(expected, result);
}

function testNestedTags() {
  var expected = [
    {type: type.TAG, value: 'div'},
    {type: type.TAG_CLOSE},
    {type: type.TAG, value: 'img'},
    {type: type.TAG_CLOSE},
    {type: type.TAG, value: 'b'},
    {type: type.TAG_CLOSE},
    {type: type.TAG, value: 'i'},
    {type: type.TAG_CLOSE},
    {type: type.TAG, value: 'br'},
    {type: type.TAG_CLOSE},
    {type: type.TAG_END, value: 'i'},
    {type: type.TAG_END, value: 'b'},
    {type: type.TAG_END, value: 'div'}
  ];

  var result = thermo.tmpl.lexer.run('<div><img><b><i><br></i></b></div>');
  assertTokens(expected, result);

  result = thermo.tmpl.lexer.run('<div> <img /> <b> <i><br /></i></b> </div>');
  assertTokens(expected, result);

  result = thermo.tmpl.lexer.run([
    '<div>',
    '  <img />',
    '  <b><i><br></i></b>',
    '  </div>'].join('\n'));
  assertTokens(expected, result);
}

function testAttributes() {
  var expected = [
    {type: type.TAG, value: 'div'},
    {type: type.ATTR, value: 'style'},
    {type: type.ATTR_PART, value: 'display: none;'},
    {type: type.ATTR_END},
    {type: type.TAG_CLOSE},
    {type: type.TAG_END, value: 'div'}
  ];

  var result = thermo.tmpl.lexer.run('<div style="display: none;"></div>');
  assertTokens(expected, result);

  result = thermo.tmpl.lexer.run('<div style = "display: none;"> </div>');
  assertTokens(expected, result);
}

function testAttributes2() {
  var expected = [
    {type: type.TAG, value: 'img'},
    {type: type.ATTR, value: 'width'},
    {type: type.ATTR_PART, value: '100'},
    {type: type.ATTR_END},
    {type: type.ATTR, value: 'height'},
    {type: type.ATTR_PART, value: '200'},
    {type: type.ATTR_END},
    {type: type.ATTR, value: 'async'},
    {type: type.ATTR_END},
    {type: type.TAG_CLOSE}
  ];

  var result = thermo.tmpl.lexer.run(
      '<img width="100" height = "200" async />');
  assertTokens(expected, result);

  result = thermo.tmpl.lexer.run([
    '<img',
    '  width = "100"',
    '  height = "200"',
    '  async',
    '/>'].join('\n'));
  assertTokens(expected, result);
}

function testAttributes3() {
  var expected = [
    {type: type.TAG, value: 'span'},
    {type: type.ATTR, value: 'data-foo'},
    {type: type.ATTR_PART, value: 'bar'},
    {type: type.ATTR_END},
    {type: type.ATTR, value: 'data_bar'},
    {type: type.ATTR_PART, value: 'foo'},
    {type: type.ATTR_END},
    {type: type.TAG_CLOSE},
    {type: type.TAG_END, value: 'span'}
  ];

  var result = thermo.tmpl.lexer.run(
      '<span data-foo="bar" data_bar = "foo" ></span>');
  assertTokens(expected, result);
}

function testCommand1() {
  var expected = [
    {type: type.TAG, value: 'div'},
    {type: type.ATTR, value: 'id'},
    {type: type.ATTR_PART, value: '5'},
    {type: type.ATTR_END},
    {type: type.TAG_CLOSE},
    {type: type.COMMAND, value: 'if'},
    {type: type.EXPRESSION},
    {type: type.EXPRESSION_VAR_FOREIGN, value: '$num'},
    {type: type.EXPRESSION_OP, value: '>'},
    {type: type.EXPRESSION_VAR_NUM, value: '0'},
    {type: type.EXPRESSION_CLOSE},
    {type: type.COMMAND_CLOSE},
    {type: type.TAG, value: 'div'},
    {type: type.TAG_CLOSE},
    {type: type.TAG_END, value: 'div'},
    {type: type.COMMAND, value: 'else'},
    {type: type.COMMAND_CLOSE},
    {type: type.TAG, value: 'img'},
    {type: type.TAG_CLOSE},
    {type: type.COMMAND_END, value: 'if'},
    {type: type.TAG_END, value: 'div'}
  ];

  var result = thermo.tmpl.lexer.run(
      '<div id="5">{if $num > 0}<div></div>{else}<img />{/if}</div>');

  assertTokens(expected, result);
}

function testForCommand() {
  var expected = [
    {type: type.TAG, value: 'div'},
    {type: type.TAG_CLOSE},
    {type: type.COMMAND, value: 'foreach'},
    {type: type.EXPRESSION},
    {type: type.EXPRESSION_VAR_FOREIGN, value: '$foo'},
    {type: type.EXPRESSION_OP, value: 'in'},
    {type: type.EXPRESSION_VAR_FOREIGN, value: '$foos'},
    {type: type.EXPRESSION_CLOSE},
    {type: type.COMMAND_CLOSE},
    {type: type.TAG, value: 'div'},
    {type: type.TAG_CLOSE},
    {type: type.TEXT},
    {type: type.PRINT, value: '$foo'},
    {type: type.TEXT_END},
    {type: type.TAG_END, value: 'div'},
    {type: type.COMMAND, value: 'ifempty'},
    {type: type.COMMAND_CLOSE},
    {type: type.TAG, value: 'span'},
    {type: type.TAG_CLOSE},
    {type: type.TEXT},
    {type: type.TEXT_PART, value: 'No foos!'},
    {type: type.TEXT_END},
    {type: type.TAG_END, value: 'span'},
    {type: type.COMMAND_END, value: 'foreach'},
    {type: type.TAG_END, value: 'div'}
  ];

  var result = thermo.tmpl.lexer.run([
    '<div>',
    '  {foreach $foo in $foos}',
    '    <div>{$foo}</div>',
    '  {ifempty}',
    '    <span>No foos!</span>',
    '  {/foreach}',
    '</div>'
  ].join(''));
  assertTokens(expected, result);
}

function testAttrCommand() {
  var expected = [
    {type: type.TAG, value: 'img'},
    {type: type.ATTR, value: 'class'},
    {type: type.ATTR_PART, value: 'test '},
    {type: type.COMMAND, value: 'if'},
    {type: type.EXPRESSION},
    {type: type.EXPRESSION_VAR_FOREIGN, value: '$var'},
    {type: type.EXPRESSION_CLOSE},
    {type: type.COMMAND_CLOSE},
    {type: type.ATTR_PART, value: 'foo'},
    {type: type.COMMAND, value: 'else'},
    {type: type.COMMAND_CLOSE},
    {type: type.ATTR_PART, value: 'bar'},
    {type: type.COMMAND_END, value: 'if'},
    {type: type.ATTR_END},
    {type: type.TAG_CLOSE}
  ];

  var result = thermo.tmpl.lexer.run(
      '<img class="test {if $var}foo{else}bar{/if}" />');
  assertTokens(expected, result);
}

function testAttrCommand2() {
  var expected = [
    {type: type.TAG, value: 'img'},
    {type: type.ATTR, value: 'class'},
    {type: type.COMMAND, value: 'if'},
    {type: type.EXPRESSION},
    {type: type.EXPRESSION_VAR_FOREIGN, value: '$var'},
    {type: type.EXPRESSION_CLOSE},
    {type: type.COMMAND_CLOSE},
    {type: type.ATTR_PART, value: 'foo'},
    {type: type.COMMAND, value: 'else'},
    {type: type.COMMAND_CLOSE},
    {type: type.ATTR_PART, value: 'bar'},
    {type: type.COMMAND_END, value: 'if'},
    {type: type.ATTR_END},
    {type: type.TAG_CLOSE}
  ];

  var result = thermo.tmpl.lexer.run(
      '<img class="{if $var}foo{else}bar{/if}" />');
  assertTokens(expected, result);
}

function testConditionalAttr() {
  var expected = [
    {type: type.TAG, value: 'img'},
    {type: type.COMMAND, value: 'if'},
    {type: type.EXPRESSION},
    {type: type.EXPRESSION_VAR_FOREIGN, value: '$var'},
    {type: type.EXPRESSION_CLOSE},
    {type: type.COMMAND_CLOSE},
    {type: type.ATTR, value: 'hidden'},
    {type: type.ATTR_END},
    {type: type.COMMAND_END, value: 'if'},
    {type: type.TAG_CLOSE}
  ];

  var result = thermo.tmpl.lexer.run('<img {if $var}hidden{/if} />');
  assertTokens(expected, result);
}

function testExpression() {
  var expected = [
    {type: type.TAG, value: 'div'},
    {type: type.TAG_CLOSE},
    {type: type.COMMAND, value: 'if'},
    {type: type.EXPRESSION},
    {type: type.EXPRESSION_OP, value: '('},
    {type: type.EXPRESSION_VAR_FOREIGN, value: '$data.num'},
    {type: type.EXPRESSION_OP, value: '>'},
    {type: type.EXPRESSION_VAR_NUM, value: '0'},
    {type: type.EXPRESSION_OP, value: ')'},
    {type: type.EXPRESSION_CLOSE},
    {type: type.COMMAND_CLOSE},
    {type: type.TAG, value: 'div'},
    {type: type.TAG_CLOSE},
    {type: type.TAG_END, value: 'div'},
    {type: type.COMMAND_END, value: 'if'},
    {type: type.TAG_END, value: 'div'}
  ];

  var result = thermo.tmpl.lexer.run(
      '<div>{if ($data.num > 0)}<div></div>{/if}</div>');
  assertTokens(expected, result);
}

function testText() {
  var expected = [
    {type: type.TAG, value: 'span'},
    {type: type.TAG_CLOSE},
    {type: type.TEXT},
    {type: type.TEXT_PART, value: 'foo'},
    {type: type.TEXT_END},
    {type: type.TAG_END, value: 'span'}
  ];

  var result = thermo.tmpl.lexer.run('<span>foo</span>');
  assertTokens(expected, result);

  result = thermo.tmpl.lexer.run('<span>  foo</span>');
  assertTokens(expected, result);

  result = thermo.tmpl.lexer.run('<span>  foo    </span>');
  assertTokens(expected, result);
}

function testText2() {
  var expected = [
    {type: type.TAG, value: 'div'},
    {type: type.TAG_CLOSE},
    {type: type.TEXT},
    {type: type.TEXT_PART, value: 'foo'},
    {type: type.TEXT_END},
    {type: type.COMMAND, value: 'if'},
    {type: type.EXPRESSION},
    {type: type.EXPRESSION_VAR_FOREIGN, value: '$num'},
    {type: type.EXPRESSION_OP, value: '>'},
    {type: type.EXPRESSION_VAR_NUM, value: '0'},
    {type: type.EXPRESSION_CLOSE},
    {type: type.COMMAND_CLOSE},
    {type: type.TAG, value: 'div'},
    {type: type.TAG_CLOSE},
    {type: type.TEXT},
    {type: type.TEXT_PART, value: 'bar'},
    {type: type.TEXT_END},
    {type: type.TAG_END, value: 'div'},
    {type: type.COMMAND, value: 'else'},
    {type: type.COMMAND_CLOSE},
    {type: type.TEXT},
    {type: type.TEXT_PART, value: 'quix'},
    {type: type.TEXT_END},
    {type: type.COMMAND_END, value: 'if'},
    {type: type.TAG_END, value: 'div'}
  ];

  var result = thermo.tmpl.lexer.run(
      '<div>foo{if $num > 0} <div> bar </div>{else}quix{/if}</div>');
  assertTokens(expected, result);

  result = thermo.tmpl.lexer.run(
      '<div>  foo {if $num > 0}<div>bar</div>{else} quix {/if}</div>');
  assertTokens(expected, result);

  result = thermo.tmpl.lexer.run(
      '<div>foo{if $num > 0}<div>bar</div>{else}quix{/if}</div>');
  assertTokens(expected, result);
}

function testPrint() {
  var expected = [
    {type: type.TAG, value: 'span'},
    {type: type.TAG_CLOSE},
    {type: type.TEXT},
    {type: type.PRINT, value: '$foo'},
    {type: type.TEXT_END},
    {type: type.TAG_END, value: 'span'}
  ];

  var result = thermo.tmpl.lexer.run('<span>{$foo}</span>');
  assertTokens(expected, result);
}

function testPrint2() {
  var expected = [
    {type: type.TAG, value: 'img'},
    {type: type.ATTR, value: 'src'},
    {type: type.PRINT, value: '$uri'},
    {type: type.ATTR_END},
    {type: type.TAG_CLOSE}
  ];

  var result = thermo.tmpl.lexer.run('<img src="{$uri}" />');
  assertTokens(expected, result);
}

function testPrint3() {
  var expected = [
    {type: type.TAG, value: 'span'},
    {type: type.ATTR, value: 'class'},
    {type: type.ATTR_PART, value: 'visible '},
    {type: type.COMMAND, value: 'if'},
    {type: type.EXPRESSION},
    {type: type.EXPRESSION_VAR_FOREIGN, value: '$active'},
    {type: type.EXPRESSION_CLOSE},
    {type: type.COMMAND_CLOSE},
    {type: type.PRINT, value: '$additional'},
    {type: type.COMMAND_END, value: 'if'},
    {type: type.ATTR_END},
    {type: type.TAG_CLOSE},
    {type: type.TAG_END, value: 'span'}
  ];

  var result = thermo.tmpl.lexer.run(
      '<span class="visible {if $active}{$additional}{/if}"></span>');
  assertTokens(expected, result);
}

function testPrint4() {
  var expected = [
    {type: type.TAG, value: 'span'},
    {type: type.TAG_CLOSE},
    {type: type.COMMAND, value: 'if'},
    {type: type.EXPRESSION},
    {type: type.EXPRESSION_VAR_FOREIGN, value: '$foo'},
    {type: type.EXPRESSION_CLOSE},
    {type: type.COMMAND_CLOSE},
    {type: type.TEXT},
    {type: type.TEXT_PART, value: 'foo '},
    {type: type.PRINT, value: '$bar'},
    {type: type.TEXT_PART, value: ' '},
    {type: type.PRINT, value: '$quix'},
    {type: type.TEXT_END},
    {type: type.COMMAND_END, value: 'if'},
    {type: type.TAG_END, value: 'span'}
  ];

  var result = thermo.tmpl.lexer.run(
      '<span>{if $foo}foo {$bar} {$quix}{/if}</span>');
  assertTokens(expected, result);
}

function testPrint5() {
  var expected = [
    {type: type.TAG, value: 'span'},
    {type: type.ATTR, value: 'class'},
    {type: type.ATTR_PART, value: 'visible '},
    {type: type.PRINT, value: '$additional'},
    {type: type.ATTR_PART, value: ' '},
    {type: type.PRINT, value: '$another'},
    {type: type.ATTR_END},
    {type: type.TAG_CLOSE},
    {type: type.TAG_END, value: 'span'}
  ];

  var result = thermo.tmpl.lexer.run(
      '<span class="visible {$additional} {$another}"></span>');
  assertTokens(expected, result);
}

function testPrint6() {
  var expected = [
    {type: type.TAG, value: 'span'},
    {type: type.ATTR, value: 'class'},
    {type: type.COMMAND, value: 'if'},
    {type: type.EXPRESSION},
    {type: type.EXPRESSION_VAR_FOREIGN, value: '$foo'},
    {type: type.EXPRESSION_CLOSE},
    {type: type.COMMAND_CLOSE},
    {type: type.ATTR_PART, value: 'visible '},
    {type: type.PRINT, value: '$additional'},
    {type: type.ATTR_PART, value: ' '},
    {type: type.PRINT, value: '$another'},
    {type: type.COMMAND_END, value: 'if'},
    {type: type.ATTR_PART, value: ' '},
    {type: type.PRINT, value: '$quix'},
    {type: type.ATTR_END},
    {type: type.TAG_CLOSE},
    {type: type.TAG_END, value: 'span'}
  ];

  var result = thermo.tmpl.lexer.run([
    '<span class="',
    '{if $foo}visible {$additional} {$another}{/if} {$quix}">',
    '</span>'
  ].join(''));
  assertTokens(expected, result);
}

function testPrint7() {
  var expected = [
    {type: type.TAG, value: 'div'},
    {type: type.TAG_CLOSE},
    {type: type.TEXT},
    {type: type.TEXT_PART, value: 'Hi '},
    {type: type.PRINT, value: '$name'},
    {type: type.TEXT_END},
    {type: type.TAG, value: 'span'},
    {type: type.TAG_CLOSE},
    {type: type.TEXT},
    {type: type.TEXT_PART, value: 'Foo '},
    {type: type.PRINT, value: '$obj.bar'},
    {type: type.TEXT_END},
    {type: type.TAG_END, value: 'span'},
    {type: type.TAG_END, value: 'div'}
  ];

  var result = thermo.tmpl.lexer.run(
      '<div>Hi {$name} <span>Foo {$obj.bar}</span></div>');
  assertTokens(expected, result);
}

function testBrace() {
  var expected = [
    {type: type.TAG, value: 'span'},
    {type: type.ATTR, value: 'data-foo'},
    {type: type.COMMAND, value: 'rb'},
    {type: type.ATTR_PART, value: 'foo'},
    {type: type.ATTR_END},
    {type: type.TAG_CLOSE},
    {type: type.TAG_END, value: 'span'}
  ];

  var result = thermo.tmpl.lexer.run('<span data-foo="{rb}foo"></span>');
  assertTokens(expected, result);
}

function testBrace2() {
  var expected = [
    {type: type.TAG, value: 'span'},
    {type: type.ATTR, value: 'data-foo'},
    {type: type.ATTR_PART, value: 'foo '},
    {type: type.COMMAND, value: 'lb'},
    {type: type.ATTR_END},
    {type: type.TAG_CLOSE},
    {type: type.TAG_END, value: 'span'}
  ];

  var result = thermo.tmpl.lexer.run('<span data-foo="foo {lb}"></span>');
  assertTokens(expected, result);
}

function testBrace3() {
  var expected = [
    {type: type.TAG, value: 'div'},
    {type: type.TAG_CLOSE},
    {type: type.TEXT},
    {type: type.COMMAND, value: 'lb'},
    {type: type.COMMAND, value: 'rb'},
    {type: type.TEXT_PART, value: ' foo'},
    {type: type.TEXT_END},
    {type: type.TAG_END, value: 'div'}
  ];

  var result = thermo.tmpl.lexer.run('<div> {lb}{rb} foo </div>');
  assertTokens(expected, result);
}

function testBrace4() {
  var expected = [
    {type: type.TAG, value: 'div'},
    {type: type.TAG_CLOSE},
    {type: type.TEXT},
    {type: type.TEXT_PART, value: 'bar '},
    {type: type.COMMAND, value: 'lb'},
    {type: type.COMMAND, value: 'rb'},
    {type: type.TEXT_PART, value: ' foo'},
    {type: type.TEXT_END},
    {type: type.TAG_END, value: 'div'}
  ];

  var result = thermo.tmpl.lexer.run('<div> bar {lb}{rb} foo </div>');
  assertTokens(expected, result);
}

function testViewCommand() {
  var expected = [
    {type: type.TAG, value: 'div'},
    {type: type.TAG_CLOSE},
    {type: type.COMMAND, value: 'view'},
    {type: type.VIEW, value: 'foo.Btn'},
    {type: type.EXPRESSION_VAR_FOREIGN, value: '$blah'},
    {type: type.COMMAND_CLOSE},
    {type: type.TAG_END, value: 'div'}
  ];

  var result = thermo.tmpl.lexer.run('<div>{view foo.Btn $blah}</div>');
  assertTokens(expected, result);
}

function testViewCommand2() {
  var expected = [
    {type: type.TAG, value: 'div'},
    {type: type.TAG_CLOSE},
    {type: type.COMMAND, value: 'if'},
    {type: type.EXPRESSION},
    {type: type.EXPRESSION_VAR_FOREIGN, value: '$foo'},
    {type: type.EXPRESSION_CLOSE},
    {type: type.COMMAND_CLOSE},
    {type: type.COMMAND, value: 'view'},
    {type: type.VIEW, value: 'foo.DropDown'},
    {type: type.EXPRESSION_VAR_FOREIGN, value: '$blah.foo'},
    {type: type.COMMAND_CLOSE},
    {type: type.COMMAND_END, value: 'if'},
    {type: type.TAG_END, value: 'div'}
  ];

  var result = thermo.tmpl.lexer.run(
      '<div>{if $foo}{view foo.DropDown $blah.foo}{/if}</div>');
  assertTokens(expected, result);
}

function assertTokens(expected, result) {
  assertEquals(expected.length, result.length);

  for (var i = 0; i < expected.length; i++) {
    assertEquals('Incorrect token type at index ' + i + '; expected: ' +
        expected[i].type + ' but got: ' + result[i].type,
        expected[i].type, result[i].type);
    assertEquals('Incorrect token value at index ' + i + '; expected: ' +
        expected[i].value + ' but got: ' + result[i].value,
        expected[i].value, result[i].value);
  }
}
