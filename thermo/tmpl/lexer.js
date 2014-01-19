/**
 * @fileoverview The template lexer. Given a template string will emit a
 * sequence of tokens to be passed to the parser.
 */
goog.provide('thermo.tmpl.lexer');

goog.require('goog.asserts');


goog.scope(function() {

var lexer = thermo.tmpl.lexer;


/**
 * A rule for the Regex lexer,
 *
 * @typedef {{
 *   rule: !RegExp,
 *   tokens: !Array.<lexer.TokenType>,
 *   push: (!Array.<string>|undefined),
 *   pop: (boolean|undefined)
 * }}
 */
lexer.Rule_;


/**
 * The ruleset for the lexer, mapping of states to a list of rules which apply
 * at that state. There should always be a state 'root' which the lexer starts
 * at.
 *
 * @typedef {Object.<string, Array.<lexer.Rule_>>}
 */
lexer.RuleSet_;


/**
 * A token emitted from the lexer, contains the type of the token and the value
 * extracted from the input.
 *
 * @typedef {{
 *   type: lexer.TokenType,
 *   value: string
 * }}
 */
lexer.Token;


/**
 * The type of token.
 * @enum {number}
 */
lexer.TokenType = {
  TAG: 1,
  TAG_CLOSE: 2,
  TAG_END: 3,
  ATTR: 4,
  ATTR_PART: 5,
  ATTR_END: 6,
  COMMAND: 7,
  COMMAND_CLOSE: 8,
  COMMAND_END: 9,
  EXPRESSION: 10,
  EXPRESSION_VAR_BASIC: 11,
  EXPRESSION_VAR_FOREIGN: 12,
  EXPRESSION_VAR_NUM: 13,
  EXPRESSION_VAR_STRING: 14,
  EXPRESSION_OP: 15,
  EXPRESSION_CLOSE: 16,
  TEXT: 17,
  TEXT_PART: 18,
  TEXT_END: 19,
  PRINT: 20,
  VIEW: 21
};


/**
 * The internal state for the lexer, consists of a stack of states which can be
 * pushed or popped depending on the rule.
 *
 * @typedef {{
 *   states: !Array.<string>,
 *   input: string,
 *   pos: number,
 *   tokens: !Array.<!lexer.Token>
 * }}
 */
lexer.State_;


/**
 * The list of html void tags, I.e. tags which can't contain children.
 * @type {!Array.<string>}
 */
lexer.VOID_TAGS = [
  'area',
  'base',
  'br',
  'col',
  'command',
  'embed',
  'hr',
  'img',
  'input',
  'keygen',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
];


/**
 * The list of void commands, I.e. commands which can't contain children.
 * @type {!Array.<string>}
 */
lexer.VOID_COMMANDS = [
  'ifempty',
  'elseif',
  'else',
  'case',
  'default',
  'view'
];


/**
 * The list of commands.
 * @private {!Array.<string>}
 */
lexer.COMMANDS_ = [
  'foreach',
  'ifempty',
  'if',
  'elseif',
  'else',
  'switch',
  'case',
  'default',
  'view'
];


/**
 * The list of operators in an expression.
 * @private {!Array.<string>}
 */
lexer.OPERATORS_ = [
  '!=',
  '!',
  '\\*',
  '/',
  '%',
  '\\+',
  '-',
  '<=',
  '>=',
  '<',
  '>',
  '==',
  '&&',
  '\\|\\|',
  '\\(',
  '\\)',
  'in'
];


/**
 * The list of basic variables used in expressions.
 * @private {!Array.<string>}
 */
lexer.BASIC_VARS_ = [
  'null',
  'true',
  'false'
];

var type = lexer.TokenType;


/**
 * The ruleset for the lexer. A mapping between lexer states and a list of
 * rules to check while in that state.
 * @private {!lexer.RuleSet_}
 */
lexer.RULES_ = {
  'root': [
    {
      rule: new RegExp('\\s*<(' + lexer.VOID_TAGS.join('|') + ')', 'g'),
      tokens: [type.TAG],
      push: ['tag_def']
    }, // '<hr'
    {
      rule: /\s*<([a-z]+)/g,
      tokens: [type.TAG],
      push: ['tag_or_command_or_text', 'tag_def']
    }, // '<div'
    {
      rule: /\s*/g,
      tokens: [],
      pop: true
    }
  ],
  'tag_def': [
    {
      rule: /\s+([a-zA-Z_:][-a-zA-Z0-9_:.]+)\s*=\s*"/g,
      tokens: [type.ATTR],
      push: ['attr']}, // 'width = "'
    {
      rule: /\s+([a-zA-Z_:][-a-zA-Z0-9_:.]+)/g,
      tokens: [type.ATTR, type.ATTR_END]
    }, // 'async'
    {
      rule: new RegExp('\\s+{(' + lexer.COMMANDS_.join('|') + ')', 'g'),
      tokens: [type.COMMAND],
      push: ['attr_command_outer', 'command_def']
    },
    {
      rule: /\s*\/>/g,
      tokens: [type.TAG_CLOSE],
      pop: true
    }, // '/>'
    {
      rule: /\s*>/g,
      tokens: [type.TAG_CLOSE],
      pop: true
    } // '>'
  ],
  'tag_or_command_or_text': [
    {
      rule: new RegExp('\\s*<(' + lexer.VOID_TAGS.join('|') + ')', 'g'),
      tokens: [type.TAG],
      push: ['tag_def']
    }, // '<hr'
    {
      rule: /\s*<([a-z]+)/g,
      tokens: [type.TAG],
      push: ['tag_or_command_or_text', 'tag_def']}, // '<div'
    {
      rule: /\s*<\/([a-z]+)>/g,
      tokens: [type.TAG_END],
      pop: true
    }, // '</div>'
    {
      rule: /\s*{(view)/g,
      tokens: [type.COMMAND],
      push: ['view_command_def']
    }, // '{view'
    {
      rule: new RegExp('\\s*{(' + lexer.VOID_COMMANDS.join('|') + ')', 'g'),
      tokens: [type.COMMAND],
      push: ['command_def']
    }, // '{elseif'
    {
      rule: new RegExp('\\s*{(' + lexer.COMMANDS_.join('|') + ')', 'g'),
      tokens: [type.COMMAND],
      push: ['tag_or_command_or_text', 'command_def']
    }, // '{if'
    {
      rule: /\s*{\/([a-z]+)}/g,
      tokens: [type.COMMAND_END],
      pop: true
    },
    {
      rule: /\s*(?={[lr]b})/g,
      tokens: [type.TEXT],
      push: ['text']
    },
    {
      rule: /\s*(?={\$)/g,
      tokens: [type.TEXT],
      push: ['text']
    },
    {
      rule: /\s*(?=[^<{])/g,
      tokens: [type.TEXT],
      push: ['text']
    }
  ],
  'attr_command_outer': [
    {
      rule: /\s*([a-zA-Z_:][-a-zA-Z0-9_:.]+)\s*=\s*"/g,
      tokens: [type.ATTR],
      push: ['attr']
    }, // 'width = "'
    {
      rule: /\s*([a-zA-Z_:][-a-zA-Z0-9_:.]+)/g,
      tokens: [type.ATTR, type.ATTR_END]
    }, // 'async'
    {
      rule: /\s*{\/([a-z]+)}/g,
      tokens: [type.COMMAND_END],
      pop: true
    }
  ],
  'attr_command': [
    {
      rule: /{(rb|lb)}/g,
      tokens: [type.COMMAND]
    },
    {
      rule: new RegExp('\\s*{(' + lexer.VOID_COMMANDS.join('|') + ')', 'g'),
      tokens: [type.COMMAND],
      push: ['command_def']
    }, // '{elseif'
    {
      rule: new RegExp('\\s*{(' + lexer.COMMANDS_.join('|') + ')', 'g'),
      tokens: [type.COMMAND],
      push: ['attr_command', 'command_def']
    }, // '{if'
    {
      rule: /{(\$[a-zA-Z]+(?:\.[a-zA-Z]+)*)}/g,
      tokens: [type.PRINT]
    },
    {
      rule: /{\/([a-z]+)}/g,
      tokens: [type.COMMAND_END],
      pop: true
    },
    {
      rule: /(.*?)(?={)/g,
      tokens: [type.ATTR_PART]
    }
  ],
  'attr': [
    {
      rule: /{(rb|lb)}/g,
      tokens: [type.COMMAND]
    },
    {
      rule: new RegExp('{(' + lexer.VOID_COMMANDS.join('|') + ')', 'g'),
      tokens: [type.COMMAND],
      push: ['command_def']
    }, // '{elseif'
    {
      rule: new RegExp('{(' + lexer.COMMANDS_.join('|') + ')', 'g'),
      tokens: [type.COMMAND],
      push: ['attr_command', 'command_def']
    }, // '{if'
    {
      rule: /{(\$[a-zA-Z]+(?:\.[a-zA-Z]+)*)}/g,
      tokens: [type.PRINT]
    },
    {
      rule: /([^"]*?)(?={)/g,
      tokens: [type.ATTR_PART]
    },
    {
      rule: /([^"]+?)(?=")/g,
      tokens: [type.ATTR_PART]
    },
    {
      rule: /"/g,
      tokens: [type.ATTR_END],
      pop: true
    }
  ],
  'text': [
    {
      rule: /{(rb|lb)}/g,
      tokens: [type.COMMAND]
    },
    {
      rule: /{(\$[a-zA-Z]+(?:\.[a-zA-Z]+)*)}/g,
      tokens: [type.PRINT]
    },
    {
      rule: /\s*(?=<)/g,
      tokens: [type.TEXT_END],
      pop: true
    }, // TAG.
    {
      rule: /([^<{]+?)(?=(?:(?:{\$)|(?:{[lr]b})))/g,
      tokens: [type.TEXT_PART]
    },
    {
      rule: /\s*(?={)/g,
      tokens: [type.TEXT_END],
      pop: true
    }, // COMMAND.
    {
      rule: /(.*?)\s*(?=[<{])/g,
      tokens: [type.TEXT_PART]
    }
  ],
  'view_command_def': [
    {
      rule: /\s+([a-zA-Z]+(?:\.[a-zA-Z]+)*)/g,
      tokens: [type.VIEW]
    },
    {
      rule: /\s*(\$[a-zA-Z]+(?:\.[a-zA-Z]+)*)/g,
      tokens: [type.EXPRESSION_VAR_FOREIGN]
    },
    {
      rule: /\s*}/g,
      tokens: [type.COMMAND_CLOSE],
      pop: true
    }
  ],
  'command_def': [
    {
      rule: /\s+(?!})/g,
      tokens: [type.EXPRESSION],
      push: ['expression']
    },
    {
      rule: /\s*}/g,
      tokens: [type.COMMAND_CLOSE],
      pop: true
    }
  ],
  'expression': [
    {
      rule: /\s*(?=})/g,
      tokens: [type.EXPRESSION_CLOSE],
      pop: true
    },
    {
      rule: new RegExp('\\s*(' + lexer.BASIC_VARS_.join('|') + ')', 'g'),
      tokens: [type.EXPRESSION_VAR_BASIC]
    },
    {
      rule: /\s*(-?(?:(?:[0-9]+\.[0-9]+)|(?:(?:0x)?[0-9]+)|(?:\.[0-9]+))(?:e-?[0-9]+)?)/g,
      tokens: [type.EXPRESSION_VAR_NUM]
    },
    {
      rule: /\s*'((?:(?=(\\?))\2.)*?)'/g,
      tokens: [type.EXPRESSION_VAR_STRING]
    },
    {
      rule: /\s*(\$[a-zA-Z]+(?:\.[a-zA-Z]+)*)/g,
      tokens: [type.EXPRESSION_VAR_FOREIGN]
    },
    {
      rule: new RegExp('\\s*(' + lexer.OPERATORS_.join('|') + ')', 'g'),
      tokens: [type.EXPRESSION_OP]
    }
  ]
};


/**
 * Runs the lexer. The lexer is a state machine which has a stack of states.
 * Each state has a list of rules to check upon the current input, if a rule
 * matches it can:
 *  - Push additional states onto the stack.
 *  - Emits a token with an optional value.
 *  - Pops the current state off the stack.
 * The lexer finishes when it doesn't have any states left on the stack.
 *
 * @param {string} input The input to the lexer.
 * @return {!Array.<lexer.Token>} The list of tokens from the lexing operation.
 */
lexer.run = function(input) {
  var state = {
    states: ['root'],
    input: input,
    pos: 0,
    tokens: []
  };

  while (state.states.length > 0) {
    var keepGoing = false;
    var currState = state.states[state.states.length - 1];
    var rules = lexer.RULES_[currState];
    if (!rules) goog.asserts.fail('Invalid state: ' + currState);

    // Check if any of the rules in this state matches.
    for (var i = 0; i < rules.length; i++) {
      keepGoing = lexer.execRule_(rules[i], state);
      if (keepGoing) break;
    }

    // Didn't find a rule which matched in this state.
    if (!keepGoing && state.states.length > 0) {
      goog.asserts.fail('Reached end of rules in state: ' + currState);
    }
  }

  return state.tokens;
};


/**
 * Executes a rule. Checks if it matches the part of the input which we are up
 * to, if so it may:
 *  - Push additional states onto the stack.
 *  - Emits a token with an optional value.
 *  - Pops the current state off the stack.
 *
 * @param {!lexer.Rule_} rule The rule to execute.
 * @param {!lexer.State_} state The current state of the lexer.
 * @return {boolean} If the lexer shouldn't proceed by checking the next rule.
 * @private
 */
lexer.execRule_ = function(rule, state) {
  var re = rule.rule;
  re.lastIndex = state.pos;

  var result = re.exec(state.input);

  // Regex didn't match.
  if (!result) return false;

  // Regex didn't match start of string.
  if (state.pos + result[0].length != re.lastIndex) return false;

  // Push the token onto the list.
  for (var i = 0; i < rule.tokens.length; i++) {
    var token = {type: rule.tokens[i]};
    if (i == 0 && result[1]) {
      token.value = result[1]; // Only add value to first token.
    }
    state.tokens.push(token);
  }

  // Update the current index.
  state.pos = re.lastIndex;

  // Push / Pop any states onto the stack.
  if (rule.pop) {
    state.states.pop();
  } else if (rule.push) {
    Array.prototype.push.apply(state.states, rule.push);
  }

  return true;
};

});  // goog.scope
