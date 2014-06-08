goog.provide('thermo.tmpl.render');

goog.require('goog.object');
goog.require('thermo');
goog.require('thermo.Model');
goog.require('thermo.tmpl.parse');

goog.scope(function() {

var render = thermo.tmpl.render;
var parse = thermo.tmpl.parse;


/**
 * Renders a template giving back an element which will observe changes to the
 * data model, schedules DOM updates on the scheduler.
 * @param {string} tmpl The template to render.
 * @param {!Object=} opt_data The data to evaluate the template on.
 * @param {!thermo.View=} opt_parentView The parent view of this template.
 * @return {!render.ElementNode} The top level element of the template.
 */
render.run = function(tmpl, opt_data, opt_parentView) {
  var ast = render.astCache_[tmpl];
  if (!ast) {
    ast = parse.run(tmpl);
    render.astCache_[tmpl] = ast;
  }

  return new render.ElementNode(
      ast, opt_data ? {data: opt_data} : {}, null, opt_parentView || null);
};


/** @private {!Object.<!parse.ElementNode>} */
render.astCache_ = {};



/**
 * A node in the render tree.
 * @constructor
 * @struct
 */
render.Node = function() {};


/** Observes its data, and catches up with any changes. */
render.Node.prototype.observe = goog.abstractMethod;


/** Unobserves its data. */
render.Node.prototype.unobserve = goog.abstractMethod;



/**
 * A node in the DOM render tree.
 * @param {render.DomNode} parent
 * @param {thermo.View} parentView
 * @constructor
 * @struct
 * @extends {render.Node}
 */
render.DomNode = function(parent, parentView) {
  goog.base(this);

  /** @protected {render.DomNode} */
  this.parent = parent;

  /** @protected {thermo.View} */
  this.parentView = parentView;
};
goog.inherits(render.DomNode, render.Node);


/** @return {Node} The first DOM node. */
render.DomNode.prototype.getFirstNode = goog.abstractMethod;


/** @return {!Array.<!Node>} All the DOM nodes. */
render.DomNode.prototype.getNodes = goog.abstractMethod;


/** Removes any DOM nodes from the DOM. */
render.DomNode.prototype.remove = goog.abstractMethod;


/**
 * Inserts a set of children at a node.
 * @param {!render.DomNode} node The node to try and insert the children at.
 * @param {!Array.<!Node>} children The children to insert.
 */
render.DomNode.prototype.insert = goog.abstractMethod;



/**
 * Represents an attribute node on an element.
 * @param {!parse.AttributeNode} node
 * @param {!Object} data
 * @constructor
 * @struct
 * @extends {render.Node}
 */
render.AttributeNode = function(node, data) {
  /** {!parse.AttributeNode} */
  this.node_ = node;

  /** {!Object} */
  this.data_ = data;

  /** @private {!Attr} */
  this.attr_ = document.createAttribute(node.name);

  /** @private {function(): string} */
  this.updateFunc_ = goog.partial(render.evaluateAttr_, node.parts, data);

  /** @private {boolean} */
  this.updateScheduled_ = false;

  /** @private {!Array.<string>} */
  this.observeIds_ = [];
};


/** @override */
render.AttributeNode.prototype.observe = function() {
  // Perform update.
  this.attr_.value = this.updateFunc_();

  // Observe for changes and schedule updates.
  var scheduleDomWrite = goog.bind(this.scheduleDomWrite_, this);
  for (var i = 0; i < this.node_.deps.length; i++) {
    this.observeIds_.push(
        render.observe_(this.data_, this.node_.deps[i], scheduleDomWrite));
  }
};


/** @override */
render.AttributeNode.prototype.unobserve = function() {
  // Unobserve data.
  for (var i = 0; i < this.node_.deps.length; i++) {
    render.unobserve_(this.data_, this.node_.deps[i], this.observeIds_[i]);
  }
  this.observeIds_ = [];
};


/** @return {!Attr} */
render.AttributeNode.prototype.getAttributeNode = function() {
  return this.attr_;
};


/**
 * Schedules a DOM write, if there isn't one already.
 * @private
 */
render.AttributeNode.prototype.scheduleDomWrite_ = function() {
  if (this.updateScheduled_) return;
  this.updateScheduled_ = true;

  thermo.scheduler.requestDomWrite(goog.bind(function() {
    this.updateScheduled_ = false;
    this.attr_.value = this.updateFunc_();
  }, this));
};


/**
 * Returns the content of the attribute node.
 * @param {!Array.<parse.AttrChildren>} nodes The list of attribute children to
 *     evaluate.
 * @param {!Object} data The data to evaluate the nodes on.
 * @return {string} The content of the attribute node.
 * @private
 */
render.evaluateAttr_ = function(nodes, data) {
  var parts = [];
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    if (goog.isString(node)) {
      parts.push(node);
    } else if (node instanceof parse.PrintStmt) {
      parts.push(node.func(data));
    } else if (node instanceof parse.IfStmt) {
      var branch = node.branches[render.evaluateIfStmt_(node, data)];
      if (branch) {
        for (var j = 0; j < branch.children.length; j++) {
          var result = render.evaluateAttr_(branch.children, data);
          if (result) parts.push(result);
        }
      }
    } else {
      goog.asserts.fail('Invalid node for attribute: ' + (typeof node));
    }
  }
  return parts.join('');
};



/**
 * Represents a conditional attribute node on an element. Adds and removes
 * itself from its parent based on a condition.
 * @param {!parse.IfStmt.<!parse.AttributeNode>} node
 * @param {!Object} data
 * @param {!render.ElementNode} parent
 * @constructor
 * @extends {render.Node}
 * @struct
 */
render.ConditionalAttributeNode = function(node, data, parent) {
  /** @private {!parse.IfStmt.<!parse.AttributeNode>} */
  this.node_ = node;

  /** @private {!Object} */
  this.data_ = data;

  /** @private {function(): ?number} */
  this.updateFunc_ = goog.partial(render.evaluateIfStmt_, node, data);

  /** @private {!render.ElementNode} */
  this.parent_ = parent;

  /** @private {!Array.<!Array.<!render.AttributeNode>>} */
  this.branches_ = [];

  // Build up branches.
  for (var i = 0; i < node.branches.length; i++) {
    var branch = node.branches[i];
    this.branches_[i] = [];
    for (var j = 0; j < branch.children.length; j++) {
      var child = branch.children[j];
      goog.asserts.assert(child instanceof parse.AttributeNode,
          'Only one level of if stmts surrounding an attr allowed.');
      this.branches_[i][j] = new render.AttributeNode(child, data);
    }
  }

  /** @private {?number} */
  this.active_ = null;

  /** @private {boolean} */
  this.updateScheduled_ = false;

  /** @private {!Array.<string>} */
  this.observeIds_ = [];
};
goog.inherits(render.ConditionalAttributeNode, render.Node);


/** @override */
render.ConditionalAttributeNode.prototype.observe = function() {
  // Make children observe.
  for (var i = 0; i < this.branches_.length; i++) {
    for (var j = 0; j < this.branches_[i].length; j++) {
      this.branches_[i][j].observe();
    }
  }

  // Update attributes on element.
  this.insertRemoveAttributes_();

  // Observe for changes and schedule updates.
  var scheduleDomWrite = goog.bind(this.scheduleDomWrite_, this);
  for (var i = 0; i < this.node_.deps.length; i++) {
    this.observeIds_.push(
        render.observe_(this.data_, this.node_.deps[i], scheduleDomWrite));
  }
};


/** @override */
render.ConditionalAttributeNode.prototype.unobserve = function() {
  // Unobserve data.
  for (var i = 0; i < this.node_.deps.length; i++) {
    render.unobserve_(this.data_, this.node_.deps[i], this.observeIds_[i]);
  }
  this.observeIds_ = [];

  // Make children unobserve.
  for (var i = 0; i < this.branches_.length; i++) {
    for (var j = 0; j < this.branches_[i].length; j++) {
      this.branches_[i][j].unobserve();
    }
  }
};


/**
 * Schedules a DOM write, if there isn't one already.
 * @private
 */
render.ConditionalAttributeNode.prototype.scheduleDomWrite_ = function() {
  if (this.updateScheduled_) return;
  this.updateScheduled_ = true;

  thermo.scheduler.requestDomWrite(goog.bind(function() {
    this.updateScheduled_ = false;
    this.insertRemoveAttributes_();
  }, this));
};


/**
 * Inserts or removes attributes on the parent element.
 * @private
 */
render.ConditionalAttributeNode.prototype.insertRemoveAttributes_ = function() {
  var active = this.updateFunc_();
  var el = this.parent_.getFirstNode();
  if (active == this.active_) return;

  if (this.active_ != null) {
    var oldActive = this.branches_[this.active_];
    for (var i = 0; i < oldActive.length; i++) {
      el.removeAttributeNode(oldActive[i].getAttributeNode());
    }
  }

  if (active != null) {
    var newActive = this.branches_[active];
    for (var i = 0; i < newActive.length; i++) {
      el.setAttributeNode(newActive[i].getAttributeNode());
    }
  }

  this.active_ = active;
};



/**
 * Represents an element node in the DOM.
 * @param {!parse.ElementNode} node
 * @param {!Object} data
 * @param {render.DomNode} parent
 * @param {thermo.View} parentView
 * @constructor
 * @struct
 * @extends {render.DomNode}
 */
render.ElementNode = function(node, data, parent, parentView) {
  goog.base(this, parent, parentView);

  /** @private {!Element} */
  this.el_ = document.createElement(node.tag);

  /** @private {!Array.<!render.DomNode>} */
  this.children_ = [];

  /**
   * @private {!Array.<!render.AttributeNode|!render.ConditionalAttributeNode>}
   */
  this.attributes_ = [];

  // Add attributes.
  for (var i = 0; i < node.attributes.length; i++) {
    var attr = node.attributes[i];

    if (attr instanceof parse.AttributeNode) {
      this.attributes_.push(new render.AttributeNode(attr, data));
      this.el_.setAttributeNode(this.attributes_[i].getAttributeNode());
    } else if (attr instanceof parse.IfStmt) {
      // ConditionalAttributeNodes automatically add themselves to the element
      // as required.
      this.attributes_.push(
          new render.ConditionalAttributeNode(attr, data, this));
    } else {
      goog.asserts.fail('Invalid node for attribute: ' + (typeof attr));
    }
  }

  // Build up children.
  var nodes = [];
  for (var i = 0; i < node.children.length; i++) {
    var child = node.children[i];
    this.children_[i] =
        new (render.getNodeCtor_(child))(child, data, this, parentView);
    Array.prototype.push.apply(nodes, this.children_[i].getNodes());
  }
};
goog.inherits(render.ElementNode, render.DomNode);


/** @override */
render.ElementNode.prototype.observe = function() {
  // Make children observe & collect nodes.
  var nodes = [];
  for (var i = 0; i < this.children_.length; i++) {
    this.children_[i].observe();
    Array.prototype.push.apply(nodes, this.children_[i].getNodes());
  }

  // Make attributes observe.
  for (var i = 0; i < this.attributes_.length; i++) {
    this.attributes_[i].observe();
  }

  // Reset DOM, remove children.
  var child;
  while ((child = this.el_.firstChild)) {
    this.el_.removeChild(child);
  }

  // Insert all the children into the DOM at once.
  if (nodes.length > 0) {
    this.insert(this.children_[this.children_.length - 1], nodes);
  }
};


/** @override */
render.ElementNode.prototype.unobserve = function() {
  // Make children unobserve.
  for (var i = 0; i < this.children_.length; i++) {
    this.children_[i].unobserve();
  }

  // Make attributes unobserve.
  for (var i = 0; i < this.attributes_.length; i++) {
    this.attributes_[i].unobserve();
  }
};


/** @override */
render.ElementNode.prototype.getFirstNode = function() {
  return this.el_;
};


/** @override */
render.ElementNode.prototype.getNodes = function() {
  return [this.el_];
};


/** @override */
render.ElementNode.prototype.remove = function() {
  if (this.el_.parentNode) this.el_.parentNode.removeChild(this.el_);
};


/** @override */
render.ElementNode.prototype.insert = function(leaf, nodes) {
  var idx = this.children_.indexOf(leaf);
  goog.asserts.assert(idx != -1);

  // Attempt to insert nodes beside a sibling.
  if (render.insertNodes_(this.children_, idx, nodes)) return;

  // If we reached here there aren't any siblings for the nodes, just append to
  // the end.
  for (var i = 0; i < nodes.length; i++) {
    this.el_.appendChild(nodes[i]);
  }
};



/**
 * Represents a text node in the DOM.
 * @param {!parse.TextNode} node
 * @param {!Object} data
 * @param {!render.DomNode} parent
 * @param {thermo.View} parentView
 * @constructor
 * @extends {render.DomNode}
 */
render.TextNode = function(node, data, parent, parentView) {
  goog.base(this, parent, parentView);

  /** @private {!parse.TextNode} */
  this.node_ = node;

  /** @private {!Object} */
  this.data_ = data;

  /** @private {function(): string} */
  this.updateFunc_ = goog.partial(render.evaluateText_, node, data);

  /** @private {!Text} */
  this.text_ = document.createTextNode(this.updateFunc_());

  /** @private {boolean} */
  this.updateScheduled_ = false;

  /** @private {!Array.<string>} */
  this.observeIds_ = [];
};
goog.inherits(render.TextNode, render.DomNode);


/** @override */
render.TextNode.prototype.observe = function() {
  // Update node.
  this.text_.textContent = this.updateFunc_();

  // Observe for changes and schedule updates.
  var scheduleDomWrite = goog.bind(this.scheduleDomWrite_, this);
  for (var i = 0; i < this.node_.deps.length; i++) {
    this.observeIds_.push(
        render.observe_(this.data_, this.node_.deps[i], scheduleDomWrite));
  }
};


/** @override */
render.TextNode.prototype.unobserve = function() {
  // Unobserve data.
  for (var i = 0; i < this.node_.deps.length; i++) {
    render.unobserve_(this.data_, this.node_.deps[i], this.observeIds_[i]);
  }
  this.observeIds_ = [];
};


/** @override */
render.TextNode.prototype.getFirstNode = function() {
  return this.text_;
};


/** @override */
render.TextNode.prototype.getNodes = function() {
  return [this.text_];
};


/** @override */
render.TextNode.prototype.remove = function() {
  if (this.text_.parentNode) this.text_.parentNode.removeChild(this.text_);
};


/**
 * Schedules a DOM write, if there isn't one already.
 * @private
 */
render.TextNode.prototype.scheduleDomWrite_ = function() {
  if (this.updateScheduled_) return;
  this.updateScheduled_ = true;

  thermo.scheduler.requestDomWrite(goog.bind(function() {
    this.updateScheduled_ = false;
    this.text_.textContent = this.updateFunc_();
  }, this));
};


/**
 * Returns the content of the text node.
 * @param {!parse.TextNode} node The text node to evaluate.
 * @param {!Object} data The data to evaluate the statement on.
 * @return {string} The text context of the node.
 * @private
 */
render.evaluateText_ = function(node, data) {
  var parts = [];
  for (var i = 0; i < node.parts.length; i++) {
    var part = node.parts[i];
    if (part instanceof parse.PrintStmt) {
      parts.push(part.func(data));
    } else {
      parts.push(part);
    }
  }

  return parts.join('');
};



/**
 * Represents a IfStmt, observes its condition, adding/removing children from
 * its parent as the active branch in the if statement changes.
 * @param {!parse.IfStmt} node
 * @param {!Object} data
 * @param {!render.DomNode} parent
 * @param {thermo.View} parentView
 * @constructor
 * @extends {render.DomNode}
 */
render.IfStmt = function(node, data, parent, parentView) {
  goog.base(this, parent, parentView);

  /** @private {!parse.IfStmt} */
  this.node_ = node;

  /** @private {!Object} */
  this.data_ = data;

  /** @private {function(): ?number} */
  this.updateFunc_ = goog.partial(render.evaluateIfStmt_, node, data);

  /** @private {!Array.<!Array.<!render.DomNode>>} */
  this.branches_ = [];

  for (var i = 0; i < node.branches.length; i++) {
    var branch = node.branches[i];
    this.branches_[i] = [];
    for (var j = branch.children.length - 1; j >= 0; j--) {
      var child = branch.children[j];
      this.branches_[i][j] =
          new (render.getNodeCtor_(child))(child, data, this, parentView);
    }
  }

  /** @private {?number} */
  this.active_ = this.updateFunc_();

  /** @private {boolean} */
  this.updateScheduled_ = false;

  /** @private {!Array.<string>} */
  this.observeIds_ = [];
};
goog.inherits(render.IfStmt, render.DomNode);


/** @override */
render.IfStmt.prototype.observe = function() {
  // Update the active branch.
  this.active_ = this.updateFunc_();

  // Make children observe.
  for (var i = 0; i < this.branches_.length; i++) {
    for (var j = 0; j < this.branches_[i].length; j++) {
      this.branches_[i][j].observe();
    }
  }

  // Observe for changes and schedule updates.
  var scheduleDomWrite = goog.bind(this.scheduleDomWrite_, this);
  for (var i = 0; i < this.node_.deps.length; i++) {
    this.observeIds_.push(
        render.observe_(this.data_, this.node_.deps[i], scheduleDomWrite));
  }
};


/** @override */
render.IfStmt.prototype.unobserve = function() {
  // Unobserve data.
  for (var i = 0; i < this.node_.deps.length; i++) {
    render.unobserve_(this.data_, this.node_.deps[i], this.observeIds_[i]);
  }
  this.observeIds_ = [];

  // Make children unobserve.
  for (var i = 0; i < this.branches_.length; i++) {
    for (var j = 0; j < this.branches_[i].length; j++) {
      this.branches_[i][j].unobserve();
    }
  }
};


/** @override */
render.IfStmt.prototype.getNodes = function() {
  if (this.active_ != null) {
    var nodes = [];
    var branches = this.branches_[this.active_];
    for (var i = 0; i < branches.length; i++) {
      nodes.push(branches[i].getNodes());
    }
    return Array.prototype.concat.apply([], nodes);
  } else {
    return [];
  }
};


/** @override */
render.IfStmt.prototype.getFirstNode = function() {
  var branch = this.branches_[this.active_];
  if (branch) {
    for (var i = 0; i < branch.length; i++) {
      var node = branch[i].getFirstNode();
      if (node) return node;
    }
  }

  return null;
};


/** @override */
render.IfStmt.prototype.insert = function(leaf, nodes) {
  // Check if the leaf is within a branch which is meant to be in the DOM.
  var branch = this.branches_[this.active_];
  if (!branch) return;

  // Leaf may be from inactive branch.
  var idx = branch.indexOf(leaf);
  if (idx == -1) return;

  // Attempt to insert nodes at this level of the tree.
  if (render.insertNodes_(branch, idx, nodes)) return;

  // If we reached here, there is no place to insert the nodes at this level of
  // the tree, walk up and repeat.
  this.parent.insert(this, nodes);
};


/** @override */
render.IfStmt.prototype.remove = function() {
  var branch = this.branches_[this.active_];
  if (!branch) return;
  for (var i = 0; i < branch.length; i++) {
    branch[i].remove();
  }
};


/**
 * Schedules a DOM write, if there isn't one already.
 * @private
 */
render.IfStmt.prototype.scheduleDomWrite_ = function() {
  if (this.updateScheduled_) return;
  this.updateScheduled_ = true;

  thermo.scheduler.requestDomWrite(goog.bind(function() {
    this.updateScheduled_ = false;
    this.insertRemoveChildNodes_();
  }, this));
};


/** @private */
render.IfStmt.prototype.insertRemoveChildNodes_ = function() {
  // Determine new active branch.
  var active = this.updateFunc_();
  if (active == this.active_) return;

  // Remove old children.
  if (this.active_ != null) {
    var oldActive = this.branches_[this.active_];
    for (var i = 0; i < oldActive.length; i++) {
      oldActive[i].remove();
    }
  }

  // Insert new children.
  if (active != null) {
    var newActive = this.branches_[active];
    var nodes = [];
    for (var i = 0; i < newActive.length; i++) {
      Array.prototype.push.apply(nodes, newActive[i].getNodes());
    }
    this.parent.insert(this, nodes);
  }

  this.active_ = active;
};


/**
 * Returns the index of the branch of the if stmt that should be active.
 * @param {!parse.IfStmt} node The if statement to evaluate.
 * @param {!Object} data The data to evaluate the statement on.
 * @return {?number} The index of the active branch in the statement, if null
 *     none are active.
 * @private
 */
render.evaluateIfStmt_ = function(node, data) {
  for (var i = 0; i < node.branches.length; i++) {
    if (node.branches[i].func(data)) return i;
  }

  return null;
};



/**
 * Represents a ForeachStmt, observes a specified array, adding/removing
 * children from its parent as the array changes.
 * @param {!parse.ForeachStmt} node
 * @param {!Object} data
 * @param {!render.DomNode} parent
 * @param {thermo.View} parentView
 * @constructor
 * @extends {render.DomNode}
 */
render.ForeachStmt = function(node, data, parent, parentView) {
  goog.base(this, parent, parentView);

  /** @private {!Array.<!Array.<!render.DomNode>>} */
  this.children_ = [];

  /** @private {!Array.<!render.DomNode>} */
  this.emptyChildren_ = [];

  /** @private {!parse.ForeachStmt} */
  this.node_ = node;

  /** @private {!Object} */
  this.data_ = data;

  // Find array in data tree.
  var arr = data;
  for (var i = 0; i < node.dep.length; i++) {
    arr = arr[node.dep[i]];
  }

  /** @private {!Array} */
  this.arr_ = arr;
  goog.asserts.assert(goog.isArray(this.arr_));

  /** @private {string} */
  this.observeId_ = '';

  /** @private {string} */
  this.arrayObserveId_ = 'array_' + render.observeUid_++;

  /** @private {boolean} */
  this.updateScheduled_ = false;

  /** @private {boolean} */
  this.arrayUpdateScheduled_ = false;

  /** @private {!Array.<!Object>} */
  this.slices_ = []; // TODO(bfgeek): change type once own array observer.

  // Build up empty children.
  for (var i = node.emptyChildren.length - 1; i >= 0; i--) {
    var child = node.emptyChildren[i];
    this.emptyChildren_[i] =
        new (render.getNodeCtor_(child))(child, data, this, parentView);
  }
};
goog.inherits(render.ForeachStmt, render.DomNode);


/** @override */
render.ForeachStmt.prototype.observe = function() {
  // Update the array as it may have changed.
  var arr = this.data_;
  for (var i = 0; i < this.node_.dep.length; i++) {
    arr = arr[this.node_.dep[i]];
  }
  this.arr_ = arr;
  goog.asserts.assert(goog.isArray(this.arr_));

  // Make empty children observe.
  for (var i = 0; i < this.emptyChildren_.length; i++) {
    this.emptyChildren_[i].observe();
  }

  // Build up children.
  this.children_ = [];
  this.createChildren_();

  // Make children observe.
  for (var i = 0; i < this.children_.length; i++) {
    for (var j = 0; j < this.children_[i].length; j++) {
      this.children_[i][j].observe();
    }
  }

  // Observe for changes and schedule updates.
  this.observeId_ = render.observe_(
      this.data_, this.node_.dep, goog.bind(this.scheduleDomWrite_, this));

  // Observe for array changes and schedule updates.
  thermo.observeArray(this.arr_,
      goog.bind(this.scheduleArrayDomWrite_, this), this.arrayObserveId_);
};


/** @override */
render.ForeachStmt.prototype.unobserve = function() {
  // Unobserve data.
  render.unobserve_(
      this.data_, goog.asserts.assert(this.node_.dep), this.observeId_);
  thermo.unobserveArrayById(this.arrayObserveId_);

  // Make empty children unobserve.
  for (var i = 0; i < this.emptyChildren_.length; i++) {
    this.emptyChildren_[i].unobserve();
  }

  // Make children unobserve.
  for (var i = 0; i < this.children_.length; i++) {
    for (var j = 0; j < this.children_[i].length; j++) {
      this.children_[i][j].unobserve();
    }
  }
};


/**
 * Schedules a DOM write, if there isn't one already.
 * @param {!Array} arr The updated array.
 * @private
 */
render.ForeachStmt.prototype.scheduleDomWrite_ = function(arr) {
  if (this.updateScheduled_) return;
  this.updateScheduled_ = true;

  // Un-observe old array, observe new array. (Safe to reuse id).
  thermo.unobserveArrayById(this.arrayObserveId_);
  thermo.observeArray(
      arr, goog.bind(this.scheduleArrayDomWrite_, this), this.arrayObserveId_);
  this.arr_ = arr;

  thermo.scheduler.requestDomWrite(goog.bind(function() {
    this.updateScheduled_ = false;
    this.insertRemoveChildNodes_();
  }, this));
};


/**
 * Schedules a DOM write, for a partial update (part of the array changed
 * instead of the whole array.
 * @param {!Array.<!Object>} slices The list of slices to apply.
 * @private
 */
render.ForeachStmt.prototype.scheduleArrayDomWrite_ = function(slices) {
  // Keep slices for later.
  Array.prototype.push.apply(this.slices_, slices);
  if (this.arrayUpdateScheduled_ || this.updateScheduled_) return;
  this.arrayUpdateScheduled_ = true;

  thermo.scheduler.requestDomWrite(goog.bind(function() {
    this.arrayUpdateScheduled_ = false;
    this.partialInsertRemoveChildNodes_();
  }, this));
};


/**
 * Performs a full update of the DOM.
 * @private
 */
render.ForeachStmt.prototype.insertRemoveChildNodes_ = function() {
  // Might have reached here before a partial update, clear slices.
  this.slices_ = [];

  // Empty array replaced with empty array, nothing to do.
  if (this.children_.length == 0 && this.arr_.length == 0) return;

  // Remove existing children from the DOM.
  this.removeChildren_();

  // Existing array replaced with empty array, insert empty children.
  if (this.arr_.length == 0) {
    this.insertEmptyChildren_();
    return;
  }

  // Remove empty children (could potentially be a no-op).
  this.removeEmptyChildren_();

  this.insertChildren_();
};


/**
 * Takes all the slices from the partial updates we have observed and applies
 * them to the DOM.
 * @private
 */
render.ForeachStmt.prototype.partialInsertRemoveChildNodes_ = function() {
  // Check if full update ran or if one is scheduled.
  if (this.slices_.length == 0 || this.updateScheduled_) return;
  var slices = this.slices_;
  this.slices_ = []; // Clear slices so we don't forget.

  // Empty array went to empty array! Nothing to do.
  if (this.children_.length == 0 && this.arr_.length == 0) return;

  // Array became empty, remove children & insert empty children.
  if (this.arr_.length == 0) {
    this.removeChildren_();
    this.insertEmptyChildren_();
    return;
  }

  // Array isn't empty anymore, just perform a standard insertion.
  if (this.children_.length == 0) {
    this.removeEmptyChildren_();
    this.insertChildren_();
    return;
  }

  // Loop through slices updates DOM as we go.
  for (var i = 0; i < slices.length; i++) {
    var slice = slices[i];
    var addedCount = slice.addedCount;
    var removed = slice.removed;
    var index = slice.index;

    // First perform removals.
    for (var j = index; j < index + removed.length; j++) {
      for (var k = 0; k < this.children_[j].length; k++) {
        this.children_[j][k].remove();
      }
    }
    this.children_.splice(index, removed.length); // Remove children from array.

    // Perform additions.
    var nodes = [];
    for (var j = index; j < index + addedCount; j++) {
      var data = goog.object.clone(this.data_);
      data[this.node_.localVar] = this.arr_[j];
      this.children_.splice(j, 0, []);

      // Loop over children for this.
      var nodes = [];
      for (var k = 0; k < this.node_.children.length; k++) {
        var child = this.node_.children[k];
        this.children_[j][k] = new (render.getNodeCtor_(child))(
            child, data, this, this.parentView);
        this.children_[j][k].observe();
        Array.prototype.push.apply(nodes, this.children_[j][k].getNodes());
      }
    }

    // Insert into DOM.
    var child = this.children_[index + addedCount - 1];
    if (nodes.length > 0) this.insert(child[child.length - 1], nodes);
  }
};


/** @private */
render.ForeachStmt.prototype.insertEmptyChildren_ = function() {
  var nodes = [];
  for (var i = 0; i < this.emptyChildren_.length; i++) {
    Array.prototype.push.apply(nodes, this.emptyChildren_[i].getNodes());
  }

  // Insert the new children into the DOM. Safe to perform this on the parent.
  this.parent.insert(this, nodes);
};


/** @private */
render.ForeachStmt.prototype.removeEmptyChildren_ = function() {
  for (var i = 0; i < this.emptyChildren_.length; i++) {
    this.emptyChildren_[i].remove();
  }
};


/** @private */
render.ForeachStmt.prototype.insertChildren_ = function() {
  // Build up children.
  this.createChildren_();

  // Makes children observe & collect nodes.
  var nodes = [];
  for (var i = 0; i < this.children_.length; i++) {
    for (var j = 0; j < this.children_[i].length; j++) {
      this.children_[i][j].observe();
      Array.prototype.push.apply(nodes, this.children_[i][j].getNodes());
    }
  }

  // Insert the new children into the DOM. Safe to perform this on the parent.
  this.parent.insert(this, nodes);
};


/**
 * Generates the current children nodes.
 * @private
 */
render.ForeachStmt.prototype.createChildren_ = function() {
  for (var i = 0; i < this.arr_.length; i++) {
    // Add in local var to data.
    var data = goog.object.clone(this.data_);
    data[this.node_.localVar] = this.arr_[i];
    this.children_[i] = [];

    // Loop over children for this pass.
    for (var j = 0; j < this.node_.children.length; j++) {
      var child = this.node_.children[j];
      this.children_[i][j] =
          new (render.getNodeCtor_(child))(child, data, this, this.parentView);
    }
  }
};


/**
 * Removes all the children from the DOM (could be a no-op).
 * @private
 */
render.ForeachStmt.prototype.removeChildren_ = function() {
  for (var i = 0; i < this.children_.length; i++) {
    for (var j = 0; j < this.children_[i].length; j++) {
      this.children_[i][j].remove();
    }
  }
  this.children_ = [];
};


/** @override */
render.ForeachStmt.prototype.getNodes = function() {
  var nodes = [];

  if (this.children_.length > 0) {
    // Non-empty foreach stmt, loop through children.
    for (var i = 0; i < this.children_.length; i++) {
      for (var j = 0; j < this.children_[i].length; j++) {
        Array.prototype.push.apply(nodes, this.children_[i][j].getNodes());
      }
    }
  } else {
    // Empty foreach stmt, loop though empty children.
    for (var i = 0; i < this.emptyChildren_.length; i++) {
      Array.prototype.push.apply(nodes, this.emptyChildren_[i].getNodes());
    }
  }

  return nodes;
};


/** @override */
render.ForeachStmt.prototype.getFirstNode = function() {
  if (this.children_.length > 0) {
    for (var i = 0; i < this.children_.length; i++) {
      for (var j = 0; j < this.children_[i].length; j++) {
        var node = this.children_[i][j].getFirstNode();
        if (node) return node;
      }
    }
  } else {
    for (var i = 0; i < this.emptyChildren_.length; i++) {
      var node = this.emptyChildren_[i].getFirstNode();
      if (node) return node;
    }
  }
  return null;
};


/** @override */
render.ForeachStmt.prototype.insert = function(leaf, nodes) {
  if (this.children_.length > 0) {
    // NOTE(bfgeek): flattening the children like this is inefficient, but can
    // be reworked later.
    var children = Array.prototype.concat.apply([], this.children_);

    // Check that leaf is active, (leaf could be within emptyChildren).
    var idx = children.indexOf(leaf);
    if (idx == -1) return;

    // Attempt to insert nodes at this level of the tree.
    if (render.insertNodes_(children, idx, nodes)) return;
  } else {
    var idx = this.emptyChildren_.indexOf(leaf);
    goog.asserts.assert(idx != -1);

    // Attempt to insert nodes at this level of the tree.
    if (render.insertNodes_(this.emptyChildren_, idx, nodes)) return;
  }

  // If we reached here, there is no place to insert the nodes at this level of
  // the tree, walk up and repeat.
  this.parent.insert(this, nodes);
};


/** @override */
render.ForeachStmt.prototype.remove = function() {
  if (this.children_.length > 0) {
    for (var i = 0; i < this.children_.length; i++) {
      for (var j = 0; j < this.children_[i].length; j++) {
        this.children_[i][j].remove();
      }
    }
  } else {
    for (var i = 0; i < this.emptyChildren_.length; i++) {
      this.emptyChildren_[i].remove();
    }
  }
};



/**
 * Represents a view node in the DOM.
 * @param {!parse.ViewStmt} node
 * @param {!Object} data
 * @param {!render.DomNode} parent
 * @param {thermo.View} parentView
 * @constructor
 * @extends {render.DomNode}
 */
render.ViewStmt = function(node, data, parent, parentView) {
  goog.base(this, parent, parentView);

  /** @private {!parse.ViewStmt} */
  this.node_ = node;

  /** @private {!Object} */
  this.data_ = data;

  // Find the local data object in the data tree.
  var local = data;
  if (node.dep) {
    for (var i = 0; i < node.dep.length; i++) {
      local = local[node.dep[i]];
    }
  }

  /** @private {!Object} */
  this.localData_ = local;

  goog.asserts.assert(this.parentView);

  /** @private {!thermo.View} */
  this.view_ = new (thermo.getViewCtor(node.view))(this.localData_);
  this.parentView.addChildInternal(this.view_);

  /** @private {boolean} */
  this.updateScheduled_ = false;

  /** @private {string} */
  this.observeId_ = '';
};
goog.inherits(render.ViewStmt, render.DomNode);


/** @override */
render.ViewStmt.prototype.observe = function() {
  var local = this.data_;
  if (this.node_.dep) {
    for (var i = 0; i < this.node_.dep.length; i++) {
      local = local[this.node_.dep[i]];
    }
  }

  goog.asserts.assert(this.parentView);

  if (this.localData_ != local) {
    // Cleanup the old view.
    this.parentView.removeChildInternal(this.view_);
    this.remove();

    // Create the new view.
    this.localData_ = local;
    this.view_ = new (thermo.getViewCtor(this.node_.view))(this.localData_);
    this.parentView.addChildInternal(this.view_);
  }

  // Observe for changes and schedule updates.
  if (this.node_.dep) {
    this.observeId_ = render.observe_(
        this.data_, this.node_.dep, goog.bind(this.scheduleDomWrite_, this));
  }
};


/** @override */
render.ViewStmt.prototype.unobserve = function() {
  // Unobserve data.
  if (this.node_.dep) {
    render.unobserve_(
        this.data_, goog.asserts.assert(this.node_.dep), this.observeId_);
  }
};


/** @override */
render.ViewStmt.prototype.getFirstNode = function() {
  return this.view_.getElement();
};


/** @override */
render.ViewStmt.prototype.getNodes = function() {
  return [this.view_.getElement()];
};


/** @override */
render.ViewStmt.prototype.remove = function() {
  var el = this.view_.getElement();
  if (el.parentNode) el.parentNode.removeChild(el);
};


/**
 * Schedules a DOM write, if there isn't one already.
 * @private
 */
render.ViewStmt.prototype.scheduleDomWrite_ = function() {
  if (this.updateScheduled_) return;
  this.updateScheduled_ = true;

  thermo.scheduler.requestDomWrite(goog.bind(function() {
    this.updateScheduled_ = false;
    this.insertRemoveView_();
  }, this));
};


/**
 * Removes the previous view and inserts the new one with updated data.
 * @private
 */
render.ViewStmt.prototype.insertRemoveView_ = function() {
  var local = this.data_;
  for (var i = 0; i < this.node_.dep.length; i++) {
    local = local[this.node_.dep[i]];
  }

  goog.asserts.assert(this.parentView);

  if (this.localData_ != local) {
    // Cleanup the old view.
    this.parentView.removeChildInternal(this.view_);
    this.remove();

    // Create the new view.
    this.localData_ = local;
    this.view_ = new (thermo.getViewCtor(this.node_.view))(this.localData_);
    this.parentView.addChildInternal(this.view_);
    this.parent.insert(this, [this.view_.getElement()]);
  }
};


/**
 * Returns the render node constructor for a given parse node.
 * @param {parse.Children} node The parse node.
 * @return {Function} The node constructor.
 * @private
 */
render.getNodeCtor_ = function(node) {
  if (node instanceof parse.ElementNode) {
    return render.ElementNode;
  } else if (node instanceof parse.TextNode) {
    return render.TextNode;
  } else if (node instanceof parse.IfStmt) {
    return render.IfStmt;
  } else if (node instanceof parse.ForeachStmt) {
    return render.ForeachStmt;
  } else if (node instanceof parse.ViewStmt) {
    return render.ViewStmt;
  } else {
    goog.asserts.fail('Invalid node of ElementNode, ForeachStmt or IfStmt.');
  }
};


/**
 * Inserts a list of DOM nodes in the first render nodes which has an
 * associated element. (A render node may not have an element, for example an
 * IfStmt which currently doesn't have an active branch).
 * @param {!Array.<!render.DomNode>} renderNodes The list of render nodes to try
 *     and insert the DOM nodes in.
 * @param {number} idx The index of the current render node. (Starts checking
 *     for a DOM node to insert in at the next render node in the array).
 * @param {!Array.<!Node>} nodes The list of DOM nodes to insert.
 * @return {boolean} If the DOM nodes were inserted, or would have been inserted
 *     if their sibling was attached to the DOM.
 * @private
 */
render.insertNodes_ = function(renderNodes, idx, nodes) {
  var next = renderNodes[++idx];
  while (next) {
    var sibling = next.getFirstNode();
    if (sibling) {
      if (sibling.parentNode) {
        // sibling in attached to DOM, insert nodes as a sibling.
        for (var i = 0; i < nodes.length; i++) {
          sibling.parentNode.insertBefore(nodes[i], sibling);
        }
      }
      return true;
    }

    // Walk to next render node in array.
    next = renderNodes[++idx];
  }

  // No possibility of inserting to DOM tree here.
  return false;
};


/** @private {number} */
render.observeUid_ = 0;


/**
 * Observes a path on an object. Variables which should be observed must be on
 * an object which extends from {thermo.Model}. Will automatically reobserve the
 * path if part of the sub-path changes.
 * @param {!Object} data The object to observe.
 * @param {!Array.<string>} dep The path to observe for changes.
 * @param {function(T, T)|function(T)} func The function to invoke when a change
 *     occurs in the observed path.
 * @return {string} The id to unobserve with.
 * @template T
 * @private
 */
render.observe_ = function(data, dep, func) {
  var obj = data;
  var id = 'render_' + render.observeUid_++;
  for (var i = 0; i < dep.length - 1; i++) {
    obj = obj[dep[i]];
    if (obj instanceof thermo.Model) {
      obj.observe(dep[i + 1],
          goog.partial(render.reobserve_, dep.slice(i + 2), func, id),
          /* opt_scope */ undefined, id);
    }
  }

  return id;
};


/**
 * Unobserves a path on an object given an id.
 * @param {!Object} data The object to unobserve.
 * @param {!Array.<string>} dep The path to unobserve.
 * @param {string} id The id to unobserve with.
 * @private
 */
render.unobserve_ = function(data, dep, id) {
  var obj = data;
  for (var i = 0; i < dep.length - 1; i++) {
    obj = obj[dep[i]];
    if (obj instanceof thermo.Model) {
      obj.unobserveById(dep[i + 1], id);
    }
  }
};


/**
 * Reobserves a path on an object see render.observe_.
 * @param {!Array.<string>} dep The sub-path to reobserve for changes.
 * @param {function(T, T)|function(T)} func The function to invoke when a change
 *     occurs in the observed path.
 * @param {string} id The id to use for unobserving the original object and for
 *     observing the new object.
 * @param {*} value The new value.
 * @param {*} oldValue The old value.
 * @template T
 * @private
 */
render.reobserve_ = function(dep, func, id, value, oldValue) {
  // Unobserve objects in old path.
  var obj = oldValue;
  for (var i = 0; i < dep.length; i++) {
    if (obj instanceof thermo.Model) {
      obj.unobserveById(dep[i], id);
    }
    obj = obj[dep[i]];
  }

  // Observe objects in new path.
  obj = value;
  for (var i = 0; i < dep.length; i++) {
    if (obj instanceof thermo.Model) {
      // It's safe to reuse 'id'.
      obj.observe(dep[i],
          goog.partial(render.reobserve_, dep.slice(i + 1), func, id),
          /* opt_scope */ undefined, id);
    }
    obj = obj[dep[i]];
  }

  // Invoke original observing function.
  func(value, oldValue);
};

});  // goog.scope
