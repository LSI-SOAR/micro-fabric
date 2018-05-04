import '@polymer/polymer/polymer-legacy.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import {PolymerElement, html} from '@polymer/polymer/polymer-element.js';

/*
class FabricElement extends PolymerElement {
  fire(eventName, detail) {
    this.dispatchEvent(new CustomEvent('toggle-drawer', {detail: detail || {} }));
  }
}
*/

var FabricElement = (superClass) => class extends superClass{
  fire(eventName, detail) {
    this.dispatchEvent(new CustomEvent('toggle-drawer', {detail: detail || {} }));
  }
}

export {PolymerElement, html, FabricElement};
