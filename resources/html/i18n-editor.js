import '@polymer/polymer/polymer-legacy.js';
import '@polymer/paper-styles/default-theme.js';
import { Polymer } from '@polymer/polymer/lib/legacy/polymer-fn.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-input/paper-textarea.js';


const $_documentContainer = document.createElement('div');
$_documentContainer.setAttribute('style', 'display: none;');
$_documentContainer.innerHTML = `
<dom-module id="i18n-editor">
	<template>
		<style include="i18n-style">
			:host{background-color: #fff; position:relative;}
			* { font-family: "Ubuntu"; }
			table{width:100%;}
			.lang{text-align:right;padding:4px;white-space:nowrap;}
			.source{padding:8px;font-size:16px;width:95%;}
			#info{margin-top:24px;margin-left:12px;}
			.files{margin-left:12px;}
			#toolbar{width:100%;margin:8px 8px 16px 8px;}
			#logout{float:right;margin-right:16px;}
			#toolbar [disabled]{opacity:0.3}
			#toggleInput::shadow iron-icon{transform:rotateZ(90deg);}
			paper-textarea{ margin-right:25px;font-size:14px !important; }
			paper-textarea::shadow .paper-input-container{background-color:#FFF;padding:0px 2px;}
			paper-textarea::shadow paper-input-container{padding-top:0px;}
			.entext{min-height:20px;}
			.lang-row paper-textarea { padding-top: 10px; }
			paper-textarea[multiline=true] { border: 1px solid red; }
			.select-msg{padding:10px;}
		</style>
		<div id="toolbar">
			<paper-icon-button icon="delete" disabled$="[[!data]]" hidden$="[[!config.isAdmin]]" on-tap="deleteEntry" title="Delete Entry"></paper-icon-button>
			<paper-icon-button id="toggleInput" icon="open-in-new" on-tap="toggleInput" title="Toggle Input"></paper-icon-button>
			<paper-icon-button icon="exit-to-app" id="logout" on-tap="logout" title="Logout"></paper-icon-button>
		</div>
		<br style="clear:both;"/>
		<template is="dom-if" if="{{!data.locale}}">
			<div class="select-msg">Please select text entry.</div>
		</template>
		<template is="dom-if" if="{{data.locale}}">
			<table>
				<tr><td class='lang'>English (en):</td><td class='source'><div class="entext">[[data.locale.en]]</div></td></tr>
				<tr>
					<td class='lang' valign="top">NOTE:</td>
					<td>
						<paper-textarea id="note" no-label-float="true" on-keyup="updateNote" value="{{data.note}}" max-rows="200"></paper-textarea>
					</td>
				</tr>
				<template is="dom-repeat" items="[[editorLanguages]]" as="locale" filter="filterEditorLanguages">
					<tr class='lang-row'>
						<td class='lang'>[[localeName(locale)]] ([[locale]]):</td>
						<td>
							<paper-textarea no-label-float="true" id="[[locale]]" value="[[_data(data, locale)]]" on-keyup="update" max-rows="[[_maxRows(multiline)]]" rows="[[_rows(multiline)]]" multiline$="[[!!multiline]]" on-keydown="checkEnter"></paper-textarea>
							<!--template is="dom-if" if="[[!multiline]]">
								<input id="[[locale]]" type="text" value="{{data.locale[locale]}}" on-keyup="update" style="{{(locale == 'he'||locale=='ar')?'direction:rtl;':''}}" />
							</template>
							<template is="dom-if" if="[[multiline]]">
								<textarea class="input" id="[[locale]]" value="{{data.locale[locale]}}" on-keyup="{{update}}" style="{{(locale == 'he'||locale=='ar')?'direction:rtl;':''}}" ></textarea>
							</template-->
						</td>
					</tr>
				</template>
			</table>
			<div id="info">
				<div>CREATED: <span>[[_toDate(data.ts, data)]]</span></div>
				<div>FILES:</div>
				<div class="files">
					<template is="dom-repeat" items="[[data.files]]">
						<div>{{item}}</div>
					</template>
				</div>
			</div>
		</template>
	</template>
</dom-module>
`;

document.body.appendChild($_documentContainer);

Polymer({
	is: "i18n-editor",
	properties:{
		data:{
			type: Object,
			value: false
		}
	},
	ready : function() {
		/*
		var self = this;
		self.i18n = i18n;
		i18n.rpc.on('update', function(args) {
		if(args.hash == self.data.hash) {
		var input = self.shadowRoot.querySelector('#'+args.locale);
		input && (input.value = args.text);
		}
		});

		i18n.rpc.on('delete', function(args) {
		if(args.hash == self.data.hash) {
		//self.data = false;
		}
		});
		*/
	},
	toJSON : function(v) {return JSON.stringify(v);},
	localeName: function(locale){
		return i18n.languages[locale] || "Missing language";
	},
	_toDate : function(ts) {
		var a = new Date(ts);
		var year = a.getFullYear();
		var month = a.getMonth()+1; month = month < 10 ? '0' + month : month;
		var date = a.getDate(); date = date < 10 ? '0' + date : date;
		var hour = a.getHours(); hour = hour < 10 ? '0' + hour : hour;
		var min = a.getMinutes(); min = min < 10 ? '0' + min : min;
		var sec = a.getSeconds(); sec = sec < 10 ? '0' + sec : sec;
		var time = year + '-' + month + '-' + date + ' ' + hour + ':' + min + ':' + sec;
		return time;
	},
	_data: function(data, locale){return (data.locale && data.locale[locale]) || ""},
	_maxRows: function(multiline){return multiline ? 2000 : 1;},
	_rows: function(multiline){return multiline ? 3 : 1;},
	checkEnter: function(e){
		if(this.multiline || e.which != "13")
			return true

		e.preventDefault();
		e.stopPropagation();
	},
	updateNote: function(e, n, el){
		console.log("TODO SAVE NOTE:")
		i18n.updateNote({
			hash : this.data.hash,
			note: this.data.note
		})
		this.updateEntry("note", this.data.note);
	},
	update : function(e) {
		var el = e.currentTarget;
		this.updateEntry(el.id, el.value);
		i18n.update({
			hash : this.data.hash,
			locale: el.id,
			text: el.value,
			multiline: !!this.multiline
		});
	},

	updateEntry: function(locale, value){
		var data = this.data;
		var entryEl = data.el;
		if(entryEl && entryEl.data.hash == data.hash){
			if(locale=="note"){
				entryEl.set("data.note", value)
			}else{
				entryEl.set("data.locale."+locale, value);
			}
		}
	},

	deleteEntry : function() {
		if(!this.data || !window.confirm("Are you sure you want to delete this entry?")) {
			return
		}
		/*
		i18n.dispatch({
		op : 'delete',
		hash : this.data.hash
		});
		*/
	},
	logout : function() {
		if(confirm("Are you sure you want to logout?")) {
			//window.location.assign('/i18n/logout');
		}
	},
	toggleInput: function(){
		if (!this.data)
			return
		this.multiline = !this.multiline;
	},
	filterEditorLanguages: function(locale){
		return locale != "en";
	}
})



