const express = require('express');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');
const MongoDBStore = require('connect-mongodb-session')(session);
const WebhookPubSub = require("./bin/webhook_pubsub")
const PubSubManager = new WebhookPubSub();
module.exports.PubSubManager = PubSubManager;

/*================================================================
 LOAD APP SETTINGS
 ================================================================*/
function stringToBool(val, def_val) {
    if (val) {
        val = val.toLowerCase()
        if (val == "true" || val == "1") return true
        else if (val == "false" || val == "0") return false
    }
    return def_val
}

var CONFIG = {}
try {
    var CONFIG = require("./config").CONFIG
} catch (e) {

    CONFIG = {
        NODE_HOSTNAME: process.env.NODE_HOSTNAME || null,
        NODE_PORT_HTTP: process.env.NODE_PORT_HTTP || 3000,
        NODE_HTTPS: stringToBool(process.env.NODE_HTTPS, false),
        NODE_PORT_HTTPS: process.env.NODE_PORT_HTTPS || 3443,
        NODE_HTTPS_CERT: process.env.NODE_HTTPS_CERT || null,
        NODE_HTTPS_KEY: process.env.NODE_HTTPS_KEY || null,
        NODE_WS_HOSTNAME: process.env.NODE_WS_NAME || null,
        NODE_WS_NAME: process.env.NODE_WS_NAME || "webhook.mist-lab.fr",
        NODE_WSS: stringToBool(process.env.NODE_WSS, false),
        NODE_WSS_CERT_CHECK: stringToBool(process.env.NODE_WSS_CERT_CHECK, false),

        MONGO_HOST: process.env.MONGO_HOST || null,
        MONGO_DB: process.env.MONGO_DB || "webhook_mon",
        MONGO_USER: process.env.MONGO_USER || null,
        MONGO_PASSWORD: process.env.MONGO_PASSWORD || null,
        MONGO_ENC_KEY: process.env.MONGO_ENC_KEY || null,
        MONGO_SIG_KEY: process.env.MONGO_SIG_KEY || null,

        SMTP_HOSTNAME: process.env.SMTP_HOSTNAME || null,
        SMTP_PORT: process.env.SMTP_PORT || 25,
        SMTP_SECURE: stringToBool(process.env.SMTP_SECURE, false), // upgrade later with STARTTLS
        SMTP_REJECT_UNAUTHORIZED: stringToBool(process.env.SMTP_REJECT_UNAUTHORIZED, true), // do not fail on invalid certs                        
        SMTP_USER: process.env.SMTP_USER || null,
        SMTP_PASSWORD: process.env.SMTP_PASSWORD || null,
        SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || "Webhook Mist App",
        SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || "wi-fi@corp.org",
        SMTP_LOGO_URL: process.env.SMTP_LOGO_URL || "https://cdn.mist.com/wp-content/uploads/logo.png",

        APP_DISCLAIMER: process.env.APP_DISCLAIMER || "",
        APP_GITHUB_URL: process.env.APP_GITHUB_URL || "",
        APP_DOCKER_URL: process.env.APP_DOCKER_URL || ""
    }
} finally {
    global.CONFIG = CONFIG
}

global.appPath = path.dirname(require.main.filename).replace(new RegExp('/bin$'), "");

/*================================================================
 MONGO
 ================================================================*/
// configure mongo database
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
// retrieve mongodb parameters from config file
const db = mongoose.connection;

db.on('error', console.error.bind(console, '\x1b[31mERROR\x1b[0m: unable to connect to mongoDB on ' + global.CONFIG.MONGO_HOST + ' server'));
db.once('open', function() {
    console.info("\x1b[32minfo\x1b[0m:", "Connected to mongoDB on " + global.CONFIG.MONGO_HOST + " server");
});

// connect to mongodb
var mongo_host = global.CONFIG.MONGO_HOST
if (global.CONFIG.MONGO_USER && global.CONFIG.MONGO_PASSWORD) mongo_host = global.CONFIG.MONGO_USER + ":" + encodeURI(global.CONFIG.MONGO_PASSWORD) + "@" + mongo_host
mongoose.connect('mongodb://' + mongo_host + '/' + global.CONFIG.MONGO_DB + "?authSource=admin", { useNewUrlParser: true, useUnifiedTopology: true });

/*================================================================
 EXPRESS
 ================================================================*/
var app = express();
// remove http header
app.disable('x-powered-by');
// log http request
app.use(morgan('\x1b[32minfo\x1b[0m: :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length]', {
    skip: function(req, res) { return res.statusCode < 400 && req.originalUrl != "/"; }
}));

/*================================================================
 APP
 ================================================================*/
//================ROUTES=================
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// configure session
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));
// express-session parameters:
// save sessions into mongodb 
const sessionParser = session({
    secret: 'T9QrskYinhvSyt6NUrEcCaQdgez3',
    store: new MongoDBStore({
        uri: 'mongodb://' + mongo_host + '/express-session?authSource=admin',
        collection: global.CONFIG.MONGO_DB
    }),
    rolling: true,
    resave: true,
    saveUninitialized: false,
    cookie: {
        maxAge: 60 * 60 * 1000 // 60 minutes
    },
    unset: "destroy"
})
app.use(sessionParser);
// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(__dirname + '/public'));
app.use('/bower_components', express.static('../bower_components'));


//===============ROUTES=================
// // User Interface
const monitor = require('./routes/monitor');
app.use('/', monitor);
const api_monitor = require('./routes/api');
app.use('/api/', api_monitor);
const webhook_collector = require('./routes/webhook');
app.use('/wh-collector/', webhook_collector);

//Otherwise
app.get("*", function(req, res) {
    if (req.session) res.sendFile(global.appPath + '/views/index.html');
    else res.redirect("/");
});

// error handlers
// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});
//===============WS=================


// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.redirect('error', {
            message: err.message,
            stack: err
        });
        console.log(err);
    });
} else {
    // production error handler
    // no stacktraces leaked to user
    app.use(function(err, req, res, next) {
        if (err.status == 404) res.redirect('/unknown');
        res.status(err.status || 500);
        res.redirect('/error');
    });
}

module.exports.app = app;
module.exports.sessionParser = sessionParser;