const NUID = require('NUID');
const _ = require('underscore');

class Events {

    constructor() {
        // var self = this;

        this.events = { }
        this.listeners = null;
        this.refs = [ ]
//        , mevents = [];

    }

    on(op, fn) {
        if(!fn)
            throw new Error("events::on() - callback is required");
        var uid = NUID.next();
        if(!this.events[op])
            this.events[op] = { }
        this.events[op][uid] = fn;//{ uuid : uuid, fn : fn }
        this.refs[uid] = op;
        return uid;
    }

    // self.mon = function(op, fn){
    //     var uuid = self.on(op, fn);
    //     mevents.push(uuid);
    //     return uuid;
    // }

    // self.on('destroy', function(){
    //     _.each(mevents, function(uuid){
    //        self.off(uuid);
    //     });
    // })

    off(uid, op) {
        if (uid) {
            var op = this.refs[uid];
            delete this.refs[uid];
            delete this.events[op][uid];
        }else if (op) {
            _.each(this.events[op], function(fn, uuid){
                delete this.refs[uid];
            });

            delete this.events[op];
        };
    }

    subscribe(pattern, fn) {
        console.log("EVENTS::SUBSCRIBE NOT IMPLEMENTED!", pattern);
        console.log("EVENTS::SUBSCRIBE NOT IMPLEMENTED!", pattern);
        console.log("EVENTS::SUBSCRIBE NOT IMPLEMENTED!", pattern);
    }

    // this function supports 2 types of arguments.  single object that contains opcode { op : 'msg' } or 'msg', args...
    dispatch(subject, msg, callback) {

        let list = this.events[subject];
        list && _.each(list, (fn) => {
            fn(subject, msg, callback);
        })

//        var args = Array.prototype.slice.apply(arguments);
/*
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
*/


    }
/*
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
*/    
}

module.exports = Events;