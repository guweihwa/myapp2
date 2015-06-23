var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
//var logger = require('morgan');
var cookieParser = require('cookie-parser');
//var bodyParser = require('body-parser');
var serveStatic = require('serve-static');
var exphbs = require('express-handlebars');
var moment = require('moment');
var fs = require('fs');
var basicAuth = require('basic-auth');
var busboy = require('connect-busboy');

var logDirectory = path.join(__dirname, 'log');
// ensure log directory exists
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

var routes = require('./server/routes');
var helpers = require('./common/helpers.js');

var app = express();

// FS Server Type -
// 1: Upload Server
// 2: Converter Server
// 3: Local Test Server
var fsServerType = helpers.serverType();
app.set('fsServerType', fsServerType);

var log = helpers.log;

var accessLogPath = logDirectory + '/access['+fsServerType+'].log';

app.use(require('express-bunyan-logger')({
  //format: ":remote-address :user-agent[major] :url :method :status-code",
  name: 'access_logger', 
  streams: [
    //{
    // stream: process.stdout
    //},
    {
      type: 'rotating-file',
      path: accessLogPath,
      period: '1d',
      count: 3
    }
  ]
}));

log.debug("accessLogPath=" + accessLogPath);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
var hbs = exphbs.create({
  extname: 'hbs',
  defaultLayout: 'main',
  layoutsDir: app.get('views') + '/layouts',
  partialsDir: [app.get('views') + '/partials'],
  helpers: {
      timeago: function(timestamp) {
          //console.log(timestamp);
          return moment(timestamp).startOf('minute').fromNow();
      }
  }
});

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
//app.use(logger('dev'));
//app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({ extended: false }));
// app.use(bodyParser({
//     uploadDir:path.join(__dirname, './public/upload/temp')
// }));
app.use(cookieParser());
app.use(busboy());

//routes.initialize(app, new express.Router());
routes.initialize(app);

var staticPath = path.join(__dirname, 'public');
app.use('/public', serveStatic(staticPath));
log.debug("staticPath="+ staticPath);

var auth = function (req, res, next) {
  function unauthorized(res) {
    res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
    return res.sendStatus(401);
  };

  var user = basicAuth(req);

  if (!user || !user.name || !user.pass) {
    return unauthorized(res);
  };

  if (user.name === helpers.userName && user.pass === helpers.userPass) {
    return next();
  } else {
    return unauthorized(res);
  };
};

app.use(auth);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
