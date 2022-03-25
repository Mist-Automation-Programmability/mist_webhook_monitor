const Session = require("./models/session");

class WebhookPubSub {
    constructor() {
        // channels = {
        //     [org_id]: {
        //          [topic]: [socket]
        //          }
        //     }
        // }
        this.channels = {}
    }


    /**
     * Reload saved session when a socket is reconnecting (in case the server crashed) and send back the previous client config
     * @param {String} session_id - Browser session id
     * @param {websocket} socket -websocket object, used to send message to the client
     * @param {Array, Array} cb - send back the orgs and topics the browser previously subribed
     */
    check_saved_session(session_id, socket, cb) {
        Session.find({ session_id: session_id, }, (err, db_sessions) => {
            if (err) console.log("unable to find saved session in the DB for socket " + session_id);
            else if (db_sessions) {
                var org_ids = [];
                var topics = [];

                db_sessions.forEach(session => {
                    if (!this.channels.hasOwnProperty(session.org_id)) this.channels[session.org_id] = {}

                    session.topics.forEach(topic => {

                        if (!this.channels[session.org_id].hasOwnProperty(topic)) this.channels[session.org_id][topic] = []
                        this.channels[session.org_id][topic].push(socket)

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

    /**
     * Save a websocket to orgs/topics subscribed
     * @param {websocket} socket  - Browser session id
     * @param {String} org_id 
     * @param {Arrays} topics 
     */
    subscribe(socket, org_id, topics) {
        if (!this.channels.hasOwnProperty(org_id)) this.channels[org_id] = {}
        topics.forEach(topic => {
            console.log('Session subscribed to ' + topic + " for org " + org_id);
            if (!this.channels[org_id].hasOwnProperty(topic)) this.channels[org_id][topic] = [socket]
            else if (!this.channels[org_id][topic].includes(socket)) this.channels[org_id][topic].push(socket);
        })
    }

    /**
     * Remove the websocket from the unsubscribed orgs/topics
     * @param {*} socket 
     * @param {*} org_id 
     * @param {*} topics 
     */
    unsubscribe(socket, org_id, topics) {
        console.log(topics)
        topics.forEach(topic => {
            const index = this.channels[org_id][topic].indexOf(socket);
            this.channels[org_id][topic].splice(index, 1);
            if (this.channels[org_id][topic].length == 0) delete this.channels[org_id][topic];
            console.log('Session unsubscribed from ' + topic + " for org " + org_id);
        })
        if (Object.keys(this.channels[org_id]).length == 0) delete this.channels[org_id];
    }

    /**
     * Send webhook message to websockets who subscribed
     * @param {*} org_id 
     * @param {*} topic 
     * @param {*} message 
     */
    publish(org_id, topic, message) {
        var count = 0;
        console.log(this.channels[org_id])
        this.channels[org_id][topic].forEach(socket => {
            count += 1;
            socket.send(JSON.stringify({
                "action": "webhook",
                "webhook": message
            }));
        });
        console.log("Sent new webhook message to ", count, " sockets")
    }
}


module.exports = WebhookPubSub;