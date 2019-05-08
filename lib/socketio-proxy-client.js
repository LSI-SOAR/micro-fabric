if(typeof(nw) != 'undefined')
    var io = require('./io');
else
    var io = require('socket.io-client');

const _ = require('underscore');
const NUID = require('nuid');
const RPC = require('./rpc');

const dpc = (t,fn) => { if(typeof(t) == 'function') return setTimeout(t,0); else return setTimeout(fn,t); }

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
        this.connected = false;
        if (this.options.path)
          this.connect();
    }

    initEvent() {
        this.events = new Events();
    }

    connect(){
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
            this.events.emit('offline');
        })
        this.socket.on('disconnect', () => { 
            this.online = false;
   			this.events.emit('rpc-disconnect');

            this.rpc.detach(this.uid, this.socket);
        })

        this.socket.on('user-login', (msg) => {
        })
        this.socket.on('user-logout', (msg) => {
        })
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
        events[subject][uuid] = fn;
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
