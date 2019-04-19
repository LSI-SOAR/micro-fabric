const fs 			= require('fs');
const path 			= require('path');
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
		console.log("µFabric::Manager::init()");
		
		this.rpc.on("UX.ctl.module.create", (req, callback) => {
	   		if(!this.isValid(req.module))
				return callback({error: "Invalid module"})
			this.open(req.module, req.options, req.args, callback);
	   	})

	   	callback();
	}

	isValid(module){
		// console.log("module:", module)
		if(!module)
			return false

		return true;//(module == "test");
	}

	open(moduleName, options, args, callback){
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

	   	//console.log("µArgs".cyan.bold,µArgs,"\n\n","?"+querystring.stringify({ __args__ : JSON.stringify(µArgs) }));
	   	moduleFile += "?"+querystring.stringify({ __args__ : JSON.stringify(µArgs) });
	   	//console.log("~~~~~~~~~~~~ moduleFile:",moduleFile);
	   	//console.log("~~~~~~~~~~~~ module args:",options);
	   	if(options.x === 0)
	   		options.x = 1;
	   	if(options.y === 0)
	   		options.y = 1;

		nw.Window.open(moduleFile, options, (win) => {
			//console.log("module-created:", moduleName,"win:",win);
			let success = true;
			callback(null, { success, uid });
	   	})
	}

}



module.exports = ModuleManager;
