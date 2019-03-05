const fs 			= require('fs');
const _ 			= require('underscore');
const querystring 	= require('querystring');
const NUID 			= require('nuid');


class ModuleManager {
	constructor(app) {
		this.app = app;
		this.rpc = app.rpc;

		this.modules = { }
	}

	init(callback) {
		console.log("MANAGER INIT -----")
		this.rpc.on("UX.ctl.module.create", (req, callback) => {
	   		if(!this.isValid(req.module))
				return callback({error: "Invalid module"})

			// let { module, args } = req;
			// delete req.module;
			// delete req.args;

			this.open(req.module, req.options, req.args, callback);
	   	})

	   	callback();
	}

	isValid(module){
		console.log("module:", module)
		if(!module)
			return false

		return true;//(module == "test");
	}


	open(moduleName, options, args, callback){
		console.trace("************* openModule:1: ", moduleName, options)
		var options = options || {};
		_.each(options, function(v, k){
			if(v === undefined)
				delete options[k]
		})
		options = Object.assign({
	   		width: 1200,
	   		height: 800,
	   		frame: false,
	   		transparent: false,
	   		show : false
	   	}, options, {
	   		new_instance: true
	   	})
	   	if(options.x == undefined || options.y == undefined)
	   		options.position = "center";

	   	//options.inject_js_start = "file://C:/dev/lsi/soar-dsn-player/modules/test/inject.js";

	   	console.log("openModule:2: ", moduleName, options)

	   	if(moduleName == "i18n"){
	   		this.i18nEditor.toggleEditor();
	   		return;
	   	}

		// console.log("CONFIG".magenta.bold, this.config);
		if(path.extname(moduleName) == ".html" && fs.existsSync(moduleName)){
			if(fs.existsSync(path.join(process.cwd(), moduleName))){
				var moduleFile = moduleName.replace(/\\/g, "/");
			}else{
				var moduleFile = "file://"+moduleName.replace(/\\/g, "/");
			}
		}else{
		   	var mFile = moduleName+"/"+moduleName+".html";
		   	var moduleFile = "modules/"+mFile;
		   	if(!fs.existsSync(moduleFile)){
		   		moduleFile = path.join(this.config.moduleFolder, mFile);
		   		if(!fs.existsSync(moduleFile)) {
		   			console.log("unable to locate module:".red.bold, moduleFile);
		   			return callback({error: "No such module available"})
		   		}

		   		moduleFile = "file://"+moduleFile;
		   	}
		}

	   	let uid = NUID.next().toLowerCase();

	   	// this.modules[uid] = {
	   	// 	ident : moduleName,
	   	// 	file : moduleFile,
	   	// 	uid
	   	// }

	   	let µArgs = { 
	   		nats : this.app.config.nats.port, 
	   		stan : this.app.config.stan.port,
	   		uid,
	   		args,
	   		x:options.x,
	   		y:options.y,
	   		width:options.width,
	   		height:options.height,
	   		show : options.show
	   	};

	   	delete options.args;

	   	console.log("µArgs".cyan.bold,µArgs,"\n\n","?"+querystring.stringify({ __args__ : JSON.stringify(µArgs) }));

	   	moduleFile += "?"+querystring.stringify({ __args__ : JSON.stringify(µArgs) });

	   	console.log("~~~~~~~~~~~~ moduleFile:",moduleFile);
	   	console.log("~~~~~~~~~~~~ module args:",options);

		nw.Window.open(moduleFile, options, (win) => {
			console.log("module-created:", moduleName,"win:",win);

			let success = true;
			callback(null, { success, uid });
	   	})
	}

}



module.exports = ModuleManager;
