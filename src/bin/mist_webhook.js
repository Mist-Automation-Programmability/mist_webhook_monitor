const api = require("./req");
var crypto = require("crypto");
/**
 * Create Mist Webhook
 * @param {Object} mist - API credentials
 * @param {String} mist.host - Mist Cloud to request
 * @param {String} mist.org_id - Mist ORG to use
 * @param {String} mist.apitoken - Mist TOKEN to use
 * @param {Object} mist.cookie - If not token, use the Mist session cookies
 * @param {Array} topics - list of topics to register
 * @param {String} cb(err, data) 
 *  */
module.exports.create = function(mist, topics, cb) {
    var webhook_url;

    if (global.CONFIG.NODE_WEBHOOK_HTTPS) webhook_url = "https://";
    else webhook_url = "http://";

    if (global.CONFIG.NODE_WEBHOOK_HOSTNAME) webhook_url += global.CONFIG.NODE_WEBHOOK_HOSTNAME;
    else webhook_url += global.CONFIG.NODE_HOSTNAME;

    if (global.CONFIG.NODE_WEBHOOK_PORT) webhook_url += ":" + global.CONFIG.NODE_WEBHOOK_PORT;

    webhook_url += "/wh-collector/" + mist.org_id;

    const secret = crypto.randomBytes(20).toString('hex');
    const path = "/api/v1/orgs/" + mist.org_id + "/webhooks"
    const data = {
        "enabled": true,
        "name": global.CONFIG.NODE_WEBHOOK_NAME,
        // TODO
        //  "secret": secret,
        "topics": topics,
        "type": "http-post",
        "url": webhook_url,
        "verify-cert": global.CONFIG.NODE_WEBHOOK_CERT_CHECK
    }

    api.POST(mist, path, data, (err, data) => {
        if (err) {
            console.log(err)
            cb(err)
        } else {
            cb(null, data)
        }
    });
};

/**
 * Update Mist Webhook
 * @param {Object} mist - API credentials
 * @param {String} mist.host - Mist Cloud to request
 * @param {String} mist.org_id - Mist ORG to use
 * @param {String} mist.apitoken - Mist TOKEN to use
 * @param {Object} mist.cookie - If not token, use the Mist session cookies
 * @param {String} webhook_id - webhook_id to update
 * @param {Array} topics - list of topics to register
 * @param {String} cb(err, data) 
 *  */
module.exports.update = function(mist, webhook_id, topics, cb) {
    const path = "/api/v1/orgs/" + mist.org_id + "/webhooks/" + webhook_id
    const data = {
        "topics": topics
    }

    api.PUT(mist, path, data, (err, data) => {
        if (err) {
            console.log(err)
            cb(err)
        } else {
            cb(null, data)
        }
    });
};

/**
 * Delete Mist Webhhok
 * @param {Object} mist - API credentials
 * @param {String} mist.host - Mist Cloud to request
 * @param {String} mist.org_id - Mist ORG to use
 * @param {String} mist.apitoken - Mist TOKEN to use
 * @param {Object} mist.cookie - If not token, use the Mist session cookies
 * @param {String} webhook_id - webhook_id to delete
 * @param {String} cb(err, data) 
 *  */
module.exports.delete = function(mist, webhook_id, cb) {
    const path = "/api/v1/orgs/" + mist.org_id + "/webhooks/" + webhook_id;

    api.DELETE(mist, path, (err, data) => {
        if (err) {
            console.log(err)
            cb(err)
        } else {
            cb(null, data)
        }
    });
};