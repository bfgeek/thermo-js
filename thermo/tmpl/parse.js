/**
 * @fileoverview The template parser. Takes the output of the lexer and builds
 * the template tree for the rendering engine.
 */
goog.provide('thermo.tmpl.parse');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.functions');
goog.require('thermo.tmpl.lexer');


goog.scope(function() {

var parse = thermo.tmpl.parse;


/**
 * The possible children of an element node or command node.
 * @typedef {
 *   !parse.ElementNode|
 *   !parse.TextNode|
 *   !parse.IfStmt.<parse.Children>|
 *   !parse.ForeachStmt.<parse.Children>|
 *   !parse.ViewStmt
 * }
 */
parse.Children;


/**
 * The possible children of an attribute node.
 * @typedef {
 *   string|
 *   !parse.PrintStmt|
 *   !parse.IfStmt.<parse.AttrChildren>
 * }
 */
parse.AttrChildren;



/**
 * A HTML element node.
 * @param {string} tag The tag of the element.
 * @constructor
 * @struct
 */
parse.ElementNode = function(tag) {
  /** @type {string} */
  this.tag = tag;

  /**
   * @type {!Array.<!parse.AttributeNode|!parse.IfStmt.<!parse.AttributeNode>>}
   */
  this.attributes = [];

  /** @type {!Array.<parse.Children>} */
  this.children = [];
};



/**
 * A HTML text node.
 * @constructor
 * @struct
 */
parse.TextNode = function() {
  /** @type {!Array.<string|!parse.PrintStmt>} */
  this.parts = [];

  /** @type {!Array.<!Array.<string>>} */
  this.deps = [];
};



/**
 * An attribute node on an element node.
 * @param {string} name
 * @constructor
 */
parse.AttributeNode = function(name) {
  /** @type {string} */
  this.name = name;

  /** @type {!Array.<parse.AttrChildren>} */
  this.parts = [];

  /** @type {!Array.<!Array.<string>>} */
  // TODO does this belong here?
  this.deps = [];
};



/**
 * An if statement node.
 * @constructor
 * @template T
 */
parse.IfStmt = function() {
  /** @type {!Array.<!parse.Branch.<T>>} */
  this.branches = [];

  /** @type {!Array.<!Array.<string>>} */
  this.deps = [];
};



/**
 * A branch of an if statement node.
 * @constructor
 * @template T
 */
parse.Branch = function() {
  /** @type {?function(!Object): boolean} */
  this.func = null;

  /** @type {!Array.<T>} */
  this.children = [];
};



/**
 * A print statement.
 * @constructor
 */
parse.PrintStmt = function() {
  /** @type {?function(!Object): string} */
  this.func = null;

  /** @type {!Array.<!Array.<string>>} */
  this.deps = [];
};



/**
 * A foreach statement node.
 * @constructor
 * @template T
 */
parse.ForeachStmt = function() {
  /** @type {!Array.<T>} */
  this.children = [];

  /** @type {!Array.<T>} */
  this.emptyChildren = [];

  /** @type {string} */
  this.localVar = '';

  /** @type {string} */
  this.dataVar = '';

  /** @type {Array.<string>} */
  this.dep = null;
};



/**
 * A view statement node.
 * @constructor
 * @template T
 */
parse.ViewStmt = function() {
  /** @type {string} */
  this.view = '';

  /** @type {Array.<string>} */
  this.dep = null;
};


var TokenType = thermo.tmpl.lexer.TokenType;


/**
 * Parses a given template string, returns the template tree for the rendering
 * engine.
 * @param {string} input The template string.
 * @return {!parse.ElementNode} The template tree.
 */
parse.run = function(input) {
  var tokens = thermo.tmpl.lexer.run(input);

  var token = tokens.shift();
  goog.asserts.assert(token.type == TokenType.TAG);

  // Create the first node, and begin building the tree.
  var node = new parse.ElementNode(token.value);
  parse.inTagDef_(node, tokens);

  return node;
};


/**
 * Parses a tag def, expects either attributes or closing the tag.
 * @param {!parse.ElementNode} node The node which we are currently parsing.
 * @param {!Array.<thermo.tmpl.lexer.Token>} tokens The remaining tokens.
 * @private
 */
parse.inTagDef_ = function(node, tokens) {
  var finished = false;

  while (!finished) {
    var token = tokens.shift();
    switch (token.type) {
      case TokenType.ATTR:
        var attr = new parse.AttributeNode(token.value);
        node.attributes.push(attr);
        parse.inAttr_(attr, tokens);
        break;
      case TokenType.COMMAND:
        if (token.value == 'if') {
          tokens.unshift(token); // Don't consume this token yet.
          var child = new parse.IfStmt();
          node.attributes.push(child);
          parse.inIfCommand_(child, tokens);
        } else if (token.value == 'switch') {
          var child = new parse.IfStmt();
          node.attributes.push(child);
          parse.inSwitchCommand_(child, tokens);
        } else {
          goog.asserts.fail('Invalid command.');
        }
        break;
      case TokenType.TAG_CLOSE:
        // Only parse inside a tag if it isn't void.
        if (!goog.array.contains(thermo.tmpl.lexer.VOID_TAGS, node.tag)) {
          parse.inTag_(node.children, tokens);
        }
        finished = true;
        break;
      default:
        goog.asserts.fail('Invalid token.');
    }
  }
};


/**
 * Parses a tag, expects either more tags or commands.
 * @param {!Array} children The children of the node we are currently parsing.
 * @param {!Array.<thermo.tmpl.lexer.Token>} tokens The remaining tokens.
 * @private
 */
parse.inTag_ = function(children, tokens) {
  var finished = false;

  while (!finished) {
    var token = tokens.shift();
    switch (token.type) {
      case TokenType.TAG:
        var child = new parse.ElementNode(token.value);
        children.push(child);
        parse.inTagDef_(child, tokens);
        break;
      case TokenType.TEXT:
        var child = new parse.TextNode();
        children.push(child);
        parse.inTextNode_(child, tokens);
        break;
      case TokenType.TAG_END:
        finished = true;
        break;
      case TokenType.COMMAND:
        if (token.value == 'if') {
          tokens.unshift(token); // Don't consume this token yet.
          var child = new parse.IfStmt();
          children.push(child);
          parse.inIfCommand_(child, tokens);
        } else if (token.value == 'switch') {
          var child = new parse.IfStmt();
          children.push(child);
          parse.inSwitchCommand_(child, tokens);
        } else if (token.value == 'foreach') {
          var child = new parse.ForeachStmt();
          children.push(child);
          parse.inForeachCommand_(child, tokens);
        } else if (token.value == 'ifempty') {
          // TODO add state assertion, should only happen for foreach children.
          tokens.unshift(token); // Don't consume this token yet.
          finished = true;
        } else if (token.value == 'view') {
          var child = new parse.ViewStmt();
          children.push(child);
          parse.inViewStmt_(child, tokens);
        } else {
          goog.asserts.fail(
              'Unexpected COMMAND token: ' + token.value + ' in tag.');
        }
        break;
      case TokenType.COMMAND_END:
        if (token.value == 'foreach') {
          // TODO add state assertion, should only happen for foreach children.
          finished = true;
        } else {
          goog.asserts.fail(
              'Unexpected COMMAND_END token: ' + token.value + ' in tag.');
        }
        break;
    }
  }
};


/**
 * Parses an attribute, expects either strings, or if statements.
 * @param {!parse.AttributeNode} attr The node which we are currently parsing.
 * @param {!Array.<thermo.tmpl.lexer.Token>} tokens The remaining tokens.
 * @private
 */
parse.inAttr_ = function(attr, tokens) {
  var finished = false;

  while (!finished) {
    var token = tokens.shift();
    switch (token.type) {
      case TokenType.COMMAND:
        if (token.value == 'if') {
          tokens.unshift(token); // Don't consume this token yet.
          var child = new parse.IfStmt();
          attr.parts.push(child);
          parse.inIfCommand_(child, tokens);
        } else if (token.value == 'switch') {
          var child = new parse.IfStmt();
          attr.parts.push(child);
          parse.inSwitchCommand_(child, tokens);
        } else if (token.value == 'rb') {
          attr.parts.push('}');
        } else if (token.value == 'lb') {
          attr.parts.push('{');
        } else {
          // 'for' commands are valid inside of an attibute yet.
          goog.asserts.fail('Invalid command inside of an attribute.');
        }
        break;
      case TokenType.ATTR_PART:
        attr.parts.push(token.value);
        break;
      case TokenType.PRINT:
        var child = new parse.PrintStmt();
        parse.inPrintStmt_(child, token.value);
        attr.parts.push(child);
        break;
      case TokenType.ATTR_END:
        // Fix the deps of the attribute by going through the tree.
        parse.bundleAttrDeps_(attr.parts, attr.deps);
        finished = true;
        break;
    }
  }
};


/**
 * Walks the children of an attr node, collecting all the data deps of the
 * IfSmts and adding them to the deps of the attr node.
 * @param {!Array.<parse.AttrChildren>} children The children of the attr node.
 * @param {!Array.<!Array.<string>>} deps The list of data deps to append to.
 * @private
 */
parse.bundleAttrDeps_ = function(children, deps) {
  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    if (child instanceof parse.IfStmt) {
      // Append deps.
      Array.prototype.push.apply(deps, child.deps);

      // Recurse into the children.
      for (var j = 0; j < child.branches.length; j++) {
        parse.bundleAttrDeps_(child.branches[j].children, deps);
      }
    } else if (child instanceof parse.PrintStmt) {
      // Append deps.
      Array.prototype.push.apply(deps, child.deps);
    }
  }
};


/**
 *
 * @param {!parse.IfStmt} node The node we are currently parsing.
 * @param {!Array.<thermo.tmpl.lexer.Token>} tokens The remaining tokens.
 * @private
 */
parse.inIfCommand_ = function(node, tokens) {
  var finished = false;

  while (!finished) {
    var token = tokens.shift();
    switch (token.type) {
      case TokenType.COMMAND:
        var branch = new parse.Branch();
        node.branches.push(branch);
        parse.inCommandDef_(branch, tokens, node.deps);
        parse.inCommandBranch_(branch, tokens);
        break;
      case TokenType.COMMAND_END:
        finished = true;
        break;
    }
  }
};


/**
 *
 * @param {!parse.IfStmt} node The node we are currently parsing.
 * @param {!Array.<thermo.tmpl.lexer.Token>} tokens The remaining tokens.
 * @private
 */
parse.inSwitchCommand_ = function(node, tokens) {
  var finished = false;

  var token = tokens.shift();
  goog.asserts.assert(token.type == TokenType.EXPRESSION);

  token = tokens.shift();
  goog.asserts.assert(token.type == TokenType.EXPRESSION_VAR_FOREIGN);
  parse.addDeps_(node.deps, parse.createDeps_(token.value));
  var variable = token.value.substring(1);

  token = tokens.shift();
  goog.asserts.assert(token.type == TokenType.EXPRESSION_CLOSE);

  token = tokens.shift();
  goog.asserts.assert(token.type == TokenType.COMMAND_CLOSE);

  var seenDefaultLast = false;

  while (!finished) {
    token = tokens.shift();
    switch (token.type) {
      case TokenType.COMMAND:
        seenDefaultLast = (token.value == 'default');
        var branch = new parse.Branch();
        node.branches.push(branch);
        parse.inCommandDef_(branch, tokens, [], variable);
        parse.inCommandBranch_(branch, tokens);
        break;
      case TokenType.COMMAND_END:
        finished = true;
        break;
    }
  }

  goog.asserts.assert(seenDefaultLast);
};


/**
 * TODO
 * @param {!parse.PrintStmt} node ...
 * @param {string} value ...
 * @private
 */
parse.inPrintStmt_ = function(node, value) {
  node.func = parse.createPrintFunc_(value);
  parse.addDeps_(node.deps, parse.createDeps_(value));
};


/**
 * TODO
 * @param {!parse.ForeachStmt} node ...
 * @param {!Array.<thermo.tmpl.lexer.Token>} tokens The remaining tokens.
 * @private
 */
parse.inForeachCommand_ = function(node, tokens) {
  var token = tokens.shift();
  goog.asserts.assert(token.type == TokenType.EXPRESSION);

  token = tokens.shift();
  goog.asserts.assert(token.type == TokenType.EXPRESSION_VAR_FOREIGN);
  node.localVar = token.value.substring(1);

  token = tokens.shift();
  goog.asserts.assert(token.type == TokenType.EXPRESSION_OP);
  goog.asserts.assert('in', token.value);

  token = tokens.shift();
  goog.asserts.assert(token.type == TokenType.EXPRESSION_VAR_FOREIGN);
  node.dep = parse.createDeps_(token.value);

  token = tokens.shift();
  goog.asserts.assert(token.type == TokenType.EXPRESSION_CLOSE);

  token = tokens.shift();
  goog.asserts.assert(token.type == TokenType.COMMAND_CLOSE);

  parse.inTag_(node.children, tokens);

  if (tokens[0].type == TokenType.COMMAND) {
    token = tokens.shift();
    goog.asserts.assert('ifempty', token.value);
    parse.inTag_(node.emptyChildren, tokens);
  }
};


/**
 * Parses a command definition, expectes either an expression, or nothing.
 * @param {!parse.Branch} node The branch node of a statement.
 * @param {!Array.<thermo.tmpl.lexer.Token>} tokens The remaining tokens.
 * @param {!Array.<!Array.<string>>} deps The list of data deps for this
 *     statement.
 * @param {string=} opt_variable For switch statements, the variable to test
 *     equality with.
 * @private
 */
parse.inCommandDef_ = function(node, tokens, deps, opt_variable) {
  var finished = false;

  node.func = goog.functions.TRUE;

  while (!finished) {
    var token = tokens.shift();
    switch (token.type) {
      case TokenType.EXPRESSION:
        parse.inExpression_(node, tokens, deps, opt_variable);
        break;
      case TokenType.COMMAND_CLOSE:
        finished = true;
        break;
    }
  }
};


/**
 * Parses a branch of a command, expects either:
 *  - A command, tag,
 *  - TODO
 * @param {!parse.Branch} node The branch node of a statement.
 * @param {!Array.<thermo.tmpl.lexer.Token>} tokens The remaining tokens.
 * @private
 */
parse.inCommandBranch_ = function(node, tokens) {
  var finished = false;

  while (!finished) {
    var token = tokens.shift();
    switch (token.type) {
      case TokenType.COMMAND:
        if (token.value == 'if') {
          tokens.unshift(token); // Don't consume this token yet.
          var child = new parse.IfStmt();
          node.children.push(child);
          parse.inIfCommand_(child, tokens);
        } else if (token.value == 'switch') {
          var child = new parse.IfStmt();
          node.children.push(child);
          parse.inSwitchCommand_(child, tokens);
        } else if (token.value == 'foreach') {
          var child = new parse.ForeachStmt();
          node.children.push(child);
          parse.inForeachCommand_(child, tokens);
        } else if (token.value == 'lb') {
          // TODO add state assertion.
          node.children.push('{');
        } else if (token.value == 'rb') {
          // TODO add state assertion.
          node.children.push('}');
        } else if (token.value == 'view') {
          var child = new parse.ViewStmt();
          node.children.push(child);
          parse.inViewStmt_(child, tokens);
        } else {
          // Must be a void command.
          goog.asserts.assert(goog.array.contains(
              thermo.tmpl.lexer.VOID_COMMANDS, token.value));

          // We've finished this branch, unconsume and finish.
          tokens.unshift(token);
          finished = true;
        }
        break;
      case TokenType.ATTR:
        // TODO add state assertion.
        var attr = new parse.AttributeNode(token.value);
        node.children.push(attr);
        parse.inAttr_(attr, tokens);
        break;
      case TokenType.TAG:
        // TODO add state assertion.
        var child = new parse.ElementNode(token.value);
        node.children.push(child);
        parse.inTagDef_(child, tokens);
        break;
      case TokenType.TEXT:
        // TODO add state assertion.
        var child = new parse.TextNode();
        node.children.push(child);
        parse.inTextNode_(child, tokens);
        break;
      case TokenType.ATTR_PART:
        // TODO add state assertion.
        node.children.push(token.value);
        break;
      case TokenType.PRINT:
        // TODO add state assertion. (if we are in an attribute or tag etc).
        var child = new parse.PrintStmt();
        parse.inPrintStmt_(child, token.value);
        node.children.push(child);
        break;
      case TokenType.COMMAND_END:
        tokens.unshift(token);
        finished = true;
        break;


    }
  }
};


/**
 * Parses a text node, expects either a TEXT_PART or a PRINT statement.
 * @param {!parse.TextNode} node The text node.
 * @param {!Array.<thermo.tmpl.lexer.Token>} tokens The remaining tokens.
 * @private
 */
parse.inTextNode_ = function(node, tokens) {
  var finished = false;

  while (!finished) {
    var token = tokens.shift();
    switch (token.type) {
      case TokenType.COMMAND:
        if (token.value == 'rb') {
          node.parts.push('}');
        } else if (token.value == 'lb') {
          node.parts.push('{');
        } else {
          goog.asserts.fail('Invalid command for text node: ' + token.value);
        }
        break;
      case TokenType.PRINT:
        var child = new parse.PrintStmt();
        parse.inPrintStmt_(child, token.value);
        node.parts.push(child);

        // Add deps here instead of later as a node can only be 1 level deep.
        Array.prototype.push.apply(node.deps, child.deps);
        break;
      case TokenType.TEXT_PART:
        node.parts.push(token.value);
        break;
      case TokenType.TEXT_END:
        finished = true;
        break;
      default:
        goog.asserts.fail('Invalid token.');
        break;
    }
  }
};


/**
 * Parses an expression, expectes a sequence of expression tokens.
 * @param {!parse.Branch} node The branch node of a statement.
 * @param {!Array.<thermo.tmpl.lexer.Token>} tokens The remaining tokens.
 * @param {!Array.<!Array.<string>>} deps The list of data deps for this
 *     statement.
 * @param {string=} opt_variable For switch statements, the variable to test
 *     equality with.
 * @private
 */
parse.inExpression_ = function(node, tokens, deps, opt_variable) {
  var finished = false;

  // NOTE: this is a complete hack and should be rewritten.
  var parts = [];
  while (!finished) {
    var token = tokens.shift();
    switch (token.type) {
      case TokenType.EXPRESSION_OP:
      case TokenType.EXPRESSION_VAR_BASIC:
      case TokenType.EXPRESSION_VAR_NUM:
        parts.push(token.value);
        break;
      case TokenType.EXPRESSION_VAR_STRING:
        parts.push('\'' + token.value + '\'');
        break;
      case TokenType.EXPRESSION_VAR_FOREIGN:
        var foreign = token.value.substring(1); // strip leading '$'.
        parse.addDeps_(deps, foreign.split('.'));
        parts.push('data.' + foreign);
        break;
      case TokenType.EXPRESSION_CLOSE:
        finished = true;
        break;
    }
  }

  // NOTE: this is horrible.
  if (opt_variable) {
    node.func = /** @type {function(!Object): boolean} */ (eval(
        '(function(data) { return data.' + opt_variable +
            ' == ' + parts.join(' ') + '; })'));
  } else {
    node.func = /** @type {function(!Object): boolean} */ (eval(
        '(function(data) { return ' + parts.join(' ') + '; })'));
  }
};


/**
 * Parses a view command.
 * @param {!parse.ViewStmt} node The node we are currently parsing.
 * @param {!Array.<thermo.tmpl.lexer.Token>} tokens The remaining tokens.
 * @private
 */
parse.inViewStmt_ = function(node, tokens) {
  var token = tokens.shift();
  goog.asserts.assert(token.type == TokenType.VIEW);
  node.view = token.value;

  token = tokens.shift();
  switch (token.type) {
    case TokenType.EXPRESSION_VAR_FOREIGN:
      node.dep = parse.createDeps_(token.value);
      token = tokens.shift();
      goog.asserts.assert(token.type == TokenType.COMMAND_CLOSE);
      break;
    default:
      goog.asserts.assert(token.type == TokenType.COMMAND_CLOSE);
      break;
  }
};


/**
 * Creates a print function.
 * @param {string} value The value to print.
 * @return {function(!Object): string} The print function.
 * @private
 */
parse.createPrintFunc_ = function(value) {
  return /** @type {function(!Object): string} */ (eval(
      '(function(data) { return data.' + value.substring(1) + '; })'));
};


/**
 * Creates a deps path for a node.
 * @param {string} value The value to calculate the deps from.
 * @return {!Array.<string>} The deps.
 * @private
 */
parse.createDeps_ = function(value) {
  return value.substring(1).split('.'); // strip leading '$'.
};


/**
 * Adds a list of deps to a separated array for easy watching.
 * @param {!Array.<!Array.<string>>} arr The deps list to add to.
 * @param {!Array.<string>} dep The list of deps to add.
 * @private
 */
parse.addDeps_ = function(arr, dep) {
  var found = false;
  var joinedDep = dep.join('.');
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].join('.') == joinedDep) {
      found = true;
      break;
    }
  }

  if (!found) {
    arr.push(dep);
  }
};

});  // goog.scope
