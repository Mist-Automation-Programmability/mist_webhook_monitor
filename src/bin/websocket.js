const sessionParser = require('../app').sessionParser;
const map = new Map();
const subscribe = require("./webhook_sub");
const unsubscribe = require("./webhook_unsub");
const Session = require('../bin/models/session');
const uuid = require('uuid');
const PubSubManager = require('../app').PubSubManager;

function send(ws, message) {
    ws.send(JSON.stringify(message));
}

function connection(ws, req) {

    map.set(req.session.session_id, ws);

    ws.on('message', function(message) {
        //console.log(`Received message ${message} from user ${req.session.session_id}`);
        json_message = JSON.parse(message);

        switch (json_message.action) {

            case "reconnect":
                PubSubManager.check_saved_session(req.session.session_id, ws, (org_ids, topics) => {
                    send(ws, { "action": "reconnect", "result": "success", "org_ids": org_ids, "topics": topics })
                });
                break;

            case "ping":
                send(ws, { "action": "ping", "result": "pong", "session_id": req.session.session_id });
                break;

            case "subscribe":
                if (!json_message.org_ids) send(ws, { "action": "subscribe", "result": "error", "message": "org_ids is missing" });
                else if (!json_message.topics) send(ws, { "action": "subscribe", "result": "error", "message": "topics is missing" });
                else {
                    Session.find({ session_id: req.session.session_id }, (err, db_sessions) => {
                        if (err) cb("Unable to retrieve sessions information from the DB")
                        else {
                            var current_org_ids = [];
                            var current_topics = [];
                            db_sessions.forEach(db_session => {
                                    current_org_ids.push(db_session.org_id)
                                    db_session.topics.forEach(topic => {
                                        if (!current_topics.includes(topic)) current_topics.push((topic));
                                    })
                                })
                                // If topics changed, update the org already subscribed and save the new topic list
                            if (json_message.topics.length == 0) {
                                unsubscribe.all_orgs(req.session.session_id, (err, org_id) => {
                                    if (err) console.log("Unable to clean up config for org_id " + org_id + ". Error: " + err);
                                    if (org_id) PubSubManager.unsubscribe(ws, org_id, topics);
                                })
                            } else {
                                const org_ids_to_update = json_message.org_ids.filter(x => current_org_ids.includes(x));
                                const org_ids_to_unsub = current_org_ids.filter(x => !json_message.org_ids.includes(x));
                                const org_ids_to_sub = json_message.org_ids.filter(x => !current_org_ids.includes(x));
                                const topics_to_unsub = current_topics.filter(x => !json_message.topics.includes(x));
                                const topics_to_sub = json_message.topics.filter(x => !current_topics.includes(x));

                                if (org_ids_to_update.lenth > 0) subscribe.orgs(
                                    req.session.mist,
                                    req.session.self.privileges,
                                    req.session.session_id,
                                    org_ids_to_update,
                                    json_message.topics,
                                    (err, org_id) => {
                                        if (err) send(ws, { "action": "subscribe", "result": "error", "message": err })
                                        else {
                                            PubSubManager.unsubscribe(ws, req.session.session_id, org_id, topics_to_unsub);
                                            PubSubManager.subscribe(ws, org_id, topics_to_sub);
                                            send(ws, { "action": "subscribe", "result": "successn", "message": "Mist configuration updated" })
                                        }
                                    })


                                // If orgs where removed, unsub
                                if (org_ids_to_unsub.length > 0) {

                                    unsubscribe.orgs(
                                        req.session.session_id,
                                        org_ids_to_unsub,
                                        (err, org_id) => {
                                            if (err) send(ws, { "action": "subscribe", "result": "error", "message": err, org_id: org_id });
                                            else {
                                                PubSubManager.unsubscribe(ws, org_id, json_message.topics)
                                                send(ws, { "action": "subscribe", "result": "success", "message": "Configuration updated", org_id: org_id });
                                            }
                                        });
                                }
                                // If orgs where added, sub
                                if (org_ids_to_sub.length > 0) {

                                    subscribe.orgs(
                                        req.session.mist,
                                        req.session.self.privileges,
                                        req.session.session_id,
                                        org_ids_to_sub,
                                        json_message.topics,
                                        (err, org_id) => {
                                            if (err) send(ws, { "action": "subscribe", "result": "error", "message": err })
                                            else {
                                                PubSubManager.subscribe(ws, org_id, json_message.topics);
                                                send(ws, { "action": "subscribe", "result": "success", "message": "Mist configuration updated" })
                                            }
                                        })
                                }
                            }
                        }
                    })
                }
                break;

            case "unsubscribe":
                unsubscribe.all_orgs(
                    req.session.session_id,
                    json_messsage.org_id,
                    (err, org_id, topics) => {
                        if (err) send(ws, { "action": "unsubscribe", "result": "error", "message": err });
                        else {
                            PubSubManager.unsubscribe(ws, req.session.session_id, org_id, topics);
                            send(ws, { "action": "unsubscribe", "result": "success", "message": "Configuration updated", org_id: org_id });
                        }
                    });
                break;

            default:
                send(ws, { "action": "unknown", "result": "error", "message": "Unknown request" });
                break;
        }
    });

    ws.on('close', function() {
        console.log("Connection lost with session_id " + req.session.session_id)
        map.delete(req.session.session_id);
        // if the socket did not reconnect after 1min, clean everything
        setTimeout(function() {
            if (map.get(req.session.session_id)) console.log("Connection with session_id " + req.session.session_id + " resumed");
            else {
                delete req.session.socksession_idet_id;
                console.log("Connection with session_id " + req.session.session_id + " not resumed. Cleaning up everything");
                unsubscribe.all_orgs(req.session.session_id, (err, org_id, topics) => {
                    if (err) {
                        console.log("Unable to clean up config for org_id " + org_id)
                        console.log(err);
                    } else if (org_id) PubSubManager.unsubscribe(ws, req.session.session_id, org_id, topics);
                })
            }
        }, 5000)
    });
}

function upgrade(request, socket, cb) {
    console.log('Parsing session from request...');
    sessionParser(request, {}, () => {
        if (!request.session.session_id) {
            console.log("no associated session found. Rejecting the WS.")
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        console.log('Websocket connection request from user ' + request.session.session_id);
        cb(true)

    });
}

module.exports.connection = connection;
module.exports.upgrade = upgrade;