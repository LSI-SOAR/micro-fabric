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
    show(callback){
    	this.state = "show";
    	this.dispatch("show", {}, callback);
    }
    hide(callback){
    	this.state = "hide";
    	this.dispatch("hide", {}, callback);
    }
    close(callback){
    	this.state = "close";
    	this.dispatch("close", {}, callback);
    }
    dispatch(eventName, args, callback){
    	this.module.rpc.dispatch(`POPUP.${this.uid}.`+eventName, args, callback);
    }
    onRPC(eventName, callback){
        this.module.rpc.on(`POPUP.${this.uid}.`+eventName, (args, next)=>{
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