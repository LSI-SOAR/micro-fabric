const NUID = require('nuid');
const _ = require('underscore');

class Events {

    constructor() {
        this.events = { }
        this.listeners = null;
        this.refs = [ ]
        this.patterns = new Map();
        this.observers = [ ]
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
            let regexp = new RegExp(t);
            let list = this.patterns.get(regexp);
            if(list) {
                list.push(fn);
            }
            else
                list = [fn];
            this.patterns.set(regexp, list);
        }
        else {
            this.on(pattern,fn);
        }
    }

    publish(subject, msg) {
        this.dispatch(subject, msg);
    }

    dispatch(subject, msg, callback) {
        this.patterns.forEach((list, regexp) => {
            this.observers.forEach((o) => { o.fn(subject,msg); })
            if(regexp.test(subject)) {
                list.forEach( (fn) => { fn(msg,callback,subject) });
            }
        })

        _.each(this.events[subject], (fn) => {
            fn(msg, callback, subject);
        })
    }

    attach(fn) {
        if(typeof(fn) != 'function')
            throw new Error('µFabric::Events::attach() argument must be a function');
        let uid = NUID.next();
        this.observers.push({ uid, fn})
        return uid;
    }

    detach(uid) {
        this.observers = this.observers.filter(o => uid != o.uid);
    }
}

module.exports = Events;