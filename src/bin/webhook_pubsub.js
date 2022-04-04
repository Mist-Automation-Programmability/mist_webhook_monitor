const Session = require("./models/session");

class WebhookPubSub {
    constructor() {
        // channels = {
        //     [org_id]: {
        //          [topic]: {socket_id: socket}
        //          }
        //     }
        // }
        this.channels = {};
        this.socket_ids = [];
    }


    /**
     * Reload saved session when a socket is reconnecting (in case the server crashed) and send back the previous client config
     * @param {String} session_id - Browser session id
     * @param {websocket} socket -websocket object, used to send message to the client
     * @param {Array, Array} cb - send back the orgs and topics the browser previously subribed
     */
    check_saved_session(session_id, socket_id, socket, cb) {
        Session.find({ session_id: session_id, }, (err, db_sessions) => {
            if (err) console.log("unable to find saved session in the DB for socket " + session_id);
            else if (db_sessions) {
                var org_ids = [];
                var topics = [];

                db_sessions.forEach(session => {
                    if (!this.channels.hasOwnProperty(session.org_id)) this.channels[session.org_id] = {}

                    session.topics.forEach(topic => {
                        if (!this.channels[session.org_id].hasOwnProperty(topic)) this.channels[session.org_id][topic] = {}
                        this.channels[session.org_id][topic][socket_id] = socket;

                        console.log("session restored: ", session.org_id, topic)

                        // store new org_id/topic for the cb
                        if (!org_ids.includes(session.org_id)) org_ids.push(session.org_id)
                        if (!topics.includes(topic)) topics.push(topic)

                    })
                })
                cb(org_ids, topics)
            }
        })
    }

    opened(socket_id) {
        this.socket_ids.push(socket_id);
    }
    closed(socket_id) {
        const index = this.socket_ids.indexOf(socket_id);
        if (index > -1) this.socket_ids.splice(index, 1)
    }

    /**
     * Save a websocket to orgs/topics subscribed
     * @param {websocket} socket  - Browser session id
     * @param {String} org_id 
     * @param {Arrays} topics 
     */
    subscribe(socket_id, socket, org_id, topics) {
        if (!this.channels.hasOwnProperty(org_id)) this.channels[org_id] = {}
        topics.forEach(topic => {
            console.log('Session subscribed to ' + topic + " for org " + org_id);
            if (!this.channels[org_id].hasOwnProperty(topic)) this.channels[org_id][topic] = {};
            this.channels[org_id][topic][socket_id] = socket;
        })
    }

    /**
     * Remove the websocket from the unsubscribed orgs/topics
     * @param {*} socket 
     * @param {*} org_id 
     * @param {*} topics 
     */
    unsubscribe(socket_id, org_id, topics) {
        topics.forEach(topic => {
            if (this.channels.hasOwnProperty(org_id) && this.channels[org_id].hasOwnProperty(topic)) {
                if (this.channels[org_id][topic].hasOwnProperty(socket_id)) delete this.channels[org_id][topic][socket_id]
                if (Object.keys(this.channels[org_id][topic]).length == 0) delete this.channels[org_id][topic];
                console.log('Socket ' + socket_id + ' unsubscribed from ' + topic + " for org " + org_id);
            } else console.log("Unable to find socket " + socket_id + " in PubSubManager for " + topic + " in org " + org_id)
        })
        if (this.channels.hasOwnProperty(org_id) && Object.keys(this.channels[org_id]).length == 0) delete this.channels[org_id];
    }

    /**
     * Send webhook message to websockets who subscribed
     * @param {*} org_id 
     * @param {*} topic 
     * @param {*} message 
     */
    publish(org_id, topic, message) {
        var count = 0;
        if (this.channels[org_id] && this.channels[org_id][topic]) {
            for (var socket_id in this.channels[org_id][topic]) {
                if (!this.socket_ids.includes(socket_id)) delete this.channels[org_id][topic][socket_id];
                else {
                    const socket = this.channels[org_id][topic][socket_id];
                    count += 1;
                    socket.send(JSON.stringify({
                        "action": "webhook",
                        "webhook": message
                    }));
                }
            }
            console.log("Sent new webhook message to ", count, " sockets")
        }
    }
}


module.exports = WebhookPubSub;