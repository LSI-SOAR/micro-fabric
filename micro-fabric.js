
const utils = require('./lib/utils');
const Module = require('./lib/module');
const Application = require('./lib/application');

global.dpc = (t,fn) => { if(!fn) setTimeout(t,0); else setTimeout(fn,t); }

module.exports = {
    Module, Application, utils
}