const os = require('os');
const fs = require('fs');
const path = require('path');
const _ = require('underscore');
const { spawn } = require('child_process');

var utils = module.exports = { }


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

utils.Process = class Process {
    constructor(options) {
        this.options = Object.assign({
            relaunch : true            
        },options);
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
    }

    restart() {
        if(this.process) {
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

        this.relaunch = true;

        let args = this.options.args.slice();
        let proc = args.shift();

        let cwd = this.options.cwd || process.cwd();
        let windowsHide = this.options.windowsHide;
        //console.log(proc, args, { cwd, windowsHide });
        this.process = spawn(proc, args, { cwd, windowsHide });


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
            });

            this.process.stderr.on('data',(data) => {
                 data.toString('utf8').split('\n').map( l => console.log(l) );
                //process.stderr.write(data);
            });
        }
        else {
            this.process.stdout.on('data',(data) => {
                //console.log(data.toString('utf8'));
                process.stdout.write(data);
            });

            this.process.stderr.on('data',(data) => {
                //console.error(data.toString('utf8'));
                process.stderr.write(data);
            });
        }

        this.process.on('exit', (code) => {
            let { ident } = this;
            if(code)
                console.log(`WARNING - child ${ident} exited with code ${code}`);
            delete this.process;
            if(this.relaunch) {
                console.log("Restarting process");
                dpc(3000, () => {
                    if(this.relaunch)
                        this.run();
                });
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
        console.trace("Unable to read config file: ".bold+(filename+'').red.bold);
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

    setTimeout(function(){
        console.log('log-rotation started.'.red.bold, new Date());
        flag        = true;
        setInterval(function(){
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

            var fName = newFile.replace('$$$', UTILS.ts_string(fileDate).replace(/:/g, '-').replace(" ", "_") );
            fs.writeFile( path.join(folderPath, '/', fName), data, function(err, success){
                if (err)
                    return callback();

                fileDate    = new Date();
                fs.writeFile(file, '', function(){
                    callback();

                    var cmd = 'gzip "'+fName+'"';
                    exec(cmd, {cwd: folderPath}, function (error, stdout, sterr) {
                        console.log('GZIP EXEC'.green, "CMD:", cmd, "RESULT:", arguments)
                        removeOldLogs();
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
