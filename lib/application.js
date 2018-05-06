const os = require('os');
const Module = require('./module');
const Network = require('./network');
const utils = require('./utils');
const I18nEditor = require('./i18n-editor');
const _ = require('underscore');
const path = require('path');

class Application extends Module {
	constructor(options_ = { }) {
		
		var options = Object.assign({ 
			moduleFolder : options_.moduleFolder,
			configPath : 'config'
		}, options_);


		if(!options.ident)
			throw new Error("µFabric::Module - module config object must provide 'ident' field");

		let defaults = {
			ctorInit : false,
			ident : options.ident,
			//ws : { port : 8080 },
			
		};

		if(options.nats)
			defaults.nats = Object.assign({
				reconnectTimeWait : 20,
				maxReconnectAttempts : -1
			}, options.nats, {
				url : 'nats://localhost:'+options.nats.port, 
				ident : options.ident+'-app-nats', 
			})

		if(options.stan)
			defaults.stan = Object.assign({ 
				reconnectTimeWait : 20,
				maxReconnectAttempts : -1,
				maxPubAcksInflight : 65535				
			}, options.stan, { 
				url : 'nats://localhost:'+options.stan.port, 
				cluster : 'microfabric', 
				ident : options.ident+'-app-stan', 
			})


		let config = { }

		if(options.configPath) {
			config = utils.getConfig(path.join(options.moduleFolder,options.configPath,options.ident), defaults);
		}
		else {
			config = Object.assign(options,defaults);
		}

		super(config);

		this.appFolder = options.appFolder;

		let BIN = path.join(__dirname,'../bin')
		let NATS = '';
		let STAN = '';
		let PLATFORM = '';
		switch(os.platform()) {
			case 'win32' : {
				PLATFORM = 'windows';
				NATS = 'nats/gnatsd.exe';
				STAN = 'stan/nats-streaming-server.exe';
			} break;
			case 'darwin' : {
				PLATFORM = 'darwin';
				NATS = 'nats/gnatsd'
				STAN = 'stan/nats-streaming-server'
			} break;
			case 'linux' : {
				PLATFORM = 'linux'
				NATS = 'nats/gnatsd'
				STAN = 'stan/nats-streaming-server'
			} break;
		}

		this.proc = { }

		if(options.nats)
			this.proc.nats = new utils.Process({ 
				descr : this.ident+' - application NATS instance',
				args : [ path.join(BIN,PLATFORM,NATS), '--port', this.config.nats.port ],
				options : { cwd : BIN },
			})

		if(options.stan)
			this.proc.stan = new utils.Process({ 
				descr : this.ident+' - application STAN instance',
				args : [ path.join(BIN,PLATFORM,STAN), '--port', this.config.stan.port, 
				//'-cid', this.config.stan.cluster ],
				'--cluster_id', this.config.stan.cluster ],
				options : { cwd : BIN },
			})
		
		options.nats && this.proc.nats.run();
		options.stan && this.proc.stan.run();
		// console.log("CONFIG -> ",this.config)
		if(this.config.proxy_server) {

			if(this.config.proxy_server.ws) {
	//			console.log("RUNNING PROXY SERVER")
				this.proxy_server = { 
					ws : new Network.WebSocketProxyServer(this.config.proxy_server.ws) 
				}
			}
			else if(this.config.proxy_server.socketio) {
	//			console.log("RUNNING PROXY SERVER")
				this.proxy_server = { 
					socketio : new SocketIOProxyServer(this.config.proxy_server.socketio) 
				}
			}
		}

		dpc(()=>{
			this.initModule_();
		})

		this.init((callback) => {

		   	this.rpc.on("open-module", (info, callback) => {
		   		if(!this.isValidModule(info.module))
					return callback({error: "Invalid module"})

				this.openModule(info.module, info.args, {}, callback);
		   	})

		   	callback();
		})
	}

	getConfigPath() {
		return path.join(this.appFolder,'config',this.ident);
	}


	getConfig(defaults) {
		utils.getConfig(this.getConfigPath(), defaults);
	}

	getPackageInfo() {
		// TODO - move from Helper
	}

	init_i18nEditor(config){
		var config = _.extend({
			dataFolder: path.join(this.appFolder, "config")
		}, config || {})
		this.i18nEditor = new I18nEditor(this, config);
	}

	isValidModule(module){
		console.log("module:", module)
		if(!module)
			return false

		return true;//(module == "test");
	}

	openModule(moduleName, args, cmdArgs, callback){
		console.log("openModule:1: ", moduleName, args)
		var args = args || {};
		_.each(args, function(v, k){
			if(v === undefined)
				delete args[k]
		})
		args = _.extend({
	   		width: 1200,
	   		height: 800,
	   		frame: false,
	   		transparent: true
	   	}, args, {
	   		new_instance: true
	   	})
	   	if(args.x == undefined || args.y == undefined)
	   		args.position = "center";

	   	//@matoo TODO cmdArgs
	   	args.inject_js_start = 'var __cmdArgs='+JSON.stringify(cmdArgs)+';';
	   	args.inject_js_start = "test.js";

	   	console.log("openModule:2: ", moduleName, args)

	   	if(moduleName == "i18n"){
	   		this.i18nEditor.toggleEditor();

	   		return;
	   	}

	   	var mFile = moduleName+"/"+moduleName+".html";
	   	var moduleFile = "modules/"+mFile;
	   	if(!fs.existsSync(moduleFile)){
	   		moduleFile = path.join(this._externalModulePath, mFile);
	   		if(!fs.existsSync(moduleFile))
	   			return callback({error: "No such module available"})

	   		moduleFile = "file://"+moduleFile;
	   	}

		nw.Window.open(moduleFile, args, (win) => {
			console.log("module-created:", moduleName)
			callback(null, {success: true});
	   	})
	}

}

module.exports = Application;

