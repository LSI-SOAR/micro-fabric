
const utils = require('./lib/utils');
const Module = require('./lib/module');
const Application = require('./lib/application');
const Config = require('./lib/config');
const Network = require('./lib/network');
const PopupProxy = require('./lib/popup-proxy');
const Popup = require('./lib/popup');

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
    utils,
    PopupProxy,
    Popup
}