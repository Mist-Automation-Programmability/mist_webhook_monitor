const mongoose = require('mongoose');

const WebhookSchema = new mongoose.Schema({
    host: { type: String, required: true },
    org_id: { type: String, required: true },
    apitoken: { type: String, required: true },
    apitoken_id: { type: String, required: true },
    webhook_id: { type: String, required: true },
    secret: { type: String },
    topics: [{ type: String }],
});

if (global.CONFIG.MONGO_ENC_KEY && global.CONFIG.MONGO_SIG_KEY) {
    const encrypt = require('mongoose-encryption');
    WebhookSchema.plugin(encrypt, {
        encryptionKey: global.CONFIG.MONGO_ENC_KEY,
        signingKey: global.CONFIG.MONGO_SIG_KEY,
        excludeFromEncryption: ['org_id', 'last_used', 'in_use']
    });
}

const Webhook = mongoose.model('Webhook', WebhookSchema);


module.exports = Webhook;