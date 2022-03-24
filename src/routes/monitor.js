const express = require('express');
const router = express.Router();


router.get("/", (req, res) => {
    res.sendFile(global.appPath + '/views/index.html');
});

router.get("/login", (req, res) => {
    res.sendFile(global.appPath + '/views/index.html');
});
router.get("/orgs", (req, res) => {
    res.sendFile(global.appPath + '/views/index.html');
});
router.get("/monitor", (req, res) => {
    res.sendFile(global.appPath + '/views/index.html');
});

module.exports = router;