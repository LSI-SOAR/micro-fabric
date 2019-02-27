const _ = require('underscore');
const Module = require("./module");

class Popup extends Module {
    constructor(config) {
        config = _.extend({
            window:{show:false},
            autoHide:true
        }, config);

        super(config);
    	this.init((callback)=>{
            this.initPopupEvents(callback);
        });
    }
    initPopupEvents(callback){
        var win = this.window;
        if(win){
        	win.on("close", (args)=>{
        		this.dispatch("closed", {});
                win.hide();
                dpc(300, ()=>{
                    win.close(true);
                })
                
        	});

            if(this.config.autoHide)
                win.on("blur", ()=>{
                    win.hide();
                })
        }

        this.onRPC("show", (args, callback)=>{
            if(win){
                win.show(true);
                win.focus();
            }
            callback(null, {success:true});
        });
        this.onRPC("hide", (args, callback)=>{
            win && win.show(false);
            callback(null, {success:true});
        });
        this.onRPC("close", (args, callback)=>{
            win && win.close();
            callback(null, {success:true});
        });

        this.dispatch("init", {});

        callback();
    }
    dispatch(eventName, args, callback){
        this.emit(eventName, args);
        if(callback){
            this.rpc.dispatch(`POPUP.${this.uid}.`+eventName, args, callback);
        }else{
            this.rpc.dispatch(`POPUP.${this.uid}.`+eventName, args);
        }
    	
    }
    onRPC(eventName, callback){
        this.rpc.on(`POPUP.${this.uid}.`+eventName, (args, next)=>{
            callback(args, (err, result)=>{
                if(!_.isFunction(next))
                    return
                if(err)
                    return next(err);

                next(null, result);
            })
        });
    }
}


module.exports = Popup;