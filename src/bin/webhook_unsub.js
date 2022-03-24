const WH = require('../bin/models/webhook');
const Session = require('../bin/models/session');
const Webhook = require("../bin/mist_webhook");
const Token = require("../bin/mist_token");
const Webhook_functions = require("./webhook_common");

/*================================================================
 STOP SESSION FUNCTIONS
================================================================*/
function _delete_org_config_and_token(org_id, cb) {
    WH.findOne({ org_id: org_id }, (err, db_data) => {
        if (err) cb("Error when requesting the DB")
        else if (!db_data) cb("Session not found")
        else {
            Webhook.delete(db_data, db_data.webhook_id, (err) => {
                if (err) cb("Error when deleting the Webhook configuration from the Org")
                else Token.delete(db_data, db_data.apitoken_id, (err) => {
                    if (err) cb("Error when deleting the Token from the Org")
                    else cb(null, true)
                })
            })
        }
    })
}


function _update_org_topics_on_stop(socket_id, org_id, cb) {
    Session.find({ org_id: org_id }, (err, db_sessions) => {
        if (err) {
            console.log("Unable to retrieve the sessions from DB for org_id" + org_id + ". Error: " + err)
            cb("Error when retrieving the sessions information from the DB")
        } else if (db_sessions.length == 0) {
            console.log("Unable to retrieve the sessions froom DB for org_id" + org_id + ". Not found")
            cb("Session not found")
        } else if (db_sessions.length == 1) _delete_org_config_and_token(org_id, (err, ok) => cb(err, ok))
        else {
            let topics_in_use = [];
            db_sessions.forEach(session => {
                if (session.socket_id != socket_id) {
                    session.topics.forEach(topic => {
                        if (!topics_in_use.includes(topic)) {
                            topics_in_use.push(topic)
                        }
                    })
                }
            })
            WH.findOne({ org_id: org_id }, (err, db_data) => {
                if (err) cb(err)
                else if (!db_data) cb("Session not found")
                else {
                    Webhook_functions.update_topics(
                        db_data,
                        db_data,
                        topics_in_use,
                        err => {
                            console.log(err);
                            cb("Error when updating the Webhook configuration in the Org");
                        }
                    )
                }
            })
        }
    })
}

/**
 * Stop all the sessions for a user and remove the corresponding settings from Mist and DB
 * @param {String} socket_id - socket_id (generated for each new websocket session)
 * @param {Array} callback(err, success) - ({org_id, message}, org_id)
 *  */
module.exports.all_orgs = function(socket_id, cb) {
    Session.find({ socket_id: socket_id }, (err, db_sessions) => {
        if (err) {
            console.log(err)
            cb("Error when retrieving info from the DB")
        } else if (db_sessions.length == 0) {
            console.log("Unable to retrieve the info from DB for socket_id" + socket_id + ". Not found ")
            cb("Unable to retrieve the info from the DB")
        } else {
            db_sessions.forEach(db_session => {
                _update_org_topics_on_stop(socket_id, db_session.org_id, err => {
                    if (err) cb({ org_id: org_id, message: err })
                    else cb(null, db_session.org_id)
                })
            })
        }
    })
}


/**
 * Stop sessions for a user and remove the corresponding settings from Mist and DB
 * @param {String} socket_id - socket_id (generated for each new websocket session)
 * @param {Array} org_ids - list of orgs to unsub
 * @param {Array} callback(err, org_id) - (message, org_id)
 *  */
module.exports.orgs = function(socket_id, org_ids, cb) {
    Session.find({ socket_id: socket_id, org_id: org_id }, (err, db_session) => {
        if (err) {
            console.log(err)
            cb("Error when retrieving info from the DB")
        } else if (!db_session) {
            console.log("Unable to retrieve the info from DB for socket_id" + socket_id + ". Not found ")
            cb("Unable to retrieve the info from the DB")
        } else {
            org_ids.forEach(org_id => {
                _update_org_topics_on_stop(socket_id, db_session.org_id, err => {
                    if (err) cb({ org_id: org_id, message: err })
                    else cb(null, org_id)
                })
            })
        }
    })
}