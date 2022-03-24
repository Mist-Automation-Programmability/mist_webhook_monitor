const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
    session_id: { type: String, required: true },
    socket_id: { type: String, required: true },
    org_id: { type: String, required: true },
    topics: [{ type: String }],
    last_used: { type: Number, required: true },
    in_use: { type: Boolean, default: false }
});

const Session = mongoose.model('Session', SessionSchema);


module.exports = Session;