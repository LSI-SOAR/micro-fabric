//var io = require('socket.io-client');
//var io = require('./io');
var io = require('socket.io-client');
var _ = require('underscore');
var NUID = require('nuid');

function dpc(t,fn) { if(typeof(t) == 'function') return setTimeout(t,0); else return setTimeout(fn,t); }

class SocketIOProxyClient {
    constructor(options){
        this.online = false;
        this.timeout  = 30;

        this.options = _.extend({
            path:'/rpc'
        }, options || {});

        this.init();
    }

    init() {
        var self = this;
        self.initEvent();
        self.timeout = this.timeout || 30;
        self.connected = false;
        if (self.options.path)
          self.connect();
    }

    initEvent() {
        this.pending = { };
        this._req = 1;
        this.events = new Events();
    }

    connect(){
        var self = this;
        if (self._connected || !self.options.path)
            return;
        self._connected = true;
        self.events.emitAsync('rpc-connecting');
        self.socket = io(self.options.origin+self.options.path, self.options.args || {});
        //console.log("self.options.args"+self.options.args)
        self.socket.on('ready', function(){
            self.online = true;
        })
        self.socket.on('connect', function() {
            console.log("RPC connected");
            self.events.emit('rpc-connect');
        })
        self.socket.on('connect_error', function(err){
            self.events.emit('rpc-connect-error', err);
        })
        self.socket.on('error', function(err) { 
            console.log("RPC error", arguments);
        	self.events.emit('rpc-error', err);
        })
        self.socket.on('offline', function(){
            //window.location.reload();
            self.events.emit('offline');
        })
        self.socket.on('disconnect', function() { 
            self.online = false;
            console.log("RPC disconnected",arguments);
   			self.events.emit('rpc-disconnect');

            _.each(self.pending, function(info, id) {
                info.callback({ error : "Connection Closed"});
            })

            self.pending = { }
        })

        self.socket.on('user-login', function(msg){
            //window.location.reload();
        })
        self.socket.on('user-logout', function(msg){
            //window.location.reload();
        })

        self.socket.on('message', function(msg) {
            console.log("MESSAGE:",msg)
            if(self.trace) {
                if(self.trace === 1 || self.trace === true)
                    console.log('RPC ['+self.id+']:',msg.op);
                else
                if(self.trace === 2)
                    console.log('RPC ['+self.id+']:',msg.op,msg);                
            }
        	self.events.emit(msg.op, msg);
        })

        self.socket.on('rpc::response', function(msg) {
            if(msg._resp && self.pending[msg._resp])
                self.pending[msg._resp].callback.call(this, msg.err, msg.resp);
            else
            if(!self.pending[msg._resp]) {
                console.log("RPC received unknown rpc callback (strange server-side retransmit?)");
            }
            delete self.pending[msg._resp];
        })

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
    }

    close(){
        if(this.socket)
            this.socket.close();
    }

    on(op, callback) {
        this.events.on(op, callback);
    }

    dispatch(msg, callback) {

        if(!callback)
            return this.socket.emit('message', msg);

        this.pending[this._req] = {
            ts : Date.now(),
            callback : function(err, resp) {
                callback(err, resp);
            }
        }

        this.socket.emit('rpc::request', { 
            req : msg,
            _req : this._req,
        });

        this._req++;
    }
}

function Events() {
    var self = this;

    var events = { }
    var listeners = null;
    var refs = [], mevents = [];


    self.on = function(op, fn) {
        if(!fn)
            throw new Error("events::on() - callback is required");
        var uuid = NUID.next();
        if(!events[op])
            events[op] = { }
        events[op][uuid] = fn;//{ uuid : uuid, fn : fn }
        refs[uuid] = op;
        return uuid;
    }

    self.mon = function(op, fn){
        var uuid = self.on(op, fn);
        mevents.push(uuid);
        return uuid;
    }

    self.on('destroy', function(){
        _.each(mevents, function(uuid){
           self.off(uuid);
        });
    })

    self.off = function(uuid, op) {
        if (uuid) {
            var op = refs[uuid];
            delete refs[uuid];
            delete events[op][uuid];
        }else if (op) {
            _.each(events[op], function(fn, uuid){
                delete refs[uuid];
            });

            delete events[op];
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

            var list = events[msg.op];
            list && _.each(list, function(fn) {
                fn.apply(self, args);
            })

            listeners && _.each(listeners, function(listener) {
                listener.emit.apply(listener, args);
            })
        }
    }

    self.emitAsync = function(op) {
        dpc(function(){
            self.emit(op);
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

