import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import {FabricElement, PolymerElement, html} from './fabric-element.js';

class FabricToolbar extends FabricElement(PolymerElement) {
  static get is() { return 'fabric-toolbar' }
  static get properties() {
    return {
      "drawer-opened":{
        type: Boolean,
        value: true
      }
    }
  }

  static get template() {
    return html`
      <style>

        :host {
          @apply --layout-horizontal;
          @apply --layout-center;
          position: relative;
          height: 64px;
          padding: 0 16px;
          /*pointer-events: none;*/
          font-size: var(--app-toolbar-font-size, 20px);
          @apply --fabric-toolbar;
        }

        :host ::slotted(*) {
          pointer-events: auto;
        }

        :host ::slotted(paper-icon-button) {
          /* paper-icon-button/issues/33 */
          font-size: 0;
        }

        :host ::slotted([main-title]),
        :host ::slotted([condensed-title]) {
          pointer-events: none;
          @apply --layout-flex;
        }

        :host ::slotted([bottom-item]) {
          position: absolute;
          right: 0;
          bottom: 0;
          left: 0;
        }

        :host ::slotted([top-item]) {
          position: absolute;
          top: 0;
          right: 0;
          left: 0;
        }

        :host ::slotted([spacer]) {
          margin-left: 64px;
        }
        
        :host paper-icon-button{
          --iron-icon:{
            display:block;
          }
        }
        :host(.maximized) .maximizeBtn,
        .unmaximizeBtn{
          display:none;
        }
        :host(.maximized) .unmaximizeBtn{
          display:inline-block;
        }
      </style>

      <slot></slot>
      <paper-icon-button hidden$="[[drawer-opened]]" icon="menu" on-click="onDrawerBtnTap"></paper-icon-button>
      <paper-icon-button icon="icn:window-close" on-tap="winClose"></paper-icon-button>
      <paper-icon-button icon="icn:window-minimize" on-tap="winMinimize"></paper-icon-button>
      <paper-icon-button class="maximizeBtn" icon="icn:window-maximize" on-tap="winMaximize"></paper-icon-button>
      <paper-icon-button class="unmaximizeBtn" icon="icn:window-restore" on-tap="winUnmaximize"></paper-icon-button>
      <slot name="end"></slot>
    `
  }

  ready() {
    super.ready();
    this.initEvents();
  }

  initEvents(){
    var $el = $(this);
    var win = require('nw.gui').Window.get();
    this.win = win;
    win.on("maximize", function(){
      $el.toggleClass("maximized", true)
    })
    win.on("unmaximize", function(){
      $el.toggleClass("maximized", false)
    })
    win.on("restore", function(){
      $el.toggleClass("maximized", false)
    })
  }
  winClose(){
    this.win.close();
  }
  winMinimize(){
    this.win.minimize();
  }
  winMaximize(){
    this.win.maximize();
  }
  winUnmaximize(){
    this.win.unmaximize();
  }

  onDrawerBtnTap (e) {
    this.fire('toggle-drawer', {e: e});
  }
}

customElements.define(FabricToolbar.is, FabricToolbar);
