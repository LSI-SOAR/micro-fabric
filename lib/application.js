const os = require('os');
const Module = require('./module');
const Network = require('./network');
const utils = require('./utils');
const I18nEditor = require('./i18n-editor');
const ModuleManager = require('./manager');
const _ = require('underscore');
const path = require('path');
const fs = require('fs');

class Application extends Module {
	constructor(options_ = { }) {
		
		var options = Object.assign({ 
			moduleFolder : options_.appFolder,
			configPath : 'config'
		}, options_);

		if(!options.ident)
			throw new Error("µFabric::Module - module config object must provide 'ident' field");

		let defaults = {
			ctorInit : false,
			ident : options.ident,
			moduleFolder : options.moduleFolder
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
			options.verbose && console.log("loading config:".yellow.bold,options.configPath)
//			config = utils.getConfig(path.join(options.moduleFolder,options.configPath,options.ident), defaults);
			config = utils.getConfig(path.join(options.configPath,options.ident), defaults);
		}
		else {
			options.verbose && console.log("skipping local configuration (configPath)".magenta.bold);
			config = Object.assign(options,defaults);
		}

		super(config);

		this.appFolder = options_.appFolder;

		let BIN = options.bin || options.µFabricBin;

		if(typeof(BIN) == 'string') {

		// let BIN = path.join(__dirname,'../bin')
			let FOLDER = BIN;
			let NATS = '';
			let STAN = '';
			let PLATFORM = '';
			let ARCH = os.arch();
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

			let TARGET = `${PLATFORM}-${ARCH}`;

			BIN = {
				NATS : path.join(FOLDER,TARGET,NATS),
				STAN : path.join(FOLDER,TARGET,STAN)
			}
		}
		else if(!BIN) {
			BIN = { 
				NATS : this.config.nats.bin,
				STAN : this.config.stan.bin,
			}
		}

		this.proc = { }
		this.config.verbose && console.log("µFabtic::application::options".magenta.bold, options);
		if(this.config.nats) {
			if(!BIN.NATS)
				throw new Error("µFabric: please supply a path to gnatsd");
			this.proc.nats = new utils.Process({ 
				descr : this.ident+' - application NATS instance',
				//args : [ path.join(BIN,TARGET,NATS), '--port', this.config.nats.port ],
				args : [ BIN.NATS, '--port', this.config.nats.port ],
				options : { cwd : BIN },
			})
		}

		if(this.config.stan) {
			if(!BIN.STAN)
				throw new Error("µFabric: please supply a path to nats-streaming-server");
			this.proc.stan = new utils.Process({ 
				descr : this.ident+' - application STAN instance',
				args : [ BIN.STAN, '--port', this.config.stan.port, 
				//args : [ path.join(BIN,TARGET,STAN), '--port', this.config.stan.port, 
				//'-cid', this.config.stan.cluster ],
				'--cluster_id', this.config.stan.cluster ],
				options : { cwd : BIN },
			})
		}
		
		this.config.nats && this.proc.nats.run();
		this.config.stan && this.proc.stan.run();
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

		dpc(1000, ()=>{
			this.initModule_();
		})

		this.init((callback) => {
			this.manager = new ModuleManager(this);
			this.manager.init(callback);
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

	initWindowsStateEvents(homeFolder, fileName){
		var filePath = path.join(homeFolder, fileName || "windows-state.json");
		this._windowsState =  utils.readJSON(filePath) || {};
		if(this.config.windowsStateVersion && this._windowsState.version != this.config.windowsStateVersion)
			this._windowsState = {version: this.config.windowsStateVersion};
		this.onRPCEvent("window-state-updated", ()=>{
			this._getWindowsState((err, result)=>{
				console.log("get-windows-state: err, result", err, result)
				if(err)
					return console.log("unable to save windows state", err);

				fs.writeFileSync(filePath, JSON.stringify(result, null, "\t"))
			})
		})
		
		this.onRPCEvent("window-state", (args)=>{
			this._windowsState[args.ident] = args.state;
		})
	}
	getWindowsState(){
		return this._windowsState || {};
	}
	_getWindowsState(callback){
		this.fireRPCEvent("get-window-state", {});
		dpc(1000, ()=>{
			callback(null, this._windowsState);
		})
	}
}

module.exports = Application;

