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
    if (!req.session.socket_id) req.session.socket_id = uuid.v4();
    ws.on('message', function(message) {
        //
        // Here we can now use session parameters.
        //
        console.log(`Received message ${message} from user ${req.session.session_id}`);
        json_message = JSON.parse(message);

        console.log(json_message)

        switch (json_message.action) {

            case "ping":
                send(ws, { "result": "pong", "socket_id": req.session.socket_id });
                break;

            case "subscribe":
                if (!json_message.org_ids) send(ws, { "result": "error", "message": "org_ids is missing" });
                else if (!json_message.topics) send(ws, { "result": "error", "message": "topics is missing" });
                else {
                    Session.find({ session_id: req.session.session_id, socket_id: req.session.socket_id }, (err, db_sessions) => {
                        if (err) cb("Unable to retrieve sessions information from the DB")
                        else {
                            var current_org_ids = [];
                            db_sessions.forEach(session => {
                                current_org_ids.push(session.org_id)
                            })

                            // If topics changed, update the org already subscribed and save the new topic list
                            if (req.session.topics = !json_message.topics && json_message.topics.length > 0) {
                                const org_ids_to_update = json_message.org_ids.filter(x => current_org_ids.includes(x));
                                const topics_to_unsub = req.session.topics.filter(x => json_message.topics.includes(x));
                                const topics_to_sub = json_message.topics.filter(x => req.session.topics.includes(x));
                                console.log("org_ids_to_update: " + org_ids_to_update)
                                console.log("topics_to_unsub: " + topics_to_unsub)
                                console.log("topics_to_sub: " + topics_to_sub)
                                req.session.topics = json_message.topics;
                                subscribe.orgs(
                                    req.session.mist,
                                    req.session.self.privileges,
                                    req.session.session_id,
                                    req.session.socket_id,
                                    org_ids_to_update,
                                    json_message.topics,
                                    (err, org_id) => {
                                        if (err) send(ws, { "result": "error", "message": err })
                                        else {
                                            PubSubManager.unsubscribe(ws, req.session.socket_id, org_id, topics_to_unsub);
                                            PubSubManager.subscribe(ws, req.session.socket_id, org_id, topics_to_sub);
                                            send(ws, { "result": "successn", "message": "Mist configuration updated" })
                                        }
                                    })
                            } else if (json_message.topics.length == 0) {
                                unsubscribe.all_orgs(req.session.session_id, (err, org_id) => {
                                    if (err) console.log("Unable to clean up config for org_id " + org_id + ". Error: " + err);
                                    if (org_id) PubSubManager.unsubscribe(ws, socket_id, org_id, topics);
                                })
                            } else {

                                // If orgs where removed, unsub
                                const org_ids_to_unsub = current_org_ids.filter(x => !json_message.org_ids.includes(x));
                                if (org_ids_to_unsub.length > 0) {
                                    console.log("org_ids_to_unsub: " + org_ids_to_unsub)
                                    unsubscribe.orgs(
                                        req.session.socket_id,
                                        org_ids_to_unsub,
                                        (err, org_id) => {
                                            if (err) send({ ws, "result": "error", "message": err, org_id: org_id });
                                            else {
                                                PubSubManager.unsubscribe(ws, req.session.socket_id, org_id, json_message.topics)
                                                send(ws, { "result": "success", "message": "Configuration updated", org_id: org_id });
                                            }
                                        });
                                }
                                // If orgs where added, sub
                                const org_ids_to_sub = json_message.org_ids.filter(x => !current_org_ids.includes(x));
                                if (org_ids_to_sub.length > 0) {
                                    console.log("org_ids_to_sub: " + org_ids_to_sub)
                                    subscribe.orgs(
                                        req.session.mist,
                                        req.session.self.privileges,
                                        req.session.session_id,
                                        req.session.socket_id,
                                        org_ids_to_sub,
                                        json_message.topics,
                                        (err, org_id) => {
                                            if (err) send(ws, { "result": "error", "message": err })
                                            else {
                                                PubSubManager.subscribe(ws, req.session.socket_id, org_id, json_message.topics);
                                                send(ws, { "result": "success", "message": "Mist configuration updated" })
                                            }
                                        })
                                }
                            }
                        }
                    })
                }
                break;

            case "unsubscribe":
                const topics = req.session.topics;
                req.session.topics = [];
                unsubscribe.all_orgs(
                    req.session.socket_id,
                    json_messsage.org_id,
                    (err, org_id) => {
                        if (err) send({ ws, "result": "error", "message": err });
                        else {
                            PubSubManager.unsubscribe(ws, req.session.socket_id, org_id, topics);
                            send(ws, { "result": "success", "message": "Configuration updated", org_id: org_id });
                        }
                    });
                break;

            default:
                send(ws, { "result": "error", "message": "Unknown request" });
                break;
        }
    });

    ws.on('close', function() {
        console.log("Connection lost with socket_id " + req.session.socket_id)
        map.delete(req.session.session_id);
        // if the socket did not reconnect after 1min, clean everything
        setTimeout(function() {
            if (map.get(req.session.session_id)) console.log("Connection with socket_id " + req.session.socket_id + " resumed");
            else {
                const socket_id = req.session.socket_id;
                const topics = req.session.topics;
                delete req.session.socket_id;
                delete req.session.topics;
                console.log("Connection with socket_id " + socket_id + " not resumed. Cleaning up everything");
                unsubscribe.all_orgs(req.session.session_id, (err, org_id) => {
                    if (err) console.log("Unable to clean up config for org_id " + org_id + ". Error: " + err);
                    if (org_id) PubSubManager.unsubscribe(ws, socket_id, org_id, topics);
                })
            }
        }, 60000)
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