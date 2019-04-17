const NUID = require('NUID');
const _ = require('underscore');

class Events {

    constructor() {
        // var self = this;

        this.events = { }
        this.listeners = null;
        this.refs = [ ]
//        , mevents = [];

        this.patterns = new Map();

        this.cache = { }

    }

    on(op, fn) {
        if(!fn)
            throw new Error("events::on() - callback is required");

//        let fn = (...args) => { fn_(JSON.}

        this.cache = { }
        var uid = NUID.next();
        if(!this.events[op])
            this.events[op] = { }
        this.events[op][uid] = fn;//{ uuid : uuid, fn : fn }
        this.refs[uid] = op;

        return uid;
    }


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

        if(pattern.indexOf('*') > -1) {

            pattern = pattern.replace(/\./g,'\\.');
            let parts = pattern.split('*');
            let t = '^'+parts.join('(.+)')+'$';
            console.log("==========================------>   ",t.yellow.bold);
            let regexp = new RegExp(t);

            let list = this.patterns.get(regexp);
            if(list) {
                list.push(fn);
            }
            else
                list = [fn];
            this.patterns.set(regexp, [fn]);

        }
        else {
            this.on(pattern,fn);

//            this.

        }



    }

    publish(subject, msg) {
        this.dispatch(subject, msg);
    }

    // this function supports 2 types of arguments.  single object that contains opcode { op : 'msg' } or 'msg', args...
    dispatch(subject, msg, callback) {

//        let msg = JSON.stringify(msg_);

        this.patterns.forEach((list, regexp) => {
            if(regexp.test(subject)) {
                console.log("MATCH MATCH MATCH MATCH MATCH MATCH: ".yellow.bold, subject, regexp);
                list.forEach( (fn) => { fn(msg,callback,subject) });
            }
        })

        _.each(this.events[subject], (fn) => {
            fn(msg, callback, subject);
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