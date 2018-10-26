const { EventEmitter } = require("events");
const crypto = require('crypto');
const _ = require('underscore');

class i18n extends EventEmitter{
	constructor(module, config) {
		super();
		console.log("constructor i18n")
		this.config = _.extend({
			sourceLanguage: "en"
		}, config);
		this.locale = this.config.sourceLanguage;
		this.module = module;
		this.rpc = this.module.rpc;
		this.entries = {};
		this.initEvents();
		this.initHash();
	}

	initEvents(){
		var me = this;
		me.rpc.on("fabric-i18n-locale-changed", me.onLocaleChanged.bind(me));
		me.rpc.dispatch("fabric-i18n-entries", {ident: me.module.ident}, me.fetchEntriesCallback.bind(me));
		me.rpc.on("fabric-i18n-entry-update", me.onEntryUpdate.bind(me))

		$(document).ready(function(){
			me.updateText($(document).find("i18n,[i18n]"));
		})
	}

	initHash() {

		if(!this.config.hash || this.config.hash == 'fast') {
			this.hash = (str) => {
				var A = 5381,
				B = 9835,
				i    = str.length;
				while(i) {
					var ch = str.charCodeAt(--i);
					A = (A * 33) ^ ch;
					B = (B * 55) ^ ch ^ A;
				}
				A = A >= 0 ? A : (A & 0x7FFFFFFF) + 0x80000000;
				B = B >= 0 ? B : (B & 0x7FFFFFFF) + 0x80000000;
				return A.toString(16)+B.toString(16);
			}
		}
		else {
			this.hash = (str) => {
				return crypto.createHash(this.config.hash).update(str).digest('hex');
			}        
		}
	}

	translate(text, locale = this.locale, module) {

		var hash = this.hash(text);
		var entry = this.entries[hash];
		if(entry) {
			text = entry.locale[locale] || text;
		}
		else {
			var file = '';
			try{
				Error.prepareStackTrace =  function(error, r){
					// @surinder can you see if you can resurrect this?
					/*console.log(r);
					r.forEach((e) => {
						console.log("e:",e);
						var fnBody = e.getFunction().toString();
						if(fnBody.indexOf('_T("'+text+'")')>-1 || fnBody.indexOf("_T('"+text+"')")>-1){
							file = e.getFileName();
						}
						//console.log(e.getFileName() , e.getMethodName(),  e.getFunctionName() );
					});
					*/
				}
				new Error().stack;
				if(file){
					// @asy file = this.getRelativePath(file);
				}
			} catch(e) {
				//console.log(e)
			}

			this.createEntry(text, module, file);
		}

		return text;
	}

	createEntry(text, module, file){
		this.rpc.dispatch("fabric-i18n-create-entry", {text, module, file}); 
	}

	fetchEntriesCallback(error, result){
		console.log("fetchEntriesCallback:error, result", error, result)
		if(error)
			return
		if(result.entries)
			this.entries = result.entries;
	}

	onEntryUpdate(args){
		var entry = this.entries[args.hash];
		if(!entry){
			entry = {locale:{}, hash:args.hash};
			entry.locale[this.config.sourceLanguage] = args.text;
			this.entries[args.hash] = entry;
		}
		entry.locale[args.locale] = args.text;
		entry.multiline = args.multiline;
		var win = this.module.win || window;
		if(!win)
			return
		var $list = $(win.document).find('[i18n-hash="'+args.hash+'"]');
		//console.log("onEntryUpdate", args.text, args)
		this.updateText($list);
	}

	onLocaleChanged(args) {
		this.emit("locale-changed", args.locale);
		this.locale = args.locale;
		this.updateText();
	}

	updateText($list){
		var me = this;
		if(!$list){
			var win = me.module.win || window;
			if(!win)
				return;
			$list = $(win.document).find("i18n,[i18n]");
		}

		_.each($list, (e) => {
			var $e = $(e);
			var hash = $e.attr("i18n-hash");
			if(!hash) {
				var text = $e.html();
				hash = me.hash(text);
				text = me.translate(text, me.locale, me.module.ident);
				$e.attr("i18n-hash", hash);
				$e.html(text);
			}
			else {
				let o = me.entries[hash];
				if(!o){
					console.error(`i18n Error: no entry exists for hash ${hash}`);
					return
				}
				$e.html(o.locale[me.locale] || o.locale[me.config.sourceLanguage]);
			}
		})
	}
}


module.exports = i18n;