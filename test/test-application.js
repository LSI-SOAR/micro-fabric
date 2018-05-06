const µFabric = require('../micro-fabric');


class TestApp extends µFabric.Application {

	constructor(...args) {
		super(...args);
	}

	getConfig(defaults) {
		return defaults;
	}

	main() {


console.log("TEST-APPLICATION");

		let WSS = new µFabric.Network.WebSocketProxyServer(this, this.config.proxy_server.ws);

/*
		let opts = this.stan.subscriptionOptions();
		opts.setStartWithLastReceived();

		let subject = 'TestApp.ctl.test';

		let subscription = this.stan.subscribe(subject, '', opts);

		subscription.on('error', function (err) {
			console.log('subscription for ' + subject + " raised an error: " + err);
		});
		subscription.on('unsubscribed', function () {
			console.log('unsubscribed to ' + subject);
		});
		subscription.on('ready', function () {
			console.log('subscribed to ' + subject);// + ' qgroup:' + this.qGroup);
		});
		subscription.on('message', function (msg) {
			console.log(msg.getSubject() + "[" + msg.getSequence() + "]: " + msg.getData());
		});
		

		dpc(1000, ()=>{


				this.stan.publish(subject, JSON.stringify({ hello : "world1" }))
				this.stan.publish(subject, JSON.stringify({ hello : "world2" }))
				this.stan.publish(subject, JSON.stringify({ hello : "world3" }))

		})

*/

		this.nats.subscribe('TestApp.ctl.test', (msg) => {
			console.log("GOT MSG:".yellow.bold, msg);
		})

		this.nats.publish('TestApp.ctl.test', JSON.stringify({ hello : "world1" }))
		this.nats.publish('TestApp.ctl.test', JSON.stringify({ hello : "world2" }))
		this.nats.publish('TestApp.ctl.test', JSON.stringify({ hello : "world3" }))



		// this.nats.publish('MODULE.init')

	}
}


new TestApp({
	moduleFolder : __dirname,
	configPath : null,
	ident : 'test-application',
	nats : { port : 4466, reconnectTimeWait : 20, maxReconnectAttempts : -1 },
//	stan : { port : 4488, reconnectTimeWait : 20, maxReconnectAttempts : -1 },
	proxy_server : { ws : { port : 8080, stats : true } }

})
