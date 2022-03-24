/*================================================================
ADMIN:
- ACS Oauth (to authenticate administrators)
- Display Admin Web page
 ================================================================*/
const express = require('express');
const router = express.Router();
const crypto = require("crypto");
const subscribe = require("./../bin/webhook_sub");
const unsubscribe = require("./../bin/webhook_unsub");
import WebSocket, { WebSocketServer } from 'ws';


/*================================================================
 SUB
 ================================================================*/

router.post("/subscribe", (req, res) => {
    if (!req.body.org_id) res.status(400).json({ "error": "org_id is missing" });
    else if (!req.body.topics) res.status(400).json({ "error": "topics is missing" });
    else {
        if (!req.session.hasOwnProperty("socket_id")) {
            res.session.save()
        }
        subscribe(req.session.mist, req.session.socket_id, req.body.org_id, req.body.topics, err => {
            if (err) res.status(500).send(err)
            else res.send()
        })
    }
});

/*================================================================
 UBSUB
 ================================================================*/
router.post("/unsubscribe", (req, res) => {
    if (!req.body.org_id) res.status(400).json({ "error": "org_id is missing" });
    else if (!req.body.topics) res.status(400).json({ "error": "topics is missing" });
    else {
        if (!req.session.hasOwnProperty("socket_id")) {
            req.session.socket_id = crypto.randomBytes(20).toString('hex');
            res.session.save()
        }
        subscribe(req.session.mist, req.session.socket_id, req.body.org_id, req.body.topics, err => {
            if (err) res.status(500).send(err)
            else res.send()
        })
    }
});

module.exports = router;