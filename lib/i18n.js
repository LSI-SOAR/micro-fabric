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
		this.nodes = new Map();
		this.initEvents();
		this.initHash();
	}

	initEvents(){
		var rpc = this.rpc;
		rpc.on("fabric-i18n-locale-changed", this.onLocaleChanged.bind(this));
		rpc.dispatch("fabric-i18n-entries", {ident: this.module.ident}, this.fetchEntriesCallback.bind(this));
		rpc.on("fabric-i18n-entry-update", this.onEntryUpdate.bind(this));


		$(document).ready(()=>{
			this.updateText($(document).find("i18n,[i18n]"));
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
		if(result.locale)
			this.onLocaleChanged({locale:result.locale})
		if(result.source)
			this.config.sourceLanguage = result.source;
		if(result.languages)
			this.languages = result.languages;
		this.emit("initialized")
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
		for(let [uuid, node] of this.nodes)
			node.onLocaleChanged && node.onLocaleChanged(args.locale);
	}

	updateText($list){
		if(!$list){
			var win = this.module.win || window;
			if(!win)
				return;
			$list = $(win.document).find("i18n,[i18n]");
		}

		_.each($list, (e) => {
			var $e = $(e);
			var hash = $e.attr("i18n-hash");
			if(!hash) {
				var text = $e.html();
				hash = this.hash(text);
				text = this.translate(text, this.locale, this.module.ident);
				$e.attr("i18n-hash", hash);
				$e.html(text);
			}
			else {
				let o = this.entries[hash];
				if(!o){
					console.error(`i18n Error: no entry exists for hash ${hash}`);
					return
				}
				$e.html(o.locale[this.locale] || o.locale[this.config.sourceLanguage]);
			}
		})
	}
}


module.exports = i18n;