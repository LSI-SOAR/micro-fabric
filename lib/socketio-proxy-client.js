//var io = require('socket.io-client');
if(typeof(nw) != 'undefined')
    var io = require('./io');
else
    var io = require('socket.io-client'); // <---- socket session issue

var _ = require('underscore');
var NUID = require('nuid');
var RPC = require('./rpc');

function dpc(t,fn) { if(typeof(t) == 'function') return setTimeout(t,0); else return setTimeout(fn,t); }

class SocketIOProxyClient {
    constructor(options){
        this.online = false;
        this.timeout  = 30;

        this.options = _.extend({
            path:'/rpc'
        }, options || {});

        this.rpc = new RPC();
        this.uid = NUID.next();

        this.init();
    }

    init() {
        this.initEvent();
        //this.timeout = this.timeout || 30;
        this.connected = false;
        if (this.options.path)
          this.connect();
    }

    initEvent() {
        // this.pending = { };
        // this._req = 1;
        this.events = new Events();
    }

    connect(){
//        var self = this;
        if (this._connected || !this.options.path)
            return;
        this._connected = true;
        this.events.emitAsync('rpc-connecting');
        this.socket = io(this.options.origin+this.options.path, this.options.args || {});
        //console.log("this.options.args"+this.options.args)
        this.socket.on('ready', () => {
            this.online = true;
        })
        this.socket.on('connect', () => {
            
            this.rpc.attach(this.uid, this.socket);

            //console.log("RPC connected");
            this.events.emit('rpc-connect');


        })
        this.socket.on('connect_error', (err) => {
            this.events.emit('rpc-connect-error', err);
        })
        this.socket.on('error', (err) => { 
            console.log("RPC error", (err ? err.toString() : arguments));
        	this.events.emit('rpc-error', err);
        })
        this.socket.on('offline', () => {
            //window.location.reload();
            this.events.emit('offline');
        })
        this.socket.on('disconnect', () => { 
            this.online = false;
            //console.log("RPC disconnected",arguments);
   			this.events.emit('rpc-disconnect');

            // _.each(self.pending, function(info, id) {
            //     info.callback({ error : "Connection Closed"});
            // })

            // self.pending = { }

            this.rpc.detach(this.uid, this.socket);
        })

        this.socket.on('user-login', (msg) => {
            //window.location.reload();
        })
        this.socket.on('user-logout', (msg) => {
            //window.location.reload();
        })
/*
        self.socket.on('message', function(msg) {
            if(self.trace) {
                if(self.trace === 1 || self.trace === true)
                    console.log('RPC ['+self.id+']:',msg.subject);
                else
                if(self.trace === 2)
                    console.log('RPC ['+self.id+']:',msg.subject,msg.data);                
            }
            //self.events.emit(msg.op || msg.subject, msg.data);
            self.events.emit(msg.subject, msg.data);
        })
*/        
/*
        self.socket.on('rpc::response', function(msg) {
            if(msg._resp && self.pending[msg._resp])
                self.pending[msg._resp].callback.call(this, msg.err, msg.resp);
            else
            if(!self.pending[msg._resp]) {
                console.log("RPC received unknown rpc callback (strange server-side retransmit?)");
            }
            delete self.pending[msg._resp];
        })
*/
/*
        socket.on('rpc::response', function(msg) {
            let { rid, error, data } = msg;
            if(rid && client.pending[rid])
                client.pending[rid].callback(error, data);
            else
            if(!client.pending[rid]) {
                console.log(`RPC Error - unknown response rid: ${rid} (retransmit?)`);
            }
            delete client.pending[rid];
        })


        socket.on('rpc::request', (msg) => {
            try {
                console.log("args:",msg);

                let { req : { subject, data }, rid } = msg;
//                let { subject, data } = req;
                
                var listeners = this.listeners(subject);
                console.log(listeners);
                if(listeners.length == 1) {

                    let args = [ socket, subject ];
                    if(data !== undefined)
                        args.push(data);

                    let callback = (error, data) => {
                        console.log("SENDING RESPONSE",uid,{
                            rid, error, data
                        })

                        socket.emit('rpc::response', {
                            rid, error, data
                        });
                    }

                    listeners[0].call(...args);
                }
                else
                if(listeners.length)
                {
                    socket.emit('rpc::response', {
                        rid,
                        error : { error : `Too many handlers for ${subject}` }
                    });
                }
                else
                {
                    console.log("SENDING NO SUCH HANDLER".red.bold, uid);
                    socket.emit('rpc::response', {
                        rid,
                        error : { error : `No handler for ${subject}` }
                    });
                }
            }
            catch(ex) { console.error(ex.stack); }
        });



        function timeoutMonitor() {
            // var self = this;
            var ts = Date.now();
            var purge = [ ]
            _.each(this.pending, function(info, id) {
                if(ts - info.ts > self.timeout * 1000) {
                    info.callback({ error : "Timeout "});
                    purge.push(id);
                }
            })
            _.each(purge, function(id) {
                delete pending[id];
            })
            dpc(1000, timeoutMonitor);
        }
        dpc(1000, timeoutMonitor);
*/        
    }

