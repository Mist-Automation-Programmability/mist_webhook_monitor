const express = require('express');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const rateLimit = require('express-rate-limit')
const path = require('path');
const MongoDBStore = require('connect-mongodb-session')(session);
const WebhookPubSub = require("./bin/webhook_pubsub")
const PubSubManager = new WebhookPubSub();
module.exports.PubSubManager = PubSubManager;
const default_mist_hosts = { "Global 01 - manage.mist.com": "api.mist.com", "Global 02 - manage.gc1.mist.com": "api.gc1.mist.com", "Global 03 - manage.ac2.mist.com": "api.ac2.mist.com", "Global 04 - manage.gc2.mist.com": "api.gc2.mist.com", "Europe 01 - manage.eu.mist.com": "api.eu.mist.com" }
const dotenv = require('dotenv');

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
    var env;

    if ("parsed" in dotenv.config() && Object.keys(dotenv.config().parsed).length > 0) env = dotenv.config().parsed;
    else env = process.env;

    CONFIG = {
        NODE_HOSTNAME: env.NODE_HOSTNAME || null,
        NODE_SESSION_SECRET: env.NODE_SESSION_SECRET || "3RMUqsJrX1orvJNBAlrA0KyLqD3fI7/BgiDZ8c8eAto=",
        NODE_PORT_HTTP: env.NODE_PORT_HTTP || 3000,
        NODE_FORCE_HTTP_ONLY: stringToBool(env.NODE_FORCE_HTTP_ONLY, false),
        NODE_HTTPS: stringToBool(env.NODE_HTTPS, false),
        NODE_PORT_HTTPS: env.NODE_PORT_HTTPS || 3443,
        NODE_HTTPS_CERT: env.NODE_HTTPS_CERT || null,
        NODE_HTTPS_KEY: env.NODE_HTTPS_KEY || null,

        NODE_WEBHOOK_HOSTNAME: env.NODE_WEBHOOK_HOSTNAME || null,
        NODE_WEBHOOK_PORT: env.NODE_WEBHOOK_NAME || null,
        NODE_WEBHOOK_NAME: env.NODE_WEBHOOK_NAME || "webhook.mist-lab.fr",
        NODE_WEBHOOK_HTTPS: stringToBool(env.NODE_WEBHOOK_HTTPS, false),
        NODE_WEBHOOK_CERT_CHECK: stringToBool(env.NODE_WEBHOOK_CERT_CHECK, false),

        NODE_WEBSOCKET_PORT: env.NODE_WEBSOCKET_PORT || false,
        NODE_WEBSOCKET_SECURE: stringToBool(env.NODE_WEBSOCKET_SECURE, false),

        MONGO_HOST: env.MONGO_HOST || null,
        MONGO_DB: env.MONGO_DB || "webhook_mon",
        MONGO_USER: env.MONGO_USER || null,
        MONGO_PASSWORD: env.MONGO_PASSWORD || null,
        MONGO_ENC_KEY: env.MONGO_ENC_KEY || null,
        MONGO_SIG_KEY: env.MONGO_SIG_KEY || null,

        SMTP_HOSTNAME: env.SMTP_HOSTNAME || null,
        SMTP_PORT: env.SMTP_PORT || 25,
        SMTP_SECURE: stringToBool(env.SMTP_SECURE, false), // upgrade later with STARTTLS
        SMTP_REJECT_UNAUTHORIZED: stringToBool(env.SMTP_REJECT_UNAUTHORIZED, true), // do not fail on invalid certs                        
        SMTP_USER: env.SMTP_USER || null,
        SMTP_PASSWORD: env.SMTP_PASSWORD || null,
        SMTP_FROM_NAME: env.SMTP_FROM_NAME || "Webhook Mist App",
        SMTP_FROM_EMAIL: env.SMTP_FROM_EMAIL || "wi-fi@corp.org",
        SMTP_LOGO_URL: env.SMTP_LOGO_URL || "https://cdn.mist.com/wp-content/uploads/logo.png",

        APP_DISCLAIMER: env.APP_DISCLAIMER || "",
        APP_GITHUB_URL: env.APP_GITHUB_URL || "",
        APP_DOCKER_URL: env.APP_DOCKER_URL || "",
        MIST_HOSTS: env.MIST_HOSTS || null
    }
} finally {
    if (!CONFIG.MIST_HOSTS) CONFIG.MIST_HOSTS = default_mist_hosts;
    else if (typeof(CONFIG.MIST_HOSTS) == 'string') {
        try {
            CONFIG.MIST_HOSTS = JSON.parse(CONFIG.MIST_HOSTS)
        } catch {
            CONFIG.MIST_HOSTS = default_mist_hosts;
        }
    } else if (typeof(CONFIG.MIST_HOSTS) != "object") CONFIG.MIST_HOSTS = default_mist_hosts;
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


//============RATE LIMITER==============
// const limiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
//     standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
//     legacyHeaders: false, // Disable the `X-RateLimit-*` headers
// });
// app.use(limiter);

// configure session
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));
// express-session parameters:
// save sessions into mongodb 
const sessionParser = session({
    secret: global.CONFIG.NODE_SESSION_SECRET,
    store: new MongoDBStore({
        uri: 'mongodb://' + mongo_host + '/express-session?authSource=admin',
        collection: global.CONFIG.MONGO_DB
    }),
    rolling: true,
    resave: true,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: global.CONFIG.NODE_FORCE_HTTP_ONLY,
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
app.get('*', (req, res) => {
    if (req.session) res.sendFile(global.appPath + '/views/index.html');
    else res.redirect("/");
});

// error handlers
// catch 404 and forward to error handler
app.use(function(req, res, next) {
    res.status(404);

    // respond with html page
    if (req.accepts('html')) {
        res.type('txt').send('Not found');
        return;
    }

    // respond with json
    if (req.accepts('json')) {
        res.send({ error: 'Not found' });
        return;
    }

    // default to plain-text. send()
    res.type('txt').send('Not found');
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

const clean = require("./bin/clean");
setInterval(() => {
    clean()
}, 900000)

module.exports.app = app;
module.exports.sessionParser = sessionParser;