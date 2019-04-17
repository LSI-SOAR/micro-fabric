
const colors = require('colors');
const NATS = require('nats');
const STAN = require('node-nats-streaming');
const NUID = require('nuid');
const { EventEmitter } = require("events");
const i18n = require('./i18n');
const PopupProxy = require('./popup-proxy');
const _ = require('underscore');

class Module extends EventEmitter {

	constructor(config) {
		super();
		
		config = config || {};

		if(!global.µFabric)
			global.µFabric = { }
		global.µFabric.module = this;

		if(!global.µF)
			global.µF = { }
		global.µF.module = this;


		try {
			this.window = nw.Window.get();
		} catch (e) {
			config.debug && console.log("µFabric::Module - no nw window context here:", e.toString())
		}

		let args = { }
		if(typeof(document) != "undefined" && document.location) {
			let params = (new URL(document.location)).searchParams;
			let _args = params.get("__args__");
			config.verbose && console.log("I got args:",_args,document.location);
			if(_args && _args.length) {
				
				this.moduleArgs = JSON.parse(_args);
				this.args = args = this.moduleArgs.args || {};

				if(this.window) {
					if(this.window.setShadow && this.args.noShadow)
						this.window.setShadow(false);
					if(this.moduleArgs.width != undefined && this.moduleArgs.height != undefined){
						try{
							this.window.resizeTo(this.moduleArgs.width, this.moduleArgs.height);
						}catch(e){
							console.log("Unable to resize window", e)
						}
					}
					if(this.args.maximize)
						this.window.maximize();

					if(this.moduleArgs.x != undefined && this.moduleArgs.y != undefined){
						try{
							this.window.moveTo(this.moduleArgs.x, this.moduleArgs.y);
						}catch(e){
							console.log("Unable to re-position window", e)
						}
					}
				}
				
			}

			// if(this.moduleArgs && this.moduleArgs.show !== false)
			console.log("config.window", config.window)
			if(this.window) {
				if(!config.window) {
				   this.window.show(true);
				} 
				else {
					if(config.window.show)
						this.window.show(config.window.show);
				}
			}

		}

		config.verbose && console.log("Module args:", this.moduleArgs, args);

		/*
				if(this.moduleArgs.nats)
					config.nats = { port : this.moduleArgs.nats };
				if(this.moduleArgs.stan)
					config.stan = { port : this.moduleArgs.stan };
		*/

		this.uid = (this.moduleArgs ? this.moduleArgs.uid : (args ? args.uid : null)) || null;
		this.args = args;
		
		if(config.nats) {

			if(config.nats === true)
				config.nats = { }

			if(this.moduleArgs && this.moduleArgs.nats)
				config.nats.port = this.moduleArgs.nats;

			if(!config.nats.url && config.nats.port)
				config.nats.url = "nats://localhost:"+config.nats.port;

			if(!config.nats.url && args.nats)
				config.nats.url = "nats://localhost:"+args.nats;

			config.nats = Object.assign({
				reconnectTimeWait : 20,
				maxReconnectAttempts : -1
			}, config.nats);
		}

		if(config.stan) {

			if(config.stan === true)
				config.stan = { }

			if(this.moduleArgs && this.moduleArgs.stan)
				config.stan.port = this.moduleArgs.stan;


			if(!config.stan.url && config.stan.port)
				config.stan.url = "nats://localhost:"+config.stan.port;

			if(!config.stan.url && args.stan)
				config.stan.url = "nats://localhost:"+args.stan;

			config.stan = Object.assign({
				reconnectTimeWait : 20,
				maxReconnectAttempts : -1
			}, config.stan);
			
			config.stan.cluster = 'micro-fabric';
		}

		this.config = Object.assign({}, config);

		this.ident = this.config.ident || '';
		if(!this.ident)
			throw new Error('Module class requires ident in config');

		this.proxies = { }

		this.config.verbose && console.log("module config:", this.config);

		if(this.config.ctorInit !== false)
			dpc(() => { 
				console.log("Running module init...");
				this.initModule_(); 
			});
		
	}

	initModule_() {
		this.config.verbose && console.log("µFabric::init()", this.config);

		this.deps = 0;

		if(this.config.stan) {
			this.deps++;
			this.initSTAN();
		}

		if(this.config.nats) {
			this.deps++;
			this.initNATS();
		}
		

		if(this.config.i18n === true)
			this.initI18n({});
	}

	deref_() {
		this.deps--;
		this.config.verbose && console.log("this.deps--", this.deps)
		if(!this.deps) {

			const doInit = (callback) => {
				if(!this.init_)
					return callback();

				let fn = this.init_.shift();
				if(!fn)
					return callback();

				fn((err, resp) => {
					if(err) // TODO - cascade back?
						console.log(err);
					dpc(() => { doInit(() => { callback(); }); });
				});
			}

			doInit(() => {
				console.log(`[${this.ident}] µFabric::Module::main()`)
				this.main(this.args);

				if(this.nats && this.uid)
					this.nats.publish(`MODULE.${this.uid}.created`);//"UX.ctl.module.created", uid);

				// TODO . broadcast creation via UUID
			})

		}

	}

