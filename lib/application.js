
const Module = require('./module');
const I18nEditor = require('./i18n-editor');
const _ = require('underscore');
const path = require('path');
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

	initI18nEditor(config){
		var config = _.extend({
			dataFolder: path.join(this.appFolder, "config")
		}, config || {})
		this.i18nEditor = new I18nEditor(this, config);
	}
}

module.exports = Application;
