goog.provide('thermo.View');

goog.require('thermo');
goog.require('thermo.tmpl.render');



/**
 * @param {!Object=} opt_data
 * @param {string=} opt_tmpl
 * @constructor
 * @export
 */
thermo.View = function(opt_data, opt_tmpl) {
  /** @private {!Object|undefined} */
  this.tmplData_ = opt_data;

  /** @private {string|undefined} */
  this.tmpl_ = opt_tmpl;

  /** @private {thermo.View} */
  this.parent_ = null;

  /** @private {!Array.<!thermo.View>} */
  this.children_ = [];

  /** @private {thermo.tmpl.render.ElementNode} */
  this.renderNode_ = null;

  /** @private {boolean} */
  this.attached_ = false;

  /** @private {!Element} */
  this.element_ = this.createDom();
};


/**
 * Renders the view with a parent.
 * @param {!Element} parentEl The parent element to attach to.
 * @export
 */
thermo.View.prototype.render = function(parentEl) {
  this.onAttach_();

  // Schedule write to add to DOM.
  thermo.scheduler.requestDomWrite(goog.bind(function() {
    parentEl.appendChild(this.getElement());
    thermo.events.addRoot(this.getElement());
  }, this));
};


/**
 * Renders the view before a sibling element.
 * @param {!Element} siblingEl The sibling to attach next to.
 * @export
 */
thermo.View.prototype.renderBefore = function(siblingEl) {
  this.onAttach_();

  // Schedule write to add to DOM.
  thermo.scheduler.requestDomWrite(goog.bind(function() {
    goog.asserts.assert(siblingEl.parentNode);
    siblingEl.parentNode.insertBefore(this.getElement(), siblingEl);
    thermo.events.addRoot(this.getElement());
  }, this));
};


/**
 * Removes the view from the DOM.
 * @export
 */
thermo.View.prototype.remove = function() {
  this.onDetach_();

  // Schedule write to remove from DOM.
  thermo.scheduler.requestDomWrite(goog.bind(function() {
    var el = this.getElement();
    goog.asserts.assert(el.parentNode);
    el.parentNode.removeChild(el);
    thermo.events.removeRoot(this.getElement());
  }, this));
};


/**
 * @return {!Element}
 * @export
 */
thermo.View.prototype.getElement = function() {
  return this.element_;
};


/**
 * @param {string} className The class name of the element.
 * @return {Element}
 * @export
 */
thermo.View.prototype.getElementByClass = function(className) {
  return this.element_ ?
      this.element_.getElementsByClassName(className)[0] : null;
};


/**
 * @return {thermo.View}
 * @export
 */
thermo.View.prototype.getParent = function() {
  return this.parent_;
};


/**
 * @protected @return {!Element}
 * @export
 */
thermo.View.prototype.createDom = function() {
  this.renderNode_ =
      thermo.tmpl.render.run(this.getTemplate(), this.tmplData_, this);
  return /** @type {!Element} */ (this.renderNode_.getFirstNode());
};


/**
 * @return {string}
 * @export
 */
thermo.View.prototype.getTemplate = function() {
  return goog.asserts.assert(this.tmpl_);
};


/**
 * Appends a child to this view. Optionally takes a parent element within this
 * view to append to, otherwise it will be appended to the top level element of
 * this view.
 * @param {!thermo.View} child The child to add.
 * @param {!Element=} opt_element The element within this view to append to.
 * @export
 */
thermo.View.prototype.appendChild = function(child, opt_element) {
  var el = opt_element || this.getElement();
  goog.asserts.assert(thermo.View.isDescendant_(this.getElement(), el));

  this.addChildInternal(child);

  // Schedule write to add to DOM.
  thermo.scheduler.requestDomWrite(function() {
    el.appendChild(child.getElement());
  });
};


/**
 * Inserts a child into the DOM of this view. Takes a sibling element which it
 * should be inserted before.
 * @param {!thermo.View} child The child to add.
 * @param {!Element} sibling The element to insert the child before.
 * @export
 */
thermo.View.prototype.insertChildBefore = function(child, sibling) {
  goog.asserts.assert(thermo.View.isDescendant_(this.getElement(), sibling) &&
      this.getElement() != sibling);

  this.addChildInternal(child);

  // Schedule write to add to DOM.
  thermo.scheduler.requestDomWrite(function() {
    if (sibling.parentNode) {
      sibling.parentNode.insertBefore(child.getElement(), sibling);
    }
  });
};


/**
 * Adds a child to this view. Doesn't perform any DOM manipulations. Should only
 * be used within the framework.
 * @param {!thermo.View} child The child to add.
 */
thermo.View.prototype.addChildInternal = function(child) {
  // Add links between parent and child.
  this.children_.push(child);
  goog.asserts.assert(child.parent_ == null);
  child.parent_ = this;

  // Attach the child.
  if (this.attached_) child.onAttach_();
};


/**
 * Checks if the parent contains (or is) the given node.
 * @param {!Element} parent
 * @param {!Element} node
 * @return {boolean} If the parent contains (or is) the node.
 * @private
 */
thermo.View.isDescendant_ = function(parent, node) {
  while (node != document.body) {
    if (node == parent) return true;
    node = /** @type {!Element} */ (node.parentNode);
  }
};


/**
 * Remove a child from this view.
 * @param {!thermo.View} child The child to remove.
 * @export
 */
thermo.View.prototype.removeChild = function(child) {
  this.removeChildInternal(child);
  var el = child.getElement();
  goog.asserts.assert(el.parentNode);

  // Schedule write to remove from DOM.
  thermo.scheduler.requestDomWrite(function() {
    el.parentNode.removeChild(el);
  });
};


/**
 * Removes a child from this view. Doesn't perform any DOM manipulations. Should
 * only be used within the framework.
 * @param {!thermo.View} child The child to remove.
 */
thermo.View.prototype.removeChildInternal = function(child) {
  var idx = this.children_.indexOf(child);
  goog.asserts.assert(idx != -1);

  // Remove links between parent and child.
  this.children_.splice(idx, 1);
  goog.asserts.assert(child.parent_ == this);
  child.parent_ = null;

  // Detach the child.
  if (this.attached_) child.onDetach_();
};


/** @private */
thermo.View.prototype.onAttach_ = function() {
  this.attached_ = true;

  if (this.renderNode_) this.renderNode_.observe();

  for (var i = 0; i < this.children_.length; i++) {
    this.children_[i].onAttach_();
  }
};


/** @private */
thermo.View.prototype.onDetach_ = function() {
  this.attached_ = false;

  if (this.renderNode_) this.renderNode_.unobserve();

  for (var i = 0; i < this.children_.length; i++) {
    this.children_[i].onDetach_();
  }
};


/** @return {boolean} If the view is attached for testing. */
thermo.View.prototype.isAttachedDebugDebug = function() {
  return this.attached_;
};
