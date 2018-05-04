import "../../resources/themes/ice.js";
import "../../resources/fonts/icn-icons.js";
import "../../resources/fonts/fa-icons.js";
import "../../resources/components/fabric-toolbar.js";

import "@polymer/polymer/polymer-legacy.js";
import '@polymer/paper-styles/default-theme.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import "@polymer/iron-flex-layout/iron-flex-layout-classes.js";
import "@polymer/paper-drawer-panel/paper-drawer-panel.js";
import "@polymer/paper-material/paper-material.js";
import "@polymer/paper-drawer-panel/paper-drawer-panel.js"
import "@polymer/paper-tabs/paper-tabs.js";
import "@polymer/paper-button/paper-button.js";
import "@polymer/paper-checkbox/paper-checkbox.js";
import "@polymer/neon-animation/neon-animated-pages.js";
import "@polymer/neon-animation/neon-animatable.js";
import "@polymer/neon-animation/neon-animations.js";


import "@polymer/app-layout/app-scroll-effects/app-scroll-effects.js";
import "@polymer/app-layout/app-header/app-header.js";
import "@polymer/app-layout/app-header-layout/app-header-layout.js";
import "@polymer/app-layout/app-drawer/app-drawer.js";
import "@polymer/app-layout/app-drawer-layout/app-drawer-layout.js";
import "@polymer/app-layout/app-toolbar/app-toolbar.js";



import "./i18n-t.js";
import "./i18n-settings.js";
import "./i18n-browser.js";
import "./i18n-entry.js";
import "./i18n-editor.js";
import "./i18n-language-selector.js";


const $_documentContainer = document.createElement('div');
$_documentContainer.setAttribute('style', 'display: none;');
$_documentContainer.innerHTML = `
<dom-module id="i18n-app">
    <template>
        <style include="i18n-style">
            :host {display: block;}
            .nav {overflow-y:auto;box-sizing: border-box;}
            .nav paper-item{cursor:pointer;box-sizing: border-box;}
            paper-toolbar {background-color:#606060;}
            .content {padding: 0 16px;}
            paper-material {min-height: 200px; margin: 16px auto; padding:20px; background-color: #fff;}
            .top-logo-holder{height:100%;}
            .top-toolbar .logo{margin-bottom:0px;transition:all 0.2s ease;}
            .logo{max-height:80%;display:inline-block;margin:15px 0px;}
            neon-animatable{background-color:transparent;padding:10px 0px;}
            #pages{background-color:transparent;}
            .nav .iron-selected.menu,
            .nav [focused].menu{font-weight:normal;background-color:#EEE;}
            .nav .menu:focus:before, .nav .paper-item .menu:focus:before{background-color:transparent;}
            .drawer-top-toolbar .logo{margin-left:auto;margin-right:auto}
            #drawer{top:0px;bottom:0px;}
            @media(min-width:501px){
                .top-toolbar{margin-left:-256px}
                #drawer{top:26px;height:initial}
                .drawer-top-toolbar{display:none;}
                .nav {border-right: 1px solid #ccc;}
            }
            /*@media (min-width:501px) AND (max-width:600px){
                #drawer{top:56px;}
            }*/
            /*@media(max-width:500px){
                #drawer .nav{top:184px}
            }*/
            ::content .layout.horizontal{@apply(--layout-horizontal)}
            ::content .layout.vertical{@apply(--layout-vertical)}
            ::content .flex{@apply(--layout-flex)}
            app-header-layout{height:100vh;}
            app-drawer[opened]+app-header-layout .toggle-btn{display:none}
        }
        </style>

    
        <i18n-settings id="settingDialog" config="{{config}}" entry-animation="scale-up-animation" exit-animation="fade-out-animation" with-backdrop editor-languages="{{editorLanguages}}">
        </i18n-settings>
        <app-drawer-layout id="drawerPanel" responsive-width="500px">
            <app-drawer slot="drawer" id="drawer" opened="{{opened}}">
                <!--app-toolbar class="drawer-top-toolbar">
                    <img class="logo" on-tap="onLogoClick" src="[[logoPath]]" />
                </app-toolbar-->
                <i18n-browser class="nav" list="{{config.entries}}" editor-languages="[[editorLanguages]]" selected-data="{{selectedItemData}}"></i18n-browser>
            </app-drawer>
            <app-header-layout>
                <app-header class="top-toolbar" effects="waterfall" main="" slot="header">
                    <fabric-toolbar drawer-opened$="[[opened]]"
                        on-toggle-drawer="toggleDrawer">
                        <img class="logo" on-tap="onLogoClick" src="[[logoPath]]" />
                        <div class="flex layout vertical center-justified" id="headerBox">
                            <!--h2>Editor</h2-->
                        </div>
                        <paper-icon-button slot="end" icon="settings" on-tap="showSettings"></paper-icon-button>
                    </fabric-toolbar>
                </app-header>

                <i18n-editor editor-languages="[[editorLanguages]]" data="{{selectedItemData}}"></i18n-editor>
            </app-header-layout>
        </app-drawer-layout>
    </template>
</dom-module>`;
document.body.appendChild($_documentContainer);

Polymer({
    is: 'i18n-app',
    properties:{
        config:{
            type: Object
        },
        logoPath:{
            type: String,
            value: "../logo.png"
        }
    },
    ready: function () {
        var self = this;
        self.app = this;
        if(i18n.logoPath){
            self.set("logoPath", i18n.logoPath+"");
        }
        self.set("config", {
            languages: i18n.languages,
            entries: _.map(i18n.entries, function(item, hash){item.hash = hash; return item;}),
            locales: "*",
            editorLanguages: "hi ru",
            isAdmin: true
        })
    },
    showSettings: function(){
        this.$.settingDialog.open();
    },
    toggleDrawer:function(){
        this.$.drawer.toggle()
    }
});