	main(){
		console.log("Main: Override me in child class...")
	}

	init(fn) {
		this.config.verbose && console.log("Module:init()");
		if(!fn)
			console.trace("µFabric::Module::init() - invoked without callback argument");
		if(!this.init_)
			this.init_ = [ ]
		this.init_.push(fn);
	}

	// TODO: remove this once moved
	initMod(options) {
		
		nw.Screen.Init();

		console.log("UX.ctl.screen.info");
		this.nats.subscribe('UX.ctl.screen.info', (msg, replyTo) => {
			// nw.Screen.Init();  // can this be required on each call in case display has been re-configured?
			this.nats.publish(replyTo, JSON.stringify(nw.Screen.screens));
		})
		this.config.verbose && console.log("initMod", this.ident, options );
	}

	initI18n(options){
		this.i18n = new i18n(this);
		this.i18n.on("initialized", ()=>{
			if(!this.window)
				return
			var win = this.window.window;
			if(!win)
				return
			win.i18n = this.i18n;
			var body = win.document.body;
			var cEvent = new CustomEvent("fabric-i18n-init", {detail: {i18n: this.i18n}})
			body.dispatchEvent(cEvent)
		});
	}

	initNATS() {

		if(!this.config.nats.url && this.config.nats.port)
			this.config.nats.url = "nats://localhost:"+this.config.nats.port;

		console.log("connecting NATS to:",this.config.nats.url+'...');
		this.nats = NATS.connect(Object.assign(this.config.nats, {
			//preserveBuffers : true
			//encoding : 'binary'
		}));
		// console.log("NATS config is:".cyan.bold, this.config.nats);
		// nats.SetPendingLimits(1024*500, 1024*5000);
		this.nats.dispatch = (subject, o, ...rpc) => {
			this.nats.publish(subject,JSON.stringify(o), ...rpc);
		}

		this.nats.on('connect', () => {
			this.emit('nats-connect');
			console.log('...NATS connected');
			this.deps && this.deref_();
		})

		this.nats.on('close', () => {
			this.emit('nats-close');
		})
		

		this.nats.on('error', (err)=>{
			console.log("nats error",err);
			this.emit('nats-error');
		});

		this.nats.on('disconnect', ()=>{
			console.log('nats disconnect');
			this.emit('nats-disconnect');
		});

		this.nats.on('reconnecting', ()=>{
			console.log('nats reconnecting');
			this.emit('nats-reconnecting');
		});

		this.nats.on('reconnect', (nc)=>{
			console.log('nats reconnect');
			this.emit('nats-reconnect');
		});


		this.rpc = {
			subscribe : (...args) => {
				this.nats.subscribe(...args);
			},
			dispatch : (subject, msg, callback) => {
				if(!_.isString(msg))
					msg = JSON.stringify(msg);
				if(!callback)
					this.nats.publish(subject, msg);
				else
					this.nats.request(subject, msg, {'max':1}, (response) => {
						response = JSON.parse(response);
						if(response.error)
							return callback(response.error);
						if(response.code && response.code === NATS.REQ_TIMEOUT)
							return callback({error: 'Request for help timed out.', code: response.code});
						callback(null, response.data);
					})
			},
			on : (subject, fn) => {
				this.nats.subscribe(subject, (msg, replyTo) => {
					// console.log("on - msg:", msg, "replyTo:", replyTo)
					try{
						msg = JSON.parse(msg);
					}catch(e){
						msg = msg;
					}
					fn(msg, (error, data) => {
						console.log("on response - replyTo:", replyTo, "error:", error, "data:", data);
						if(replyTo)
							this.nats.publish(replyTo, JSON.stringify({error, data}));
						else
						if(error)
							console.trace(error);
					})
				})
			}
		}

	}

	initWindowStateEvents(params){
		console.log("initWindowStateEvents", this.args)
		this._windowState = this.args.windowState || {};
		if(params)
			this._windowState.params = params;

		this.buildWindowState()
		this.onRPCEvent("get-window-state", (args)=>{
			this.buildWindowState(true);
			this.fireRPCEvent("window-state", {
				ident: this.ident,
				state: this._windowState
			});
		});

		this.window.on("maximize", ()=>{
			this.setWindowState("maximize", true)
		})
		this.window.on("unmaximize", ()=>{
			this.setWindowState("maximize", false)
		})
		this.window.on("restore", ()=>{
			this.setWindowState("maximize", false)
		})

		this.window.on("resize", ()=>{
			this.setWindowState("width", this.window.width);
			if(!this._windowState.collapsed)
				this.setWindowState("height", this.window.height);
		})
		//var state = this._windowState;
		this.window.on("move", (x, y)=>{
			/*console.log("move", this.ident, x,y)
			if(state.locked){
				if(state.x != x || state.y != y)
					this.window.moveTo(state.x, state.y);
			}*/
			this.setWindowState("x", this.window.x);
			this.setWindowState("y", this.window.y);
		})
	}
	buildWindowState(skipDefaultEvent){
		this.setWindowState("maximize", this.window.maximized, false);
		this.setWindowState("width", this.window.width, false);
		if(!this._windowState.collapsed)
			this.setWindowState("height", this.window.height, false);
		this.setWindowState("x", this.window.x, false);
		this.setWindowState("y", this.window.y, skipDefaultEvent !== true);
	}
	setWindowState(key, newValue, forceEvent){
		if(!this._windowState)
			return false;
		var state = this._windowState;
		var oldValue = state[key];
		state[key] = newValue;

		this.window.setResizable(!state.locked && !state.collapsed);


		if(forceEvent === false)
			return;
		if(forceEvent || oldValue != newValue){
			this.fireRPCEvent("window-state-updated", {
				ident: this.ident,
				state: this._windowState,
				key, newValue
			})
		}
	}
	getWindowState(key){
		if(!this._windowState)
			return undefined;
		return this._windowState[key];
	}

	initSTAN() {


		if(!this.config.stan.url && this.config.stan.port)
			this.config.stan.url = "nats://localhost:"+this.config.stan.port;


		console.log("connecting STAN to:",this.config.stan.url+' cluster:'+this.config.stan.cluster+'...');


//		console.log("initSTAN - ",this.config.stan.cluster, this.config.ident || this.config.stan.ident || (this.ident+'-'+NUID.next().toLowerCase()), this.config.stan);
//		 console.log("STAN config is:", this.config.stan);

		this.stan = STAN.connect(this.config.stan.cluster, this.config.ident || this.config.stan.ident || (this.ident+'-'+NUID.next().toLowerCase()), this.config.stan); //({ url : 'nats://localhost:4222' });
		this.stan.dispatch = (subject, o, ...args) => {
			// FIXME - CAN FAIL WITH MAX IN FLIGHT
			this.stan.publish(subject,JSON.stringify(o), ...args);
		}

		this.stan.on('connect', () => {
			this.emit('stan-connect');
			console.log("...STAN connected");
			this.deps && this.deref_();
		})

		this.stan.on('reconnecting', () => {
			this.emit('stan-reconnecting');
			console.log("stan-reconnecting...");
		})

		this.stan.on('close', () => {
			this.emit('stan-close');
		})

		this.stan.on('error', (reason) => {
			this.emit('stan-error', reason);
		})
	}

	sendCommand(str, callback){
		var args = str.split(" ");
		var cmd = args.shift();
		console.log("args", args)
		if(cmd == "exit"){
			callback(null, {success: true})
			return window.close();
		}
		var nats = this.nats;
		nats.request('UX.ctl.cmd', JSON.stringify({ 
			cmd : cmd,
			args : args
		}), {"max": 1}, (response) => {
			response = JSON.parse(response);
			console.log("response:",response);
			if(response.error)
				return callback(response)

			callback(null, response)
		})
	}

	onRPCEvent(op, callback){
		this.rpc.on(op, (args, cb)=>{
			if(args.__org == this.config.ident)
				return;

			callback(args, cb);
		})
	}
	fireRPCEvent(op, args, callback){
		args.__org = this.config.ident;
		if(callback){
			this.rpc.dispatch(op, args, callback)
		}else{
			this.rpc.dispatch(op, args)
		}
	}

	/*
	createProxyServer(options) {
		let proxy = new ProxyServer(this, options);
		this.proxies[proxy.ident] = proxy;
		return proxy;
	}


	createProxyClient(options) {
		let proxy = new ProxyClient(this, options);
		this.proxies[proxy.ident] = proxy;
		return proxy;
	}

	deleteProxyClient(proxy) {
		let proxy = this.proxies[proxy.ident];
		proxy.shutdown();
		delete this.proxies[proxy.ident];
		return proxy;
	}
	*/


	openPopup(module, options, args, callback){
		args = _.extend({/*noShadow:true*/}, args || {});
		this.popups = this.popups || {};
		var key = module+((args.popup && args.popup.ident) || args.ident);
		if(this.popups[key]){
			var popup = this.popups[key];
			popup.setArgs(args, (err)=>{
				if(err)
					return callback(err)
				popup.show(options, (err)=>{
					if(err)
						return callback(err);
					callback(null, {uid:popup.config.uid, popup, reopened:true});
				});
			})
			return;
		}

		//options.show = true;
		this.rpc.dispatch("UX.ctl.module.create", { 
			module, options, args
		}, (err, resp)=>{
			if(err){
				console.log("Could not open "+module+" module", err)
				callback(err, resp);
				return;
			}
			var uid = resp.uid;
			var popup = new PopupProxy(this, {uid, module, options, args});
			popup.on("closed", ()=>{
				delete this.popups[key];
			});

			this.popups[key] = popup;

			callback(null, {uid, popup});
		});
	}

}

module.exports = Module;