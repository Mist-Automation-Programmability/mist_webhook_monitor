const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
    session_id: { type: String, required: true },
    org_id: { type: String, required: true },
    topics: [{ type: String }]
});

const Session = mongoose.model('Session', SessionSchema);


module.exports = Session;