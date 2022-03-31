const Webhook = require("../bin/mist_webhook");
const WH = require('../bin/models/webhook');

/*================================================================
 COMMON FUNCTIONS
================================================================*/
/**
 * Update Topics for existing Mist Session
 * @param {Object} mist - API credentials
 * @param {String} mist.host - Mist Cloud to request
 * @param {String} mist.apitoken - Mist TOKEN to use
 * @param {Object} mist.cookie - If not token, use the Mist session cookies
 * @param {String} org_id - Mist ORG to use
 * @param {Object} db_data - webhook object from WH
 * @param {Array} topics - list of topics to register
 * @param {String} callback(err) 
 *  */
module.exports.update_topics = function(mist, org_id, db_data, topics, cb) {
    var new_topics = db_data.topics;

    topics.forEach(topic => {
        if (!new_topics.includes(topic)) {
            new_topics.push(topic)
        }
    })
    Webhook.update(mist, org_id, db_data.webhook_id, topics, (err) => {
        if (err && err.code == 404) {
            this.create_webhook(mist, { key: db_data.apitoken, id: db_data.apitoken_id }, org_id, topics, (err) => {
                WH.deleteOne({ _id: db_data._id }, err => console.log(err));
                cb(err)
            })
        } else if (err) cb(err)
        else {
            db_data.topics = topics
            db_data.save((err) => {
                if (err) cb(err)
                else cb(null)
            })
        }
    })
}


module.exports.create_webhook = function(mist, cloud_apitoken, org_id, topics, cb) {
    Webhook.create(mist, org_id, topics, (err, webhook) => {
        if (err) cb(err)
        else if (!webhook) cb()
        else {
            const data = {
                host: mist.host,
                org_id: org_id,
                apitoken: cloud_apitoken.key,
                apitoken_id: cloud_apitoken.id,
                webhook_id: webhook.id,
                secret: webhook.secret,
                topics: topics
            }
            WH(data).save((err) => {
                if (err) cb(err)
                else cb(null)
            })
        }
    })
}