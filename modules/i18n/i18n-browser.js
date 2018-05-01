import '@polymer/polymer/polymer-legacy.js';
import '@polymer/paper-styles/default-theme.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';

const $_documentContainer = document.createElement('div');
$_documentContainer.setAttribute('style', 'display: none;');
$_documentContainer.innerHTML = `
<dom-module id="i18n-browser">
	<template>
		<style include="i18n-style">
			:host{@apply(--layout-fit);@apply(--layout-vertical);margin-right:1px;}
			* { font-family: "Ubuntu"; }
			#content{overflow-y: scroll;overflow-x: hidden;}
			input#search{
				padding: 4px;background: url(images/search.svg) no-repeat scroll 4px 4px;
				background-size: 20px 20px;padding-left:30px;
				border: 0px;border-top: 1px solid #ccc;border-bottom: 1px solid #ccc;margin: 0px;height: 20px;
			}
			.search{@apply(--layout-horizontal);}
			.search .clear{
				position: absolute;right: 0px;top: 2px;
				background: url(images/close.svg) no-repeat scroll 4px 4px;
				background-size: 18px 18px;width: 24px;height: 24px;opacity: 0.5;
			}
			.stats{padding: 4px;}
			.icon{margin:0px 2px;width: 24px;height: 26px;cursor: pointer;background: no-repeat top left scroll;background-size: 24px 24px;}

			i18n-entry{cursor:pointer;}
		</style>
	
		<div class='stats layout horizontal'>
			<div class="flex">
				<div>{{list.length}} Entries ({{filteredCount}} Showing)</div>
				<div>{{totalWords}} Words ({{uniqueWords}} Unique)</div>
			</div>
			<paper-checkbox checked="{{hideTranslated}}" title$="[[_text(hideTranslated, 'Show Translated', 'Hide Translated')]]"></paper-checkbox>
		</div>
		<paper-input placeholder="Search..." value="{{search}}" no-label-float="true">
			<iron-icon icon="search" prefix></iron-icon>
			<paper-icon-button suffix icon="clear" on-tap="clearSearch" title="Clear Search"></paper-icon-button>
		</paper-input>
		<div id="content" class="flex">
			<iron-selector id="selector" selected-item="{{selectedItem}}">
				<template is="dom-repeat" id="listTpl" items="[[list]]" filter="_filter" on-dom-change="onListFilteredChanged">
					<i18n-entry data="{{item}}" editor-languages="[[editorLanguages]]"></i18n-entry>
				</template>
			</iron-selector>
		</div>
	</template>
</dom-module>
`;

document.body.appendChild($_documentContainer);
Polymer({
	is: "i18n-browser",
	properties:{
		filteredCount:{type: Number, value: 0},
		search:{type: String, value:'', observer:"filter"},
		list:{type: Array, value:[], observer:"listChanged"},
		editorLanguages:{type: Array, notify: false},
		selectedItem:{
			type: Number,
			observer: "onSelectedChanged"
		},
		selectedData:{
			type: Object,
			notify: true
		},
		hideTranslated:{
			type: Boolean,
			value: false,
			observer:"filter"
		}
	},
	_text: function(condition, text1, text2){ return condition?text1:text2},
	onListFilteredChanged: function(){
		this.filteredCount = this.$.content.querySelectorAll("i18n-entry").length;
		this.onSelectedChanged();
	},
	onSelectedChanged: function(){
		if(!this.selectedItem){
			this.selectedData = {};
			return
		}
		this.selectedData = this.selectedItem.data;
	},
	cleanText: function(text){return text.replace(/<[^>]*>/g, ' ');},
	getWords: function(text){
		var self = this;
		var text = self.cleanText(text)
			.replace(/&amp;/g,'')
			.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g,'')
			.replace(/\s{2,}/g,' ')
			;
		// console.log(text);
		return _.filter(text.split(' '), function(v){ return !!v;});
	},
	listChanged : function() {
		var self = this;
		self.filter();
		var list = self.list;
		var words = [];
		_.each(list, function(item){
			words = words.concat(self.getWords(item.locale.en));
		});
		self.totalWords = words.length;
		self.uniqueWords = _.unique(words).length;
	},
	isTranslated: function(editorLanguages, item){
		var translated = true;
		_.each(editorLanguages, function(ident){
			if(!item.locale[ident]){
				translated = false;
			}
		});
		return translated;
	},
	clearSearch: function(){this.search = '';},
	_filter: function(item){
		var search = this.search;
		if(!search.length && !this.hideTranslated) {
			return true;
		}
		return (!search.length || item.locale.en.toLowerCase().indexOf(search) != -1)
				&& (!this.hideTranslated || !this.isTranslated(this.editorLanguages, item));
	},
	filter: function() {
		this.$.listTpl.render();
	}
})
