
const colors = require('colors');
const NATS = require('nats');
const STAN = require('node-nats-streaming');
const NUID = require('nuid');
const { EventEmitter } = require("events");
// const WebSocketClient = require('./lib/websocket-client');
const _ = require('underscore');
const utils = require('./lib/utils');
const Module = require('./lib/module');
const Application = require('./lib/application');

// market.GDAX.BTCUSD.orders
global.dpc = (t,fn) => { if(!fn) setTimeout(t,0); else setTimeout(fn,t); }


module.exports = {
    Module, Application, utils
}

/*

class Module extends EventEmitter {
    constructor(config) {
        super();


        // THIS IS WRONG!  MODULE SHOULD BE ABLE TO CONNECT TO REMOTE NATS/STAN VIA CONFIG!
//        if(options.nats === true) options.nats = { url : 'nats://localhost:4222'};
  //      if(options.stan === true) options.stan = { cluster : 'test-cluster' };
        this.config = Object.assign({
        	// nats : { url : 'nats://localhost:4222'}
        }, config)

        this.ident = this.config.ident || '';
        if(!this.ident)
            throw new Error('Module class requires ident in config');

        this.config.nats && this.initNATS();
	    this.config.stan && this.initSTAN();
	    
    }

    init() {
        // throw new Error("NOT-IMPLEMENTED");

        console.error("BitRouting::Module::init() - NOT IMPLEMENTED")
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

//    	console.log("initSTAN:",this.config.stan);
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

}

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