    close(){
        this.rpc.detach(this.uid, this.socket);

        if(this.socket)
            this.socket.close();
    }

    on(...args) { this.rpc.on(...args); }
//    off(...args) { this.rpc.off(this.uid, ...args); }
    publish(...args) { this.rpc.publish(this.uid, ...args); }
    dispatch(...args) { this.rpc.dispatch(this.uid, ...args); }



    // on(subject, callback) {
    //     this.events.on(subject, callback);
    // }



    // dispatch(subject, data, callback) {

    //     if(typeof(data) == 'function') {
    //         callback = data;
    //         data = undefined;
    //     }

    //     if(!callback)
    //         return this.socket.emit('message', {subject,data});

    //     this.pending[this._req] = {
    //         ts : Date.now(),
    //         callback : function(err, resp) {
    //             callback(err, resp);
    //         }
    //     }

    //     this.socket.emit('rpc::request', { 
    //         req : {subject,data},
    //         _req : this._req,
    //     });

    //     this._req++;
    // }
}

function Events() {
    var self = this;

    var events = { }
    var listeners = null;
    var refs = [], mevents = [];


    self.on = function(subject, fn) {
        if(!fn)
            throw new Error("events::on() - callback is required");
        var uuid = NUID.next();
        if(!events[subject])
            events[subject] = { }
        events[subject][uuid] = fn;//{ uuid : uuid, fn : fn }
        refs[uuid] = subject;
        return uuid;
    }

    self.mon = function(subject, fn){
        var uuid = self.on(subject, fn);
        mevents.push(uuid);
        return uuid;
    }

    self.on('destroy', function(){
        _.each(mevents, function(uuid){
           self.off(uuid);
        });
    })

    self.off = function(uuid, subject) {
        if (uuid) {
            var subject = refs[uuid];
            delete refs[uuid];
            delete events[subject][uuid];
        }else if (subject) {
            _.each(events[subject], function(fn, uuid){
                delete refs[uuid];
            });

            delete events[subject];
        };
    }

    // this function supports 2 types of arguments.  single object that contains opcode { op : 'msg' } or 'msg', args...
    self.emit = function(msg) {
        var me = this;
        
        var args = Array.prototype.slice.apply(arguments);

        if(typeof(msg) == 'string') {

            var orig = args.slice();
            args.shift();

            var list = events[msg];
            list && _.each(list, function(fn) {
                fn.apply(self, args);
            })

            listeners && _.each(listeners, function(listener) {
                listener.emit.apply(listener, orig);
            })
        }
        else {

            var list = events[msg.subject];
            list && _.each(list, function(fn) {
                fn.apply(self, args);
            })

            listeners && _.each(listeners, function(listener) {
                listener.emit.apply(listener, args);
            })
        }
    }

    self.emitAsync = function(subject) {
        dpc(function(){
            self.emit(subject);
        })
    }

    self.addListener = function(listener) {
        if(!listeners)
            listeners = [ ]
        listeners.push(listener);
    }

    self.removeListener = function(listener) {
        listeners = Array.prototype.slice.apply(listeners.indexOf(listener));
    }

    self.getListeners = function() {
        return listeners;
    }
}

SocketIOProxyClient.Events = Events;

module.exports = SocketIOProxyClient;

