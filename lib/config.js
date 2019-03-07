const fs = require('fs-extra');
const path = require('path');
const utils = require('./utils');

class Config {
	constructor(file, options) {

		let folder = path.dirname(file);
		if(!fs.existsSync(folder))
			fs.ensureDirSync(folder);

		let isMissing = !fs.existsSync(file);

		let config = utils.getConfig(file) || { }
		Object.assign(this,config);

		this.store = () => {
			isMissing = false;
			return fs.writeFileSync(file, JSON.stringify(this, null, '\t'));
		}

		this.isMissing = () => {
			return isMissing;
		}
	}
}

module.exports = Config;