const Session = require("./models/session");
const Webhook = require("./models/webhook");
const unsub = require("./webhook_unsub");

function cleanSessions(cb) {
    const delta_time = 900000; //15min
    const time_limit = Date.now() - delta_time;
    Session.find({ last_ping: { $lt: time_limit } }, (err, sessions) => {
        if (sessions.length > 0) {
            const session_count = sessions.length;
            var done = 0;
            sessions.forEach(session => {
                Session.deleteOne({ _id: session._id }, err => {
                    done += 1;
                    if (done == session_count) {
                        console.info("\x1b[32minfo\x1b[0m:", session_count + " zombie session(s) cleaned.");
                        cb()
                    }
                })
            })
        } else(cb);
    })
}

function cleanWebhooks() {
    Webhook.find({}, (err, webhooks) => {
        if (webhooks.length > 0) {
            const webhooks_count = sessions.length;
            var done = 0;
            webhooks.forEach(webhook => {
                Session.find({ org_id: webhook.org_id }, (err, data) => {
                    if (!err && !data) unsub.clean(org_id);
                    done += 1;
                    if (done == webhooks_count) {
                        console.info("\x1b[32minfo\x1b[0m:", webhooks_count + " zombie webhook(s) cleaned.");
                    }
                })
            })
        }
    })
}

module.exports = function() {
    cleanSessions(() => cleanWebhooks())
}