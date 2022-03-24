class WebhookPubSub {
    constructor() {
        // channels = {
        //     org_id: {
        //          topics: {
        //               messages: [],
        //               sockets: []
        //          }
        //     }
        // }
        this.channels = {}
        this.brokerId = setInterval(() => { this.broker() }, 1000);
    }

    subscribe(socket, socket_id, org_id, topics) {
        if (!this.channels.hasOwnProperty(org_id)) this.channels[org_id] = {}
        topics.forEach(topics => {
            console.log('socket ' + socket_id + 'subscribed to ' + topics + " for org " + org_id);
            if (!channels[org_id].hasOwnProperty(topics))
                this.channels[org_id][topics] = {
                    messages: [],
                    sockets: [socket]
                }
            else if (!this.channels[org_id][topics].sockets.includes(socket)) this.channels[org_id][topics].sockets.push(socket);
            console.log(this.channels)
        })
    }

    unsubscribe(socket, socket_id, org_id, topics) {
        topics.forEach(topic => {
            console.log('socket ' + socket_id + 'unsubscribed from ' + topics + " for org " + org_id);
            const index = this.channels[org_id][topic].indexOf(socket);
            this.channels[org_id][topic].splice(index, 1);
            if (this.channels[org_id][topic].length == 0) delete this.channels[org_id][topic];
        })
        if (Object.keys(this.channels[org_id]).length == 0) delete this.channels[org_id];
    }

    removeBroker() {
        clearInterval(this.brokerId);
    }

    publish(org_id, topic, message) {
        if (this.channels.hasOwnProperty[org_id] && this.channels.hasOwnProperty[org_id][topic])
            this.channels[org_id][topic].messages.push(message);
    }

    broker() {
        for (const org_id in this.channels) {
            if (this.channels.hasOwnProperty(org_id)) {
                for (const topic in this.channels[org_id]) {
                    if (this.channels[org_id].hasOwnProperty(topic)) {
                        const messages = this.channels[org_id][topic].messages;
                        const sockets = this.channels[org_id][topic].sockets;
                        if (messages.length > 0) {
                            messages.forEach(message => {
                                console.log(`found messages: ${message} in ${org_id} - ${topic}`);
                                sockets.forEach(socket => {
                                    socket.send(JSON.stringify({
                                        messages: messages
                                    }));
                                });
                            })
                            messages = [];
                        }
                    }
                }
            }
        }
    }
}


module.exports = WebhookPubSub;