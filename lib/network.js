//
//	micro-fabric - Copyright (c) 2017-2018 BitRouting Inc. All Rights Reserved.
//

const os = require('os');
const fs = require('fs');
const path = require('path');
const colors = require('colors');
const NATS = require('nats');
const STAN = require('node-nats-streaming');
const NUID = require('nuid');
const WebSocket = require('ws');
const { EventEmitter } = require("events");
const _ = require('underscore');
const Module = require('./module');
const SocketIOProxyClient = require('./socketio-proxy-client.js');

class Proxy extends EventEmitter {
	constructor(module, options) {
		super();
		this.ident = NUID.next();
		this.module = module;
		this.options = options;

		this.stats = { tx_bytes : 0, rx_bytes : 0, tx_rate : 0, rx_rate : 0, msg : 0 }

		this.startProfiling();
	}

	startProfiling() {

		let lastRX = 0;
		let lastTX = 0;
		let lastMSG = 0;
		let lastTS = Date.now();

		setInterval(()=>{
			let ts = Date.now();
			let delta = (ts-lastTS) / 1000;
			lastTS = ts;
			let tx = this.stats.tx_bytes - lastTX;
			lastTX = this.stats.tx_bytes;
			let rx = this.stats.rx_bytes - lastRX;
			lastRX = this.stats.rx_bytes;
			let msg = this.stats.msg - lastMSG;
			lastMSG = this.stats.msg;

			this.stats.tx_rate = ((tx / delta) / 1024).toFixed(4)+' KB/s';
			this.stats.rx_rate = ((rx / delta) / 1024).toFixed(4)+' KB/s';
			this.stats.msg_rate = msg / delta;

			this.options.stats && console.log("stats["+this.ident+"]:", this.stats);

		}, 3000)

	}

}


class ProxyServer extends Proxy {
	constructor(module, options = { }) {
		super(module, options);

		this.subscribers = { nats : { }, stan : { }}

		options.ws && this.bind(options.ws);

	}

	detour() { return false; }

	bind(ws) {
		let self = this;

		console.log("Binding WebSocket connection...".yellow.bold);
		this.ws = ws;


		ws.on('error', (error) => {
			console.log("WebSocket Error:",error.toString());
		})

		ws.on('close', () => {

			_.each(self.subscribers.stan, (subscription, k) => {
				console.log("Unsubscribe:".yellow.bold,subscription.inbox);
				subscription.unsubscribe();
			})

			_.each(self.subscribers.nats, (subscription, k) => {
				console.log("UBSUBSCRIBE NATS:".yellow.bold,subscription);
				self.module.nats.unsubscribe(subscription);
			})

			self.subscribers = { nats : { }, stan : { } }

		})

		ws.on('message', (_msg) => {

			self.stats.msg++;
			self.stats.rx_bytes += _msg.length;

			try {
				var msg = JSON.parse(_msg);
			} catch(e) {
				return ws.send(JSON.stringify({ error : e.toString() }))
			}

// console.log(msg);
			if(self.detour(msg))
				return;

			switch(msg.op) {
				case 'subscribe': {

					let { subject, nats, stan } = msg;

					if(stan) {
						// ---
						// STAN SUBSCRIPTION
						// ---

						console.log("subscribing [STAN]:".green,subject.bold);

						// TODO: pass arguments from msg to subscriptionOptions
						let opts = self.module.stan.subscriptionOptions();
						let subscription = self.module.stan.subscribe(subject, opts);

						subscription.on('message', (msg) => {
							let data = msg.getData();
							self.stats.tx_bytes += data.length;
							self.stats.msg++;
							self.ws.send(data);
						})

						self.subscribers.stan[inbox] = subscription;
	
						// subscription.on('close', () => {
						// 	// TODO - ?????
						// })
					}
					else {
						// ---
						// NATS SUBSCRIPTION
						// ---
						console.log("subscribing [NATS]:".green,subject.bold);
						let subscription = self.module.nats.subscribe(subject, (msg) => {
							msg = JSON.parse(msg);
							if(self.ws.readyState == self.ws.OPEN)
								self.ws.send(JSON.stringify([0, subject, msg]), (err) => {
									err && console.log(err);
								});
							else
								console.log("websocket not connected... dropping message...", subject,msg);
						})

						self.subscribers.nats[subject] = subscription;
					}

				} break;

				default: {
					return ws.send(JSON.stringify({ error : `missing or invalid opcode in message "${msg.op}"` }))		
				}
			}

		})


	}
}

class WebSocketProxyServer { 
	constructor(module, config) {
		this.module = module;
		this.config = config;
		this.proxy = new ProxyServer(module);
	}

	init() {
		console.log("µFabric::WebSocketProxyServer::init()");
		this.wss = new WebSocket.Server(this.config.ws);
		this.wss.on('connection', (ws) => {
			this.proxy.bind(ws);
		})
	}

}

class SocketIOProxyServer {

	constructor() {
		this.module = module;
		this.config = config;
		this.proxy = new ProxyServer(this);
	}

	init() {
		console.log("µFabric::SocketIOProxyServer::init()");
		this.wss = new WebSocket.Server(this.config);
		this.wss.on('connection', (ws) => {
			this.proxy.bind(ws);
		})
	}

}

module.exports = {
	Proxy,
	ProxyServer,
	WebSocketProxyServer,
	SocketIOProxyServer,
	SocktIOProxyClient:SocketIOProxyClient,
	SocketIOProxyClient
}
