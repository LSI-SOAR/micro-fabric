import '@polymer/polymer/polymer-legacy.js';
import '@polymer/paper-styles/default-theme.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';


import { NeonAnimationRunnerBehavior } from '@polymer/neon-animation/neon-animation-runner-behavior.js';
import { PaperDialogBehavior } from '@polymer/paper-dialog-behavior/paper-dialog-behavior.js';
import '@polymer/paper-dialog-behavior/paper-dialog-shared-styles.js';
import '@polymer/paper-item/paper-item.js';

const $_documentContainer = document.createElement('div');
$_documentContainer.setAttribute('style', 'display: none;');
$_documentContainer.innerHTML = `
<dom-module id="i18n-settings">
	<template>
	<style include="paper-dialog-shared-styles i18n-style">
		:host{height:90%;min-width:300px;@apply(--layout-vertical);}
		#pages{padding-left:0px;padding-right:0px;margin-right:24px;margin-left:24px;}
		neon-animatable{overflow:auto;}
		.lang{position:relative;cursor:pointer;}
		.lang:hover{background-color:#EEE}
		.lang span{position:absolute;right:10px;font-size:10px;text-transform:uppercase;}
		paper-item.lang:focus:before, paper-item.lang:focus:before{background-color:transparent;user-select:none;}
		paper-item.lang.iron-selected{background-color:#DDD;font-weight:normal;}
	</style>
		<paper-tabs selected="{{selected}}" attr-for-selected="page">
			<paper-tab page="editorTab">EDITOR LANGUAGES</paper-tab>
			<paper-tab page="siteTab" hidden$="[[!config.isAdmin]]">SITE LANGUAGES</paper-tab>
		</paper-tabs>
		<neon-animated-pages class="flex" id="pages" selected="[[selected]]" entry-animation="fade-in-animation" exit-animation="fade-out-animation" attr-for-selected="page">
			<neon-animatable page="editorTab">
				<iron-selector selected-values="{{editorLanguages}}" multi attr-for-selected="ident">
					<template is="dom-repeat" items="[[languages]]">
						<paper-item class="lang" ident="[[item.ident]]">[[item.name]]<span>[[item.ident]]</span></paper-item>
					</template>
				</iron-selector>
			</neon-animatable>
			<neon-animatable page="siteTab">
				<iron-selector selected="{{siteLanguages}}" multi attr-for-selected="ident">
					<template is="dom-repeat" items="[[languages]]">
						<paper-item class="lang" ident="[[item.ident]]">[[item.name]]<span>[[item.ident]]</span></paper-item>
					</template>
				</iron-selector>
			</neon-animatable>
		</neon-animated-pages>
	</template>
</dom-module>
`;

document.body.appendChild($_documentContainer);

Polymer({
	is: "i18n-settings",
	properties:{
		selected: {
			type: String,
			value: "editorTab"
		},
		editorLanguages:{type: Array, notify: true, value:[]},
		siteLanguages: Array,
		config:{
			type: Object,
			observer: "onConfigUpdate"
		}
	},
	behaviors: [
	    PaperDialogBehavior,
	    NeonAnimationRunnerBehavior
	],
	/*
	observers: [
		//'onEditorLanguagesChanged(editorLanguages.splices)',
		//'onSiteLanguagesChanged(siteLanguages.splices)'
	],
	setLocale: function(locale){
		var info = JSON.parse(localStorage['i18n'] || "{}");
		info[locale.ident] = locale.editingEnabled;
		localStorage['i18n'] = JSON.stringify(info);
	},
	getlocale: function(ident){
		var info = JSON.parse(localStorage['i18n'] || "{}");
		return info[ident];
	},
	onEditorLanguagesChanged: function(){
		console.log(this.editorLanguages);
	},
	onSiteLanguagesChanged: function(){
		console.log(this.siteLanguages);
	},
	*/
	onConfigUpdate : function() {
		var self = this;
		var config = self.config;
		var languages = [];
		
		var locales = false;
		if (config.locales && config.locales != '*') {
			locales = config.locales.split(' ');
		}

		_.each(config.languages, function(name, ident) {
			if(ident=="en" || (locales && locales.indexOf(ident) < 0)){
				return
			}
			languages.push({name:name, ident:ident});
		});
		if(config.editorLanguages){
			this.set("editorLanguages", config.editorLanguages.split(" "))
		}
		/*
		languages = _.filter(languages, function(l){
			l.editingEnabled = !!self.getlocale(l.ident);
			return (l.ident != 'en');
		});
		*/

		self.languages = languages;
	}
})