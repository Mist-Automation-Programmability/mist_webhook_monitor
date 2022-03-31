const WH = require('../bin/models/webhook');
const Session = require('../bin/models/session');
const Token = require("../bin/mist_token");
const Webhook = require("../bin/mist_webhook");
const Webhook_functions = require("./webhook_common");
/*================================================================
 START SESSION FUNCTIONS
================================================================*/

/**
 * Update and save Mist API Token
 * @param {Object} mist - API credentials
 * @param {String} mist.host - Mist Cloud to request
 * @param {Object} db_data - webhook object from WH
 * @param {String} callback(err, data) 
 *  */
function _update_and_save_token(mist, db_data, cb) {
    Token.generate(mist, (err, cloud_apitoken) => {
        if (err) cb(err);
        else if (!cloud_apitoken) cb();
        else {
            db_data.apitoken = cloud_apitoken.key;
            db_data.apitoken_id = cloud_apitoken.id;
            db_data.save((err, new_db_data) => {
                if (err) cb(err)
                else cb(null, new_db_data.apitoken)
            })
        }
    })
}

/**
 * Update Mist Webhooks and Tokens
 * @param {Object} mist - API credentials
 * @param {String} mist.host - Mist Cloud to request
 * @param {String} org_id - Mist ORG to use
 * @param {Object} db_data - webhook object from WH
 * @param {Array} topics - list of topics to register
 * @param {String} callback(err) 
 *  */
function _update_mist_config(mist, org_id, db_data, topics, cb) {
    // check if the token in the DB still exists in Mist
    Token.check(mist, db_data.apitoken, (err) => {
        if (err) {
            // If not, try to create a new one with the Mist Cookies from the user
            console.log("Previous token not working, creating a new one")
            _update_and_save_token(mist, db_data, (err, new_token) => {
                if (err || !new_token) {
                    console.log("Unable to create a new token")
                    console.log(db_data)
                    console.log(err)
                    cb("unable to create a new token")
                } else {
                    mist.apitoken = new_token
                    Webhook_functions.update_topics(mist, org_id, db_data, topics, err => cb(err))
                }
            })
        } else Webhook_functions.update_topics(mist, org_id, db_data, topics, err => cb(err))
    })
}
/**
 * Update Mist Webhooks and Tokens
 * @param {Object} mist - API credentials
 * @param {String} mist.host - Mist Cloud to request
 * @param {String} org_id - Mist ORG to use
 * @param {Array} topics - list of topics to register
 * @param {String} callback(err)
 *  */
function _create_mist_config(mist, org_id, topics, cb) {
    Token.generate(mist, (err, cloud_apitoken) => {
        if (err) cb(err)
        else if (!cloud_apitoken) cb()
        else {
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
    })
}
/**
 * Check if another session exists and update it or create a new one
 * @param {String} session_id - session_id (generated for each new user session)
 * @param {String} org_id - Mist ORG to use
 * @param {Array} topics - list of topics to register
 * @param {String} callback(err) 
 *  */
function _save_socket_info(session_id, org_id, topics, cb) {
    Session.findOne({ org_id: org_id, session_id: session_id }, (err, db_data) => {
        if (err) cb("Unable to update session in DB");
        else if (!db_data) {
            const new_session = {
                session_id: session_id,
                org_id: org_id,
                topics: topics
            }
            Session(new_session).save(err => cb(err));
        } else {
            db_data.topics = topics;
            db_data.save(err => cb(err))
        }
    })
}

/**
 * Check if another session exists and update it or create a new one
 * @param {Object} mist - API credentials
 * @param {String} mist.host - Mist Cloud to request
 * @param {String} org_id - Mist ORG to use
 * @param {Array} topics - list of topics to register
 * @param {String} callback(err) 
 *  */
function _init(mist, org_id, topics, cb) {
    WH.findOne({ org_id: org_id }, (err, db_data) => {
        if (err) cb(err)
        else if (db_data) _update_mist_config(mist, org_id, db_data, topics, err => cb(err));
        else _create_mist_config(mist, org_id, topics, err => cb(err));
    })
}

/**
 * Check the user has a write access to the org
 * @param {string} org_id - Org the user want to configure
 * @param {Array} privileges - User Privileges
 * @returns {Boolean} 
 *  */
function _is_authorized(org_id, privileges) {
    var authorized = false;
    privileges.forEach(privilege => {
        if (privilege.scope == "org" && privilege.org_id == org_id && privilege.role == "admin") authorized = true;
    })
    return authorized;
}

/**
 * Stop a user session and configure the corresponding settings from Mist and DB
 * @param {Object} mist - API credentials
 * @param {String} mist.host - Mist Cloud to request
 * @param {Object} mist.cookie - If not token, use the Mist session cookies
 * @param {String} session_id - session_id (generated for each new user session)
 * @param {Array} org_ids - list of orgs to unsub
 * @param {Array} topics - list of topics to unsub
 * @param {String} callback(err, org_id) 
 *  */
module.exports.orgs = function(mist, privileges, session_id, org_ids, topics, cb) {
    org_ids.forEach(org_id => {
        if (!_is_authorized(org_id, privileges)) cb("This account does not have a write access the org", org_id)
        else {
            _init(mist, org_id, topics, (err) => {
                if (err) cb(err, org_id)
                else _save_socket_info(session_id, org_id, topics, err => cb(err, org_id))
            })
        }
    })
}