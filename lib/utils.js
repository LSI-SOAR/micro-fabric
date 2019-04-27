const os = require('os');
const fs = require('fs');
const path = require('path');
const _ = require('underscore');
const { spawn, exec } = require('child_process');
const { EventEmitter } = require("events");

var utils = module.exports = { }


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
    if(!_list || !_.isArray(_list))
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
    }
    
    terminate() {
        if(this.process) {
            this.relaunch = false;
            this.process.kill('SIGTERM');
            delete this.process;
        }
        else {
            this.relaunch = false;
        }

        this.emit('halt');
        // if(this.logger) {
        //     this.logger.stop();
        // }
    }

    restart() {
        if(this.process) {
            this.kick = true;
            this.process.kill('SIGTERM');
        }
    }

    run() {
        this.options.verbose && console.log("running", this.options.args)
        if(this.process) {
            // throw new Error("Process is already running!");
            console.error("Process is already running",this);
            return;
        }

        let fn_ = (typeof(this.options.args) == 'function');
        let args = fn_ ? this.options.args().slice() : this.options.args.slice();
        let proc = args.shift();

        this.name = this.options.name || proc;

        let cwd = this.options.cwd || process.cwd();
        let windowsHide = this.options.windowsHide;
        let detached = this.options.detached;
        let env = (this.options.env && Object.keys(this.options.env).length) ? this.options.env : undefined;
        // console.log(proc, args, { cwd, windowsHide });
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
                process.stdout.write(data);
                if(this.options.logger)
                    this.options.logger.write(data);
            });

            this.process.stderr.on('data',(data) => {
                //console.error(data.toString('utf8'));
                process.stderr.write(data);
                if(this.options.logger)
                    this.options.logger.write(data);
            });
        }

        this.process.on('exit', (code) => {
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
    }
}


utils.getConfig = function(name, defaults = null) {
    function merge(dst, src) {
        _.each(src, (v, k) => {
            if(_.isArray(v)) { dst[k] = [ ]; merge(dst[k], v); }
            else if(_.isObject(v)) { if(!dst[k] || _.isString(dst[k]) || !_.isObject(dst[k])) dst[k] = { };  merge(dst[k], v); }
            else { if(_.isArray(src)) dst.push(v); else dst[k] = v; }
        })
    }

    let filename = name;//+'.conf';
    let host_filename = name+'.'+os.hostname();//+'.conf';
    let local_filename = name+'.local';//.conf';

    let data = [ ];

    fs.existsSync(filename) && data.push(fs.readFileSync(filename) || null);
    fs.existsSync(host_filename) && data.push(fs.readFileSync(host_filename) || null);
    fs.existsSync(local_filename) && data.push(fs.readFileSync(local_filename) || null);

    if(!data[0] && !data[1]) {
        // console.trace("Unable to read config file: ".bold+(filename+'').red.bold);
        // if(defaults)
        //     console.log("Using defaults:", defaults);
        return defaults;
        // throw new Error("Unable to read config file:"+(filename+''));
    }

    let o = defaults || { }
    _.each(data, (conf) => {
        if(!conf || !conf.toString('utf-8').length)
            return;
        let layer = eval('('+conf.toString('utf-8')+')');
        merge(o, layer);
    })

    return o;
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


utils.MAX_LOG_FILE_SIZE = 50 * 1014 * 1024
utils.Logger = function(options) {
    var self = this;
    var file = options.filename;

    var logIntervalTime = options.logIntervalTime || 24 * 60 * 60;
    var logFilesCount   = options.logFilesCount || 7;
    var newFile     = '';
    var fileDate    = new Date();
    var folderPath  = '';

    buildNewFileName();

    var flag = false;
    self.write = function(text) {
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
    let platform = os.platform();
    platform = ({ 'win32' : 'windows' }[platform]) || platform;
    let arch = os.arch();
    let ident = `${platform}-${arch}`;
    if(platform == 'windows')
        target += '.exe';
    return path.join(ident,target);
}
