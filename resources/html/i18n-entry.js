import '@polymer/polymer/polymer-legacy.js';
import '@polymer/paper-styles/default-theme.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';

const $_documentContainer = document.createElement('div');
$_documentContainer.setAttribute('style', 'display: none;');
$_documentContainer.innerHTML = `
<dom-module id="i18n-entry">
	<template>
		<style>
			:host{min-width: 200px;display: block;padding: 5px;border-bottom: 1px solid #ddd;}
			:host(.has-missing){background-color: rgba(255, 0, 0, 0.05);}
			:host(.iron-selected){background-color: #e0ecff; border: 1px solid #000; padding: 4px 4px 5px 4px;}
			.locale{min-height:18px;text-transform:uppercase;margin-top:2px;}
			.locale .mis{background-color: #fa2352;color: #FFF;padding: 1px 2px;font-size: 10px;margin-right:2px;}
			.locale .exist{border:1px solid rgba(204, 204, 204, 0.4);padding:1px 2px;font-size:10px;margin-right:2px;margin-top:2px;display:inline-block;}

		</style>
	
		<div id="text-content">[[data.locale.en]]</div>
		<div class="locale"><template is="dom-repeat" items="[[missing]]"><span class="mis">[[item]]</span></template><template is="dom-repeat" items="[[localesExist]]"><span class="exist">[[item]]</span></template></div>
	</template>
</dom-module>
`;

document.body.appendChild($_documentContainer);

Polymer({
	is: "i18n-entry",
	properties:{
		data:{
			type: Object
		},
		editorLanguages:{
			type: Array
		}
	},
	observers:["dataChanged(data, data.*, editorLanguages, editorLanguages.*)"],
	dataChanged: function(){
		var self = this, data = self.data || {};
		self.missing = [];
		var localesExist = _.keys(data.locale);
		_.each(self.editorLanguages, function(ident){
			if(!data.locale[ident]){
				self.push("missing", ident);
			}
		});

		self.localesExist = _.filter(localesExist, function(a){return self.missing.indexOf(a) < 0; })

		data.el = this;

		self.toggleClass("has-missing", self.missing.length);
	},

	ready : function() {
		var self = this, data = self.data || {};
		/*
		i18n.rpc.on('delete', function(args) {
			if(args.hash == data.hash) {
				self.remove();
				var editor = document.querySelector("i18n-editor");
				if (editor.data && data.hash == editor.data.hash) {
					var entries = document.querySelector("i18n-browser").getEntries();
					if (entries[0]) {
						entries[0].select();
					};
				};
			}
		});
		*/
	},
	isMissing: function(ident){return this.missing.indexOf(ident) > -1;},
	toJSON : function(v) {return JSON.stringify(v);}
})