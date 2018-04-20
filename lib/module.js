
const colors = require('colors');
const NATS = require('nats');
const STAN = require('node-nats-streaming');
const NUID = require('nuid');
const { EventEmitter } = require("events");
// const WebSocketClient = require('./lib/websocket-client');
// const _ = require('underscore');
//const utils = require('./lib/utils');

// market.GDAX.BTCUSD.orders
// global.dpc = (t,fn) => { if(!fn) setTimeout(t,0); else setTimeout(fn,t); }





class Module extends EventEmitter {
    constructor(config) {
        super();
        
        if(config.nats === true){
            config.nats = { url : 'nats://localhost:4222'};
            if(!config.cluster)
                config.cluster = 'fabric';
        }
        if(config.stan === true) config.stan = { cluster : 'fabric' };
        // THIS IS WRONG!  MODULE SHOULD BE ABLE TO CONNECT TO REMOTE NATS/STAN VIA CONFIG!
        this.config = Object.assign({
        	//nats : { url : 'nats://localhost:4222'}
        }, config)

        this.ident = this.config.ident || '';
        if(!this.ident)
            throw new Error('Module class requires ident in config');

        this.proxies = { }

        this.config.nats && this.initNATS();
	    this.config.stan && this.initSTAN();

        if(config.i18n === true)
            this.initI18n({});
	    
    }

    init() {
        // throw new Error("NOT-IMPLEMENTED");

        console.error("BitRouting::Fabric::Module::init() - NOT IMPLEMENTED")
    }

    initMod(options) {
        
        nw.Screen.Init();
        //let scr = nw.Screen.screens.shift().bounds;

        console.log("UX.ctl.screen.info".blue.bold);
        this.nats.subscribe('UX.ctl.screen.info', (msg, replyTo) => {
            // nw.Screen.Init();  // can this be required on each call in case display has been re-configured?
            this.nats.publish(replyTo, JSON.stringify(nw.Screen.screens));
        })
        console.log("initMod", this.ident, options );
    }

    initI18n(options){
        console.log("initI18n:1")
        this.i18n = require("fabric-i18n").module(this.ident);

        console.log("initI18n:2", this.i18n)
    }

    onLocaleChanged() {
        if(!this.win || !this.i18n)
            return;
        var i18n = this.i18n;
        var list = $(this.win.document).find("i18n,[i18n]");
        _.each(list, (e) => {
            var $e = $(e);
            var hash = $e.attr("i18n-hash");
            if(!hash) {
                var text = $e.html();
                hash = i18n.hash(text);
                text = i18n.translate(text);
                $e.attr("i18n-hash", hash);
                $e.html(text);
            }
            else {
                let o = i18n.entries.get(hash);
                if(!o)
                    console.error(`i18n Error: no entry exists for hash ${hash}`)
                $e.html(o.locale[i18n.locale] || o.locale[i18n.config.sourceLanguage]);
            }
        })
    }

    initNATS() {

    	console.log("connecting NATS to:".yellow.bold,this.config.nats.url.bold+'...');
        this.nats = NATS.connect(this.config.nats);
        // nats.SetPendingLimits(1024*500, 1024*5000);
        this.nats.dispatch = (subject, o, ...rpc) => {
            this.nats.publish(subject,JSON.stringify(o), ...rpc);
        }

        this.nats.on('connect', () => {
            this.emit('nats-connect');
            console.log('...NATS connected'.green.bold);
            if(!this.config.stan) 
            	this.init();
        })

        this.nats.on('close', () => {
            this.emit('nats-close');
        })
        

		this.nats.on('error', function(err) {
			console.log("nats error",err);
			this.emit('nats-error');
		});

		this.nats.on('disconnect', function() {
			console.log('nats disconnect');
			this.emit('nats-disconnect');
		});

		this.nats.on('reconnecting', function() {
			console.log('nats reconnecting');
			this.emit('nats-reconnecting');
		});

		this.nats.on('reconnect', function(nc) {
			console.log('nats reconnect');
			this.emit('nats-reconnect');
		});


        this.rpc = {
        	dispatch : (subject, msg, callback) => {
        		if(!callback)
	        		this.nats.publish(subject, msg);
        		else
	        		this.nats.publish(subject, msg, (response) => {
	        			if(response.error)
							return callback(response.error);
						if(response.code && response.code === NATS.REQ_TIMEOUT)
							return callback('Request for help timed out.');
						callback(null,response.data);
	        		})
        	},
        	on : (subject, fn) => {
        		// ???
        		this.nats.subscribe(subject, (msg, replyTo) => {
        			fn(msg, (error, data) => {
        				this.nats.publish(replyTo,JSON.stringify({error,data}));
        			})
        		})
        	}
        }
    }

    initSTAN() {
    	console.log("connecting STAN to:".yellow.bold,this.config.stan.url.bold+'...');

        this.stan = STAN.connect(this.config.cluster || this.config.stan.cluster || 'test-cluster', this.config.ident || this.config.stan.ident || (this.ident+'-'+NUID.next().toLowerCase()), this.config.stan); //({ url : 'nats://localhost:4222' });
        this.stan.dispatch = (subject, o, ...args) => {
            // FIXME - CAN FAIL WITH MAX IN FLIGHT
            this.stan.publish(subject,JSON.stringify(o), ...args);
        }

        this.stan.on('connect', () => {
            this.emit('stan-connect');
            console.log("...STAN connected".green.bold);
            this.init();
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
        }), (response) => {
            response = JSON.parse(response);
            console.log("response:",response);
            if(response.error)
                return callback(response)

            callback(null, response)
        })
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


}


/*

class Logs {

}



class Window {
	constructor() {

	}
}

class Application extends Module {
	constructor(appFolder, options = { }) {
		super(options);

		this.appFolder = appFolder;

	}


	getConfig() {
		// TODO - move from Helper
	}

	getPackageInfo() {
		// TODO - move from Helper
	}
}
*/

module.exports = Module;