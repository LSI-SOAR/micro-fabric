const _ = require('underscore');
const { EventEmitter } = require("events");

class PopupProxy extends EventEmitter {
    constructor(module, config) {
    	super();
    	this.module = module;
    	this.config = config;
    	this.uid = config.uid;
    	this.init();
    }
    init(){
    	this.onRPC("closed", (args)=>{
    		this.emit("closed", args);
    	});
    	this.onRPC("init", ()=>{
    		if(this.state)
    			this[this.state]();
    	})
    }
    show(args, callback){
    	this.state = "show";
    	this.dispatch("show", args || {}, callback);
    }
    hide(args, callback){
    	this.state = "hide";
    	this.dispatch("hide", args || {}, callback);
    }
    close(args, callback){
    	this.state = "close";
    	this.dispatch("close", args || {}, callback);
    }
    dispatch(eventName, args, callback){
    	this.module.fireRPCEvent(`POPUP.${this.uid}.`+eventName, args, callback);
    }
    onRPC(eventName, callback){
        this.module.onRPCEvent(`POPUP.${this.uid}.`+eventName, (args, next)=>{
            callback(args, (err, result)=>{
                if(!_.isFunction(next))
                    return
                if(err)
                    return next(err);

                next(result);
            })
        });
    }
}


module.exports = PopupProxy;