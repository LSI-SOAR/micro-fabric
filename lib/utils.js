const os = require('os');
const fs = require('fs');
const path = require('path');
const _ = require('underscore');
const { spawn, exec } = require('child_process');
const { EventEmitter } = require("events");
const ansiRegex = require('ansi-regex');

var utils = module.exports = {
    get platform() {
        let platform = os.platform();
        platform = ({ 'win32' : 'windows' }[platform]) || platform;
        let arch = os.arch();
        return `${platform}-${arch}`;
    }
}

utils.BufferSuffixFromJSON = (buffer, suffix) => {
    suffix = JSON.stringify(suffix);
    let suffixLen = Buffer.alloc(4);
    suffixLen.writeInt32LE(suffix.length, 0);
    return Buffer.concat([buffer,Buffer.from(suffix), suffixLen]);
}

utils.BufferSuffixToJSON = (buffer) => {
    let suffixLen = buffer.readInt32LE(buffer.length-4);
    let suffix = buffer.toString('utf8',buffer.length-4-suffixLen,buffer.length-4);
    return {
        suffix : JSON.parse(suffix),
        length : buffer.length - (suffixLen + 4)
    };
}

utils.sleep = (msec) => {
    return new Promise((resolve) => {
        dpc(msec, resolve);
    })
}

utils.merge = (dst, ...src_)=>{
    src_.forEach((src)=>{
        _.each(src, (v, k)=>{
            if(_.isArray(v)){
                dst[k] = [];
                utils.merge(dst[k], v);
            }else if(_.isObject(v)) {
                if(!dst[k] || _.isString(dst[k]) || !_.isObject(dst[k]))
                    dst[k] = { };
                utils.merge(dst[k], v);
            }else{
                if(_.isArray(src))
                    dst.push(v);
                else
                    dst[k] = v;
            }
        })
    })
    return dst;
}

utils.match = (text, regexp) => {
    return ((text && text.match(regexp) || {}).groups || {});
}

utils.clone = (o) => {
    return JSON.parse(JSON.stringify(o));
}

utils.args = (args) => {
    args = args || process.argv.slice(2);

    let o = { }
    args.map((arg) => {
        const { prop, value } = utils.match(arg,/^--(?<prop>[\w-]+)(=(?<value>.+))?$/);
        if(value === undefined)
            o[prop] = true;
        else
            o[prop] = value;
    })
    return o;
}

if(!Number.prototype.toFileSize) {
  Object.defineProperty(Number.prototype, 'toFileSize', {
     value: function(a, asNumber){
         var b,c,d;
         var r = (
             a=a?[1e3,'k','B']:[1024,'K','iB'],
             b=Math,
             c=b.log,
             d=c(this)/c(a[0])|0,this/b.pow(a[0],d)
         ).toFixed(2)

         if(!asNumber){
             r += ' '+(d?(a[1]+'MGTPEZY')[--d]+a[2]:'Bytes');
         }
         return r;
     },
     writable:false,
     enumerable:false
  });
}

utils.asyncMap = (_list, fn, callback)=>{
    if(!_list || !Array.isArray(_list))
        return callback(new Error("asyncMap() supplied argument is not array"));
    var list = _list.slice();
    var result = [ ];
    
    var digest = ()=>{
        var item = list.shift();
        if(!item)
            return callback(null, result);
        fn(item, (err, data)=>{
            if(err)
                return callback(err);
            data && result.push(data);
            dpc(digest);
        })
    }

    digest();
}

if(!Array.prototype.hasOwnProperty('asyncForEach')) {
  Object.defineProperty(Array.prototype, 'asyncForEach', {
     value: (iterator) => {
        return new Promise(async (resolve) => {
            for(let i = 0; i < this.length; i++) {
                await iterator(this[i]);
            }
            resolve();
        })
     },
     writable:false,
     enumerable:false
  });
}

if(!Array.prototype.hasOwnProperty('asyncMap')) {
  Object.defineProperty(Array.prototype, 'asyncMap', {
     value: (iterator) => {
        return new Promise(async (resolve) => {
            let result = [ ];
            for(let i = 0; i < this.length; i++)
                result.push(await iterator(this[i],i));
            resolve(result);
        })
     },
     writable:false,
     enumerable:false
  });
}

if(!Array.prototype.hasOwnProperty('asyncFilter')) {
  Object.defineProperty(Array.prototype, 'asyncFilter', {
     value: (iterator) => {
        return new Promise(async (resolve) => {
            let result = [ ];
            for(let i = 0; i < this.length; i++) {
                let ret = await iterator(this[i],i);
                ret && result.push(ret);
            }
            resolve(result);
        })
     },
     writable:false,
     enumerable:false
  });
}

utils.Process = class Process extends EventEmitter {
    constructor(options) {
        super();

        this.options = Object.assign({
            relaunch : true,
            delay : 3000,
            tolerance : 5000,
            restarts : 0
        },options);

        this.logger = this.options.logger;
        this.relaunch = this.options.relaunch;
        this.delay = this.options.delay;
        this.restarts = 0;//this.options.restarts;
        this.tolerance = this.options.tolerance;
        this.ts = Date.now();
        this.kick = false;

        this.SIGTERM = this.createInterrupt('SIGTERM');
        this.SIGINT = this.createInterrupt('SIGINT');
    }
    
    terminate(interrupt = 'SIGTERM') {
        if(this.process) {
            this.relaunch = false;
            this.process.kill(interrupt);
            delete this.process;
        }
        else {
            this.relaunch = false;
        }

        this.emit('halt');
        // if(this.logger) {
        //     this.logger.stop();
        // }
        return Promise.resolve();
    }

    restart(interrupt = 'SIGTERM') {
        if(this.process) {
            this.kick = true;
            this.process.kill(interrupt);
        }

        return Promise.resolve();
    }

    createInterrupt(interrupt) {
        return (t = 1e4, fallback = undefined) => {
            return new Promise((resolve, reject) => {
                const ts = Date.now();
                let success = false;
                const exitHandler = (code) => {
                    success = true;
                    return resolve(code);
                }
                this.once('exit', exitHandler);
                this.relaunch = false;
                // console.log('...'+interrupt);
                this.process.kill(interrupt);

                const monitor = () => {
                    if(success)
                        return;
                    let d = Date.now() - ts;
                    if(d > t) {
                        this.off('exit', exitHandler);
                        if(fallback) {
                            return fallback().then(resolve,reject);
                        }
                        else {
                            return reject();
                        }
                    }
                    dpc(30, monitor);
                }
                dpc(5, monitor);
            })
        }
    }

    run() {
        return new Promise((resolve, reject) => {
            let fn_ = (typeof(this.options.args) == 'function');
            let args = fn_ ? this.options.args().slice() : this.options.args.slice();

            this.options.verbose && console.log("running:", args);

            if(this.process) {
                // throw new Error("Process is already running!");
                console.error("Process is already running",this);
                return reject('process is already running');
            }

            let proc = args.shift();
            this.name = this.options.name || proc;
            let cwd = this.options.cwd || process.cwd();
            let windowsHide = this.options.windowsHide;
            let detached = this.options.detached;
            let env = (this.options.env && Object.keys(this.options.env).length) ? this.options.env : undefined;

            //let filter = options.filter || function(data) { return data; };

            let filter_ = (data) => { return data; }
            let stdout = (typeof(this.options.stdout) == 'function') ? this.options.stdout : filter_;
            let stderr = (typeof(this.options.stderr) == 'function') ? this.options.stderr : filter_;

            // console.log(proc, args, { cwd, windowsHide });
            this.emit('start');
            this.process = spawn(proc, args, { cwd, windowsHide, detached, env });

            // Good example here for piping directly to log files: https://nodejs.org/api/child_process.html#child_process_options_detached
            if(this.options.pipe) {
                this.process.stdout.pipe(process.stdout);
                this.process.stderr.pipe(process.stderr);
                this.stdin = process.openStdin();
                this.stdin.pipe(this.process.stdin);
            }
            else 
            if(this.options.splitLines) {
                this.process.stdout.on('data',(data) => {
                     data.toString('utf8').split('\n').map( l => console.log(l) );
                    //process.stdout.write(data);
                    if(this.options.logger)
                        this.options.logger.write(data);
                });

                this.process.stderr.on('data',(data) => {
                     data.toString('utf8').split('\n').map( l => console.log(l) );
                    //process.stderr.write(data);
                    if(this.options.logger)
                        this.options.logger.write(data);
                });
            }
            else 
            {
                this.process.stdout.on('data',(data) => {
                    //console.log(data.toString('utf8'));
                    let text = stdout(data);
                    if(!this.mute && text)
                        process.stdout.write(text);
                    if(this.options.logger)
                        this.options.logger.write(data);
                });

                this.process.stderr.on('data',(data) => {
                    //console.error(data.toString('utf8'));
                    let text = stdout(data);
                    if(!this.mute && text)
                        process.stderr.write(text);
                    if(this.options.logger)
                        this.options.logger.write(data);
                });
            }

            this.process.on('exit', (code) => {
                this.emit('exit',code);
                let { name } = this;
                if(code)
                    console.log(`WARNING - child ${name} exited with code ${code}`);
                delete this.process;
                let ts = Date.now();
                if(this.options.restarts && this.ts && (ts - this.ts) < this.tolerance) {
                    this.restarts++;
                }
                if(this.options.restarts && this.restarts == this.options.restarts) {
                    this.relaunch = false;
                    console.log(`Too many restarts ${this.restarts}/${this.options.restarts} ...giving up`);
                }
                this.ts = ts;
                if(this.relaunch) {
                    if(this.options.restarts && !this.kick)
                        console.log(`Restarting process '${name}': ${this.restarts}/${this.options.restarts} `);
                    else
                        console.log(`Restarting process '${name}'`);
                    dpc(this.kick ? 0 : this.delay, () => {
                        this.kick = false;
                        if(this.relaunch)
                            this.run();
                    });
                }
                else {
                     this.emit('halt')
                }
            });

            resolve();
        })            
    }
}


utils.getConfig = function(name, defaults = null) {
    let data = [ ];
    [name, name+'.'+os.hostname(), name+'.local'].forEach((filename) => {
        if(fs.existsSync(filename)) 
            data.push(fs.readFileSync(filename) || null);
    })

    if(!data[0] && !data[1]) {
        return defaults;
    }

    let o = defaults || { }
    data.forEach((conf) => {
        if(!conf || !conf.toString('utf-8').length)
            return;
        let layer = eval('('+conf.toString('utf-8')+')');
        utils.merge(o, layer);
    })

    return o;
}

utils.watchConfig = (filename, fn) => {
    let first = true;
    const update = () => {
        try {
            let v = utils.getConfig(filename);
            fn(v, first);
            first = false;
        } catch(ex) { console.log(ex); }
    }
    fs.watch(filename, update);
    update();
}

utils.readJSON = function(filename) {
    if(!fs.existsSync(filename))
        return undefined;
    var text = fs.readFileSync(filename, { encoding : 'utf-8' });
    if(!text)
        return undefined;
    try { 
        return JSON.parse(text); 
    } catch(ex) { 
        console.log("Error parsing file:",filename); 
        console.log(ex); 
        console.log('Offending content follows:',text); 
    }
    return undefined;
}

utils.getTS = function(src_date) {
    var a = src_date || (new Date());
    var year = a.getFullYear();
    var month = a.getMonth()+1; month = month < 10 ? '0' + month : month;
    var date = a.getDate(); date = date < 10 ? '0' + date : date;
    var hour = a.getHours(); hour = hour < 10 ? '0' + hour : hour;
    var min = a.getMinutes(); min = min < 10 ? '0' + min : min;
    var sec = a.getSeconds(); sec = sec < 10 ? '0' + sec : sec;
    //var time = year + '-' + month + '-' + date + ' ' + hour + ':' + min + ':' + sec;
    return `${year}-${month}-${date} ${hour}:${min}:${sec}`;
}

const _cts_log = console.log;
const _cts_warn = console.warn;
const _cts_error = console.error;

utils.consoleTS = function(enable = true) {

    if(!enable) {
        console.log = _cts_log;
        console.warn = _cts_warn;
        console.error = _cts_error;
    }
    else {

        console.log = function(...args) {
            args.unshift(utils.getTS());
            return _cts_log.apply(console, args);
        }

        console.warn = function(...args) {
            args.unshift(utils.getTS());
            return _cts_warn.apply(console, args);
        }

        console.error = function(...args) {
            args.unshift(utils.getTS());
            return _cts_error.apply(console, args);
        }
    }
}

utils.MAX_LOG_FILE_SIZE = 50 * 1014 * 1024
utils.Logger = function(options) {
    var self = this;
    var file = options.filename;

    var logIntervalTime = options.logIntervalTime || 24 * 60 * 60;
    var logFilesCount   = options.logFilesCount || 7;
    var newFile     = '';
    var fileDate    = new Date();
    var folderPath  = '';
    var ansiRegex_ = ansiRegex();

    buildNewFileName();

    var flag = false;
    self.write = function(text) {
        if(!options.ansi)
            text = (text||'').toString().replace(ansiRegex_,'');
        if( flag ){
            flag = false;
            copyFile(function(){
                writeLog(text);
            });
            return;
        }
        writeLog(text);
    }

    let running = true;
    self.halt = function() {
        if(!running)
            return;
        running = false;
        if(this.timeout_)
            clearTimeout(this.timeout_);
        if(this.interval_)
            clearInterval(this.interval_);
    }

    var d = new Date();

    if (options.testingMode){
        d.setSeconds(d.getSeconds()+20);
    }else{
        d.setHours(23);
        d.setMinutes(59);
        d.setSeconds(59);
    }

    var d2      = new Date();
    var diff    = d.getTime()-d2.getTime();
    var fullDayMilliSeconds = 24 * 60 * 60 * 1000;
    if (diff < 0) {
        diff = fullDayMilliSeconds + diff;
    };

    this.timeout_ = setTimeout(function(){
        clearTimeout(this.timeout_);
        console.log('log-rotation started.'.red.bold, new Date());
        flag        = true;
        this.interval_ = setInterval(function(){
            flag        = true;
        }, logIntervalTime * 1000);
    }, diff)

    function writeLog(text){
        try {
            fs.appendFileSync(file, text);
        } catch(ex) { console.log("Logger unable to append to log file:", file); }
    }

    function buildNewFileName(){
        var parts = file.split('/');
        var filename = parts.pop();
        var ext = filename.split('.');
        if (ext.length > 1) {
            ext = '.'+ext[ext.length-1];
        }else{
            ext = '';
        }
        folderPath = parts.join('/');

        newFile = 'L-$$$'+ext;
    }

    function copyFile(callback){
        fs.readFile(file, function(err, data){
            if (err)
                return callback();

            var fName = newFile.replace('$$$', utils.getTS(fileDate).replace(/:/g, '-').replace(" ", "_") );
            fs.writeFile( path.join(folderPath, '/', fName), data, function(err, success){
                if (err)
                    return callback();

                fileDate = new Date();
                fs.writeFile(file, '', function(){
                    callback();

                    var cmd = 'gzip "'+fName+'"';
                    exec(cmd, {cwd: folderPath}, function (error, stdout, sterr) {
                        console.log(('gzip'.green)+':', cmd, "result:", arguments);
                        try {
                            removeOldLogs();
                        } catch(ex) {
                            console.log("error removing past logs -",ex);
                        }
                    });
                });
            });
        });
    }

    function removeOldLogs(){
        var files = [];
        function done(a){
            var fLength = files.length;
            if ( fLength <= logFilesCount)
                return;

            files = _.sortBy(files, function(c){ return c.t;});
            for(var i = 0; i < (fLength - logFilesCount); i++){
                fs.unlinkSync(files[i].file);
            }
        }

        fs.readdir(folderPath, function(err, list) {
            if (err)
                return done(err);

            var pending = list.length;
            if (!pending)
                return done();

            list.forEach(function(file) {
                if (file.indexOf('L-')!==0){
                    if (!--pending)
                        done();
                    return;
                }

                file = folderPath + '/' + file;
                fs.stat(file, function(err, stat) {
                    if (stat) {
                        files.push({file: file, t: stat.ctime.getTime()})
                    }
                    if (!--pending)
                        done();
                });
            });
        });
    }
}

utils.getExecTarget = (target) => {
    if(utils.platform.startsWith('windows'))
        target += '.exe';
    return path.join(utils.platform,target);
}

utils.storageSize_ = (folder, options, callback) => {
    folder = path.resolve(folder);
    fs.lstat(folder, (err, stat) => {
        if(err || !stat)
            return callback(err, stat || 0);
        if(!stat.isDirectory()) {
            return callback(null, !options.filter || options.filter(folder) ? stat.size : 0);
        }

        fs.readdir(folder, (err, list) => {
            if(err)
                return callback(err);

            utils.asyncMap( 
                list.map((f) => path.join(folder, f)),
                (f, callback) => utils.storageSize_(f, options, callback),
                (err, sizes) => callback(err, sizes && sizes.reduce((p, s) => p + s, stat.size))
            );
        })
    })
}

utils.storageSize = (folder, options = { }) => {
    return new Promise((resolve, reject) => {
        utils.storageSize_(folder, options, (err, ret) => {
            if(err)
                return rject(err);
            resolve(ret);
        })
    })
}