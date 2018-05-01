import "@polymer/polymer/polymer-legacy.js";
import '@polymer/paper-styles/default-theme.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-menu-button/paper-menu-button.js';

const $_documentContainer = document.createElement('div');
$_documentContainer.setAttribute('style', 'display: none;');
$_documentContainer.innerHTML = `
<dom-module id="i18n-language-selector">
	<template>
		<style>
			:host{display: inline-block;min-width:120px;}
			.display{cursor: pointer;padding: 5px 0px 4px 2px;border-bottom: 1px solid #ccc;}
			.astab{padding: 10px; width: auto !important;}
			.astab .display{border-bottom: 0px;}
			.astab::content #dropdown{margin-top: 48px !important; margin-left:5px; margin-right: 5px; min-width: 140px;}
			paper-item{cursor: pointer;}
		</style>
		<paper-menu-button class="astab" horizontal-align="[[hAlign]]">
			<div slot="dropdown-trigger" class="dropdown-trigger display">
				<iron-icon icon="translate"></iron-icon>
				<span>[[languagetitle]]</span>
			</div>
			<paper-listbox slot="dropdown-content" class="dropdown-content" selected="{{selected}}" attr-for-selected="value">
				<template is="dom-repeat" items="{{language.list}}">
					<paper-item value="[[item.id]]">[[item.name]]</paper-item>
				</template>
			</paper-listbox>
		</paper-menu-button>
	</template>
</dom-module>
`;

document.body.appendChild($_documentContainer);

Polymer({
	is:'i18n-language-selector',
	properties:{
		languagetitle:{
			type: String,
			notify: true
		},
		selected:{
			type: String,
			notify: true,
			value: i18n.locale,
			observer:'onLangChange'
		},
		language:{
			type: Object,
			notify: true,
			observer:'onLangChange'
		},
		hAlign:{
			type:String,
			value: 'right'
		}
	},
	observers:[
		'onLangChange(language.list, language.locale)'
	],
	ready: function(){
		var self = this;
		var langs = []; 
		_.each(i18n.languages, function(name, code){
			langs.push({name, id: code});
		});
		self.set('language', {
			source: i18n.source,
			locale: i18n.locale,
			list: langs
		});

        i18n.nodes.set(this.uuid, this);			
	},
	onLocaleChanged: function(locale){
		this.set('selected', locale);
	},
	attached: function(){
		var self = this;
		if (!self.language || !self.language.list || !self.language.list.length)
			return;
		var list = [].concat(self.language.list);
		self.set('language.list', []);
		self.async(function(){
			self.set('language.list', list);
		}, 1000);
	},
	onLangChange: function(){
		var self = this;
		if (!self.language || !self.language.list.length || !self.selected)
			return;
		var l = _.find(self.language.list, function(o){return o.id == self.selected});
		if (!l)
			return (self.languagetitle = self.selected);
		self.languagetitle = l.name;

		if (self.language.locale != self.selected) {
			i18n.setLocale(self.selected);
			/*var loc = window.location;
			if (self.language.locale == 'en') {
				window.location.href = loc.href.replace(loc.host+'/', loc.host+'/'+self.selected+'/');
			}else{
				window.location.href = loc.href.replace(loc.host+'/'+self.language.locale, loc.host+'/'+self.selected);
			}*/
		};
	},
	toJSON: function(v){
		return JSON.stringify(v);
	}

})

