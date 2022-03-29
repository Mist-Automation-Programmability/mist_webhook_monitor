const Webhook = require("../bin/mist_webhook");

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
        if (err) cb(err)
        else {
            db_data.topics = topics

            db_data.save((err) => {
                if (err) cb(err)
                else cb(null)
            })
        }
    })
}