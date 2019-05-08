
const NUID = require('nuid');
const { EventEmitter } = require('events');

class RPC extends EventEmitter {
    constructor(options = { }) {
        super();

        this.clients = { }

        this.timeout = options.timeout || 60 * 1000;
//        this.pending = { }

//        dpc(()=>{ this.timeoutMonitor(); })

		this.timeoutMonitorTick = setInterval(()=> {
			this.timeoutMonitor();
		}, 1000)
    }

    shutdown() {
    	clearInterval(this.timeoutMonitorTick);
    }

    attach(uid, socket) {
        
        let client = this.clients[uid] = { 
            socket,
            pending : { }
        };

        socket.on('rpc::response', function(msg) {
            // console.log('rpc::response',msg);
            let { rid, error, data } = msg;
            if(rid && client.pending[rid])
                client.pending[rid].callback(error, data);
            else
            if(!client.pending[rid]) {
                console.log(`RPC Error - unknown response rid: ${rid} for message:`, msg);
            }
            delete client.pending[rid];
        })

        socket.on('rpc::request', (msg) => {
            // console.log('rpc::request',msg);
            try {
                let { req : { subject, data }, rid } = msg;

                var listeners = this.listeners(subject);
                if(listeners.length == 1) {
                    let callback = (error, data) => {
                        socket.emit('rpc::response', {
                            rid, error, data
                        });
                    }

                    listeners[0](data, callback, { subject, socket, uid, rpc : this });
                }
                else
                if(listeners.length)
                {
                    socket.emit('rpc::response', {
                        rid,
                        error : `Too many handlers for ${subject}`
                    });
                }
                else
                {
                    socket.emit('rpc::response', {
                        rid,
                        error : `No handler for ${subject}` 
                    });
                }
            }
            catch(ex) { console.error(ex.stack); }
        });

        socket.on('message', (msg) => {
            try {
                let { subject, data } = msg;
                this.emit(subject, data, { subject, socket, uid, rpc : this });
            }
            catch(ex) { console.error(ex.stack); }
        });
    }

    detach(uid, socket, reason = "Client disconnected") {

        let client = this.clients[uid];

        Object.keys(client.pending).forEach((rid) => {
        	let req = client.pending[rid];
            req.callback({ error : reason});
        })        

        delete this.clients[uid];

        // TODO - cleanup pending
    }

    publish(...args) {
        let uid = args.shift();
        let subject = args.shift();
        let data = args.shift();

        this.clients[uid].socket.emit('message', { subject, data });
    }

    getArgs(...args) {
//    	console.trace(args);
        let [uid, subject, data, callback] = args;
        if(typeof(data) == 'function') {
            callback = data;
            data = undefined;
        }

        return [uid, subject, data, callback];
    }

    dispatch(...args) { //uid, msg, callback) {

        let [uid, subject, data, callback] = this.getArgs(...args);

        if(!callback)
            return this.publish(uid, subject, data);

        let client = this.clients[uid];
        if(!client)
            return callback(`RPC - no such client ${uid}`);

        let rid = NUID.next();

        client.pending[rid] = {
            ts : Date.now(),
            callback : (err, resp) => {
                callback(err, resp);
            }
        }

        client.socket.emit('rpc::request', { 
            req : { subject, data },
            rid
        });
    }

    timeoutMonitor() {

        let ts = Date.now();
        Object.keys(this.clients).forEach((uid) => {
            let client = this.clients[uid];
            Object.keys(client.pending).forEach((rid) => {
                let pending = client.pending[rid];
                if(ts - pending.ts > this.timeout) {
                    pending.callback({error : 'Timeout'});
                    delete client.pending[rid];
                }
            })
        })

//        dpc(1000, ()=>{ this.timeoutMonitor(); })
    }
}


module.exports = RPC;