"use strict";
var os 		= require('os');
var path  	= require('path');
var fs 		= require("fs");

var PLATFORM, NATS, STAN;
var BIN = path.join(__dirname, 'bin')
switch(os.platform()) {
	case 'win32' : {
		PLATFORM = 'windows';
		NATS = 'nats/gnatsd.exe';
		STAN = 'stan/nats-streaming-server.exe';
	} break;
	case 'darwin' : {
		PLATFORM = 'darwin';
		NATS = 'nats/gnatsd'
		STAN = 'stan/nats-streaming-server'
	} break;
	case 'linux' : {
		PLATFORM = 'linux'
		NATS = 'nats/gnatsd'
		STAN = 'stan/nats-streaming-server'
	} break;
}

if(PLATFORM == "linux" || PLATFORM == "darwin"){
	var mode = 0755;
	fs.chmodSync(path.join(BIN, PLATFORM, NATS), mode);
	fs.chmodSync(path.join(BIN, PLATFORM, STAN), mode);
}
