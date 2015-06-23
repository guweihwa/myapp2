var bunyan = require('bunyan');

exports.version = '0.1.0';

exports.serverType = function () {
    // Server Type -
    // 1: Upload Server
    // 2: Converter Server
    // 3: Local Test Server
    var serverType = 3;
    if (process.argv[2]) {
        serverType = process.argv[2];  
    }

    return serverType;
}

exports.make_error = function(err, msg) {
    var e = new Error(msg);
    e.code = err;
    return e;
}


exports.send_success = function(res, data) {
    res.writeHead(200, {"Content-Type": "application/json"});
    var output = { error: null, data: data };
    res.end(JSON.stringify(output) + "\n");
}


exports.send_failure = function(res, code, msg) {
    var err = new Error(msg);
    err.code = code;
    console.error(err);
    var code = (err.code) ? err.code : err.name;
    res.writeHead(code, { "Content-Type" : "application/json" });
    res.end(JSON.stringify({ error: code, message: err.message }) + "\n");
}


exports.invalid_resource = function() {
    return exports.make_error("invalid_resource",
                              "the requested resource does not exist.");
}

exports.no_such_album = function() {
    return exports.make_error("no_such_album",
                              "The specified album does not exist");
}

exports.userName = 'fsadmin';
exports.userPass = 'nodejs123';

exports.log = bunyan.createLogger(
    {name: "FS",
     streams: [
     {
        level: 'debug',
        stream: process.stdout
     },
     {
        type: 'rotating-file',
        level: 'info',
        path: __dirname + '/../log/server['+this.serverType()+'].log',
        period: '1d',
        count: 3
     }
     ] 
});


