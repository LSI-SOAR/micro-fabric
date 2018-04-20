
const Module = require('./module');
// const WebSocketClient = require('./lib/websocket-client');

class Application extends Module {
	constructor(appFolder, options = { }) {
		super(options);

		this.appFolder = appFolder;

	}


	getConfig() {
		// TODO - move from Helper  ???   MOVE TO Module?
	}

	getPackageInfo() {
		// TODO - move from Helper
	}
}

module.exports = Application;
