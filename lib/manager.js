const fs = require('fs');
const _ = require('underscore');


class ModuleManager {
	constructor(app) {
		this.app = app;
		this.rpc = app.rpc;
	}

	init(callback) {
		this.rpc.on("UX.ctl.open", (req, callback) => {
	   		if(!this.isValid(req.module))
				return callback({error: "Invalid module"})

			this.open(req.module, req.args, {}, callback);
	   	})

	   	callback();
	}

	isValid(module){
		console.log("module:", module)
		if(!module)
			return false

		return true;//(module == "test");
	}


	open(moduleName, args, cmdArgs, callback){
		console.log("openModule:1: ", moduleName, args)
		var args = args || {};
		_.each(args, function(v, k){
			if(v === undefined)
				delete args[k]
		})
		args = _.extend({
	   		width: 1200,
	   		height: 800,
	   		frame: false,
	   		transparent: true
	   	}, args, {
	   		new_instance: true
	   	})
	   	if(args.x == undefined || args.y == undefined)
	   		args.position = "center";

	   	//@matoo TODO cmdArgs
//	   	args.inject_js_start = 'var __cmdArgs='+JSON.stringify(cmdArgs)+';';
	   	args.inject_js_start = "file://C:/dev/lsi/soar-dsn-player/modules/test/inject.js";

	   	console.log("openModule:2: ", moduleName, args)

	   	if(moduleName == "i18n"){
	   		this.i18nEditor.toggleEditor();

	   		return;
	   	}

		// console.log("CONFIG".magenta.bold, this.config);

	   	var mFile = moduleName+"/"+moduleName+".html";
	   	var moduleFile = "modules/"+mFile;
	   	if(!fs.existsSync(moduleFile)){
	   		moduleFile = path.join(this.config.moduleFolder, mFile);
//	   		moduleFile = path.join(this._externalModulePath, mFile);
	   		if(!fs.existsSync(moduleFile)) {
	   			console.log("unable to locate module:".red.bold, moduleFile);
	   			return callback({error: "No such module available"})
	   		}

	   		moduleFile = "file://"+moduleFile;
	   	}

	   	console.log("moduleFile:".bold,moduleFile);
console.log("nw:".magenta.bold,nw);
		nw.Window.open(moduleFile, args, (win) => {
			console.log("module-created:", moduleName)
			callback(null, {success: true});
	   	})
	}

}



module.exports = ModuleManager;
