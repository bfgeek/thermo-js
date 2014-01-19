goog.provide('thermo.api');

goog.require('thermo');
goog.require('thermo.View');

goog.exportSymbol('thermo.View', thermo.View);
goog.exportProperty(thermo.View.prototype, 'render', thermo.View.prototype.render);
goog.exportProperty(thermo.View.prototype, 'renderBefore', thermo.View.prototype.renderBefore);
goog.exportProperty(thermo.View.prototype, 'remove', thermo.View.prototype.remove);
goog.exportProperty(thermo.View.prototype, 'getElementByClass', thermo.View.prototype.getElementByClass);
goog.exportProperty(thermo.View.prototype, 'getParent', thermo.View.prototype.getParent);
goog.exportProperty(thermo.View.prototype, 'appendChild', thermo.View.prototype.appendChild);
goog.exportProperty(thermo.View.prototype, 'insertChildBefore', thermo.View.prototype.insertChildBefore);
goog.exportProperty(thermo.View.prototype, 'removeChild', thermo.View.prototype.removeChild);
