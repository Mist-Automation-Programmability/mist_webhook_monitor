const express = require('express');
const router = express.Router();
const mist_login = require("../bin/mist_login");
const uuid = require('uuid');

function get_sid(req) {
    if (!req.session.session_id) req.session.session_id = uuid.v4();
    return req.session.session_id;
}

/*================================================================
 LOG IN
 ================================================================*/

router.post("/login", (req, res) => {
    if (!req.body.host) res.status(400).send({ "error": "host is missing" })
    else if (!req.body.username) res.status(400).send({ "error": "username is missing" })
    else if (!req.body.password) res.status(400).send({ "error": "password is missing" })
    else {
        var mist = { host: req.body.host }
        var username = req.body.username;
        var password = req.body.password;
        var two_factor_code = req.body.two_factor_code;
        req.session.mist = { host: mist.host }
        req.session.username = username
        mist_login.login(mist, username, password, two_factor_code, (err, data) => {
            if (err) res.status(err.code).send()
            else if (data.self.two_factor_required && !data.self.two_factor_passed) res.json({ "result": "two_factor_required" })
            else {
                req.session.self = data.self;
                req.session.mist = data.mist;
                res.json({ result: "success", session_id: get_sid(req) })
            }
        })
    }
});

router.post("/logout", (req, res) => {
    req.session.destroy();
    res.send();
})

router.get("/login", (req, res) => {
    req.session.touch();
    req.session.save();
    res.send();
})

/*================================================================
 WS SETTINGS
 ================================================================*/
router.get("/ws", (req, res) => {
    if (!req.session || !req.session.self) res.status(401).send()
    else {
        // Session.find({ session_id: req.session.session_id }, (err, db_sessions) => {
        //     var orgs = [];
        //     var topics = [];
        //     if (err) console.log(err)
        //     if (db_sessions.length > 0) db_sessions.forEach(session => {
        //         if (!orgs.includes(session.org_id)) orgs.push(session.org_id);
        //         session.topics.forEach(topic => { if (!topics.includes(topic)) topics.push(topic) })
        //     })
        var prefix = "";
        var port = "";

        if (global.CONFIG.NODE_WEBSOCKET_SECURE) prefix = "wss://";
        else prefix = "ws://"

        if (global.CONFIG.NODE_WEBSOCKET_PORT) port = ":" + global.CONFIG.NODE_WEBSOCKET_PORT;

        const socket_path = prefix + global.CONFIG.NODE_HOSTNAME + port + "/ws-collector/";
        res.json({ socket_path: socket_path, session_id: get_sid(req), host: req.session.mist.host, username: req.session.username })
            //})
    }
})

/*================================================================
 ORGS
 ================================================================*/

function compare(a, b) {
    // Use toUpperCase() to ignore character casing
    const nameA = a.name.toUpperCase();
    const nameB = b.name.toUpperCase();

    let comparison = 0;
    if (nameA > nameB) {
        comparison = 1;
    } else if (nameA < nameB) {
        comparison = -1;
    }
    return comparison;
}
router.get("/orgs", (req, res) => {
    if (!req.session || !req.session.self) res.status(401).send()
    else {
        var orgs = []
        var org_ids = []
        for (var i in req.session.self.privileges) {
            var entry = req.session.self.privileges[i]
            var tmp = null
            if (entry.role == "write" || entry.role == "admin") {
                if (entry.scope == "org") {
                    tmp = { "name": entry.name, "org_id": entry.org_id }
                } else if (entry.scope == "site") {
                    tmp = { "name": entry.org_name, "org_id": entry.org_id }
                }
                if (tmp && org_ids.indexOf(tmp.org_id) < 0) {
                    org_ids.push(tmp.org_id)
                    orgs.push(tmp)
                }
            }
        }
        orgs.sort(compare)
        res.json(orgs)
    }
})

/*================================================================
 SELF
 ================================================================*/
router.get("/self", (req, res) => {
    if (!req.session || !req.session.self) res.status(401).send()
    else {
        res.json({ self: req.session.mist.self, session_id: get_sid(req) })
    }
})

/*================================================================
 DISCLAIMER
 ================================================================*/
router.get('/disclaimer', (req, res) => {
    let data = {}
    if (global.CONFIG.APP_DISCLAIMER) data["disclaimer"] = global.CONFIG.APP_DISCLAIMER;
    if (global.CONFIG.APP_GITHUB_URL) data["github_url"] = global.CONFIG.APP_GITHUB_URL;
    if (global.CONFIG.APP_DOCKER_URL) data["docker_url"] = global.CONFIG.APP_DOCKER_URL;
    res.json(data);
})

module.exports = router;