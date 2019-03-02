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
            this.adjustSizePosition(args);
            this.show(args, callback);
        });
        this.onRPC("hide", (args, callback)=>{
            this.hide(args, callback);
        });
        this.onRPC("close", (args, callback)=>{
            this.close(args, callback);
        });

        this.dispatch("init", {});

        callback();
    }
    show(args, callback){
        this.emit("before-show", args);
        var win = this.window;
        if(win){
            win.show(true);
            win.focus();
        }
        callback && callback(null, {success:true});
        this.emit("after-show", args);
    }
    hide(args, callback){
        this.emit("before-hide", args);
        this.window && this.window.hide();
        callback && callback(null, {success:true});
    }
    close(args, callback){
        this.emit("before-close", args);
        this.window && this.window.close();
        callback && callback(null, {success:true});
    }
    adjustSizePosition(args){
        var win = this.window;
        if(!win)
            return
        if(args.x && args.y)
            win.moveTo(args.x, args.y);
        if(args.width != undefined && args.height != undefined)
            win.resizeTo(args.width, args.height);
    }
    dispatch(eventName, args, callback){
        this.emit(eventName, args);
        if(callback){
            this.fireRPCEvent(`POPUP.${this.uid}.`+eventName, args, callback);
        }else{
            this.fireRPCEvent(`POPUP.${this.uid}.`+eventName, args);
        }
    }
    onRPC(eventName, callback){
        eventName = `POPUP.${this.uid}.`+eventName;
        this.onRPCEvent(eventName, (args, next)=>{
            console.log("popup:"+eventName, args)
            callback(args, (err, result)=>{
                if(!_.isFunction(next))
                    return
                if(err)
                    return next(err);

                next(null, result);
            });
        });
    }
}


module.exports = Popup;