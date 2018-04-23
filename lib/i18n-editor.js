const { EventEmitter } = require("events");
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const _ = require('underscore');
const utils = require('./utils');

class I18nEditor extends EventEmitter{
	constructor(app, config) {
		super();

		console.log("constructor I18nEditor")

		this.config = Object.assign({
			entriesFile : 'i18n.data',
			configFile : 'i18n.conf',
			sourceLanguage : 'en'
		},config);
		this.locale = this.config.sourceLanguage;
		this.source = this.config.sourceLanguage;
		this.entries = new Map();
		this.app = app;
		this.initEvents();
		this.init();
	}

	async init() {
		this.languages = utils.readJSON(path.join(this.config.dataFolder, 'languages.json')) || { "en" : "English" };		
		await this.restoreEntries(path.join(this.config.dataFolder, this.config.entriesFile));
		this.initHash();
		return this.getT();
	}

	initEvents(){
		var rpc = this.app.rpc;
		rpc.on("fabric-i18n-entries", this.getEntries.bind(this));
		rpc.on("fabric-i18n-create-entry", this.createEntryRequest.bind(this));
	}

	getEntries(args, callback){
		var entries = this.filterEntriesByModule(args.ident);

		callback(null, {entries: entries})
	}

	filterEntriesByModule(module){
		var result = {};

		_.each(this.entries, function(e, hash){
			if(e.modules.indexOf(module) > -1)
				result[hash] = e;
		})

		return result;
	}

	openEditor() {
		var me = this;
		if(this.window)
			throw new Error("i18n Editor is already open");
		
		nw.Window.open('node_modules/micro-fabric/resources/html/index.html', {
			position: 'center',
			width: 901,
			height: 700,
			focus: true
		}, (win) => {
			win.data = { i18n : this }
			win.moveTo(0,0);
			this.window = win;
			console.log("this.window.document", this.window.window.document)
			win.on("close", function(){
				console.log("close i18n editor")
				delete me.window;
				win.close(true);
			})
		});
	}

	closeEditor() {
		this.window.close();
		delete this.window;
	}

	toggleEditor() {
		if(this.window)
			this.closeEditor();
		else
			this.openEditor();
	}

	setLocale(locale) {
		this.locale = locale;
		this.app.rpc.dispatch("fabric-i18n-locale-changed", {locale: locale});
		this.emit("fabric-i18n-locale-changed", {locale: locale})
	}

	getT() {
		return (...args) => { return this._T.apply(this,args); }
	}

	_T(string,...args) {

		if(Array.isArray(string)) {
			var result = [];

			string.forEach((str) => {
				str && result.push(this.translate(str));
				args.length && result.push(args.shift())
			})

			return result.join('');
		}

		return this.translate(string);
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

   	async restoreEntries(file) {

		// console.log("restoring entries from:",file)

        if(!fs.existsSync(file)) {
        	console.log("i18n.data not found, creating...".magenta.bold);
            return;
        }

		return new Promise((resolve, reject) => {

	        fs.readFile(file, { encoding : 'utf8'}, (err, data) => {
	        	if(err) {
	        		console.log("load failed",err,"rejecting")
	        		return reject(err);
	        	}

		        data.split('\n').forEach((l) => {

		            var match = l.match(/^\S{2,}/);
		            if(!match)
		                return;
		            
		            var ident = match.shift();
		            if(!ident)
		                return;

		            var arg = l.substr(ident.length);
		            if(!arg || !arg.length)
		                return;

		            var v = JSON.parse(l.substr(ident.length));
		            ident = ident.split('.');
		            var hash = ident.shift();
		            var e = this.entries[hash];
		            if(!e) {
		                e = this.entries[hash] = { files : [ ], locale : { }, modules:[] }
		            }

		            var prop = ident.shift();
		            if(!prop || !prop.length)
		                return;

		            if(prop == 'module') {
		                e.modules.push(v);
		            }else if(prop == 'file') {
		                e.files.push(v);
		            }else if(prop == 'locale') {
		                var locale = ident.shift();
		                e.locale[locale] = v;
		            }else
		                e[prop] = v;

		            if(!e.hash)
		                return;

		            this.entries.set(e.hash,e);
		        })

		        console.log(`i18n - loaded ${this.entries.size} entries`)

		        return resolve();
		    })
	    })
        

    }

    update(args) {
        var entry = this.entries[args.hash];
        entry.locale[args.locale] = args.text;
        entry.multiline = args.multiline;
        this.storeEntries();
    }

    updateNote(args) {
        var entry = this.entries[args.hash];
        entry.note = args.note;
        this.storeEntries();
    }


	storeEntries() {

	    function PAD(t) { t += ' '; while(t.length < 12) t += ' '; return t; }

        console.log(`i18n - storing ${this.entries.size} entires.`)
        var lines = []

        for(let [hash,e] of this.entries) {

            lines.push(hash+'.');

            _.each(e, function(l, ident) {
                if(ident == 'locale' || ident == 'files' || ident == 'modules')
                    return;
                lines.push(hash+PAD('.'+ident)+JSON.stringify(l));
            })

            for(let l of e.files) {
                lines.push(hash+PAD('.file')+JSON.stringify(l));
            }
            for(let m of e.modules) {
                lines.push(hash+PAD('.module')+ JSON.stringify(m));
            }

            _.each(e.locale, function(l, ident) {
                lines.push(hash+PAD('.locale.'+ident)+JSON.stringify(l));
            })

            lines.push(hash+'.');
        }

        var text = lines.join('\n')+'\n';
        fs.writeFileSync(path.join(this.config.dataFolder, this.config.entriesFile), text);
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

            this.createEntry(text, module, file) && this.storeEntries();
        }

        //if(params) {
        //    text = text.strtr(params);
        //}

        return text;
    }

    createEntryRequest(args){
    	console.log("createEntryRequest", args)
    	this.createEntry(args.text, args.module, args.file);
    	this.storeEntries();
    }

    createEntry(text, module, _file) {
        var hash = this.hash(text);
        var file = _file? _file.replace(/\\/g,'/') : '';

        if (!this.entries.has(hash)) {
            var locale = { }
            locale[this.config.sourceLanguage] = text;

            // var files = file ? [file.replace(core.appFolder, '')] : [];
            var files = file ? [file] : [];

            this.entries.set(hash, {
                hash: hash,
                modules: module ? [module] : [],
                locale: locale,
                original: this.config.sourceLanguage,
                files: files,
                multiline: /\r\n/.exec(text) ? true : false,
                ts : Date.now()
            });

            this.config.debug && console.log(`i18n: Creating new entry:"${text}"`);
            this.flush = true;
            return true;
        }else{
            var entry = this.entries.get(hash);
            // file = file.replace(core.appFolder, '');
            if (file && !_.contains(entry.files, file)) {
                entry.files.push(file);
                this.flush = true;
                return true;
            }

			if (module && !_.contains(entry.modules, module)) {
				entry.modules.push(module);
			}
        }

        return false;
    }
}

module.exports = I18nEditor;