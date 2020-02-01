
const utils = require('./lib/utils');
const uid = require('./lib/uid');
const Module = require('./lib/module');
const Application = require('./lib/application');
const Config = require('./lib/config');
const Network = require('./lib/network');
const PopupProxy = require('./lib/popup-proxy');
const Popup = require('./lib/popup');
const Events = require('./lib/events');

global.dpc = (t,fn)=>{
	if(typeof(t) == 'function'){
		if(typeof(fn) == 'number')
			setTimeout(t, fn);
		else
			setImmediate(t);
	}else{
		setTimeout(fn,t);
	}
}

module.exports = {
    Module, 
    Application, 
    Network,
    Config,
    PopupProxy,
    Popup,
    Events,
    utils,
    uid,
}