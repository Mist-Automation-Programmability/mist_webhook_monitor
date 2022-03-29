const express = require('express');
const router = express.Router();
const PubSubManager = require('../app').PubSubManager;


router.post("/:org_id", (req, res) => {
    try {
        const wh_data = req.body;
        const topic = wh_data.topic;
        console.info('\x1b[32mWebhook received\x1b[0m for org ' + req.params['org_id'] + " on topic " + topic);
        PubSubManager.publish(req.params['org_id'], topic, wh_data);
    } catch (e) {
        console.log("WEBHOOK COLLECTOR ERROR:")
        console.log(e)
        console.log(req.body)
    } finally {
        res.send()
    }
})

module.exports = router;