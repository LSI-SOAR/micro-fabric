const _ = require('underscore');
const Module = require("./module");

class Popup extends Module {
    static getConfigFromUrl(){
        let params = (new URL(document.location)).searchParams;
        let json = params.get("__args__");
        //console.log("json", json)
        let args = {};
        if(json && json.length)
            args = JSON.parse(json).args;

        return args || {};
    }

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
                });
        	});

            win.on("focus", ()=>{
                setTimeout(()=>{
                    this.wasFocused = true;
                }, 200);
            })

            if(this.config.autoHide){
                win.on("blur", (e)=>{
                    if(this.wasFocused)
                        win.hide();

                    this.wasFocused = false;
                })
            }
        }

        this.onRPC("show", (options, callback)=>{
            this.adjustSizePosition(options);
            this.show(options, callback);
        });
        this.onRPC("hide", (args, callback)=>{
            this.hide(args, callback);
        });
        this.onRPC("close", (args, callback)=>{
            this.close(args, callback);
        });
        this.onRPC("args", (args, callback)=>{
            this.setArgs(args, callback);
        })
        this.on("after-hide", ()=>{
            if(this.config.autoClose)
                this.close({autoClose:1});
        })

        this.on("after-show", (args)=>{
            var autoFocusElement = this.autoFocusElement;
            if(!autoFocusElement)
                return
            if(typeof autoFocusElement == "function")
                autoFocusElement = autoFocusElement();

            autoFocusElement && autoFocusElement.focus && autoFocusElement.focus();
        });

        callback();
    }
    main(){
        this.dispatchInitEvent();
    }
    dispatchInitEvent(){
        this.dispatch("init", {}, (args)=>{
            this.setArgs(this.args);
        });
    }
    setArgs(args, callback){
        this.args = args;
        this.emit('args', args);
        callback && callback(null, {success:true});
    }
    show(options, callback){
        this.emit("before-show", options);
        var win = this.window;
        if(win){
            //win.show();
            //win.focus();
            setTimeout(()=>{
                win.focus();
                //this.wasFocused = true;
            }, 10)
        }
        callback && callback(null, {success:true});
        this.emit("after-show", options);
    }
    hide(args, callback){
        this.emit("before-hide", args);
        this.window && this.window.hide();
        callback && callback(null, {success:true});
        this.emit("after-hide", args);
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