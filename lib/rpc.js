
const NUID = require('nuid');
const { EventEmitter } = require('events');

class RPC extends EventEmitter {
    constructor(options = { }) {
        super();
        this.verbose = options.verbose;
        this.clients = { }
        this.timeout = options.timeout || 60 * 1000;
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
            this.verbose && console.log('rpc::response',msg);
            let { rid, error, data } = msg;
            if(!rid)
                return
            if(rid && client.pending[rid]) {
                try {
                    client.pending[rid].callback(error, data);
                } catch(ex) {
                    console.log(ex.toString());
                    console.log(ex.stack);
                }
            }
            else
            if(!client.pending[rid]) {
                console.log(`RPC Error - unknown response rid: ${rid} for message:`, msg);
            }
            delete client.pending[rid];
        })

        socket.on('rpc::request', async (msg) => {
            this.verbose && console.log('rpc::request',msg);
            try {
                let { req : { subject, data }, rid } = msg;

                var listeners = this.listeners(subject);
                if(listeners.length == 1) {
                    let invoked = false;
                    let callback = (error, data) => {
                        if(invoked) {
                            if(error && error.stack)
                                console.log(error.stack);
                            console.trace(`multiple callback invocation in request:`, subject, data);
                            return;
                            // throw new Error('multiple callback invocation!');
                        }
                        invoked = true;
                        if(!rid)
                            return
                        socket.emit('rpc::response', {
                            rid, error : error instanceof Error ? error.toString() : error, data
                        });
                    }

                    let ret = listeners[0](data, callback, { subject, socket, uid, rpc : this });
                    if(ret && typeof ret.then == 'function') {
                        // console.log("Awaiting for async...".magenta.bold, msg);
                        try {
                            let v = await ret;
                            return callback(null,v);
                        } catch(ex) { 
                            callback(ex);
                        }
                    }
                    return
                }
                if(!rid)
                    return
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
            this.verbose && console.log('RPC-message:',msg);
            try {
                let { subject, data } = msg;
                this.emit(subject, data, { subject, socket, uid, rpc : this });
            }
            catch(ex) { console.error(ex.stack); }
        });
    }

    detach(uid, socket, reason = "Client disconnected") {

        let client = this.clients[uid];
        if(client){
            Object.keys(client.pending).forEach((rid) => {
            	let req = client.pending[rid];
                req.callback({ error : reason});
            })
            delete this.clients[uid];
        }    
    }

    route(subject, dest) {
        return {
            via : {
                publish : () => {
                    this.on(subject, (...args) => {
                        return dest.publish(subject,...args);
                    })
                },
                dispatch : () => {
                    this.on(subject, (...args) => {
                        return dest.dispatch(subject,...args);
                    })
                }
            }
        };
    }

    publish(...args) {
        let uid = args.shift();
        let subject = args.shift();
        let data = args.shift();

        if(!this.clients[uid]) {
            console.log(`RPC publish: no such client ${uid} for ${subject} data:`, data);
            return;
        }
        this.clients[uid].socket.emit('message', { subject, data });
    }

    getArgs(...args) {
        let [uid, subject, data, callback, options] = args;
        if(typeof data == 'function') {
            options = callback;
            callback = data;
            data = undefined;
        }
        else if(typeof callback != 'function') {
            options = callback;
            callback = undefined;
        }

        if(options === Infinity)
            options = { timeout : false };

        return [uid, subject, data, callback, options || { }];
    }

    dispatch(...args) {
        this.verbose && console.log("RPC-dispatch:",...args);
        let [uid, subject, data, callback, opt] = this.getArgs(...args);
        let client = this.clients[uid];
        if(!client) {
            if(callback)
                return callback(`RPC - no such client ${uid}`);
            return Promise.reject(`RPC - no such client ${uid}`);
        }
        let req = {subject, data};

        const error = { };
        Error.captureStackTrace(error);

        const proc = (done) => {
            let rid = NUID.next();
            client.pending[rid] = Object.assign({ timeout : true }, opt, {
                subject,
                ts : Date.now(),
                callback : done,
                error
            })
            client.socket.emit('rpc::request', {req, rid });
        }

        if(callback)
            return proc(callback);

        return new Promise((resolve,reject) => {
            proc((err, resp) => {
                if(err)
                    return reject(err)
                resolve(resp);
            })
        })
    }

    timeoutMonitor() {
        let ts = Date.now();
        Object.keys(this.clients).forEach((uid) => {
            let client = this.clients[uid];
            Object.keys(client.pending).forEach((rid) => {
                let pending = client.pending[rid];
                if(pending.timeout && ts - pending.ts > this.timeout) {
                    console.log(`timeout on ${pending.subject}`);
                    console.log(pending.error.stack);
                    try {
                        pending.callback(`RPC timeout on '${pending.subject}'`);
                    } catch(ex) { 
                        console.log(`Error in callback for ${pending.subject}`);
                        console.log(ex);
                    }
                    delete client.pending[rid];
                }
            })
        })
    }
    emitAsync(subject, data) {
        dpc(()=>{
            this.emit(subject, data);
        })
    }
}


module.exports = RPC;