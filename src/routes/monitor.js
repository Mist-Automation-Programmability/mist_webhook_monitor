const express = require('express');
const router = express.Router();


// deepcode ignore NoRateLimitingForExpensiveWebOperation: <please specify a reason of ignoring this>
router.get("/", (req, res) => {
    res.sendFile(global.appPath + '/views/index.html');
});

// deepcode ignore NoRateLimitingForExpensiveWebOperation: <please specify a reason of ignoring this>
router.get("/login", (req, res) => {
    res.sendFile(global.appPath + '/views/index.html');
});
// deepcode ignore NoRateLimitingForExpensiveWebOperation: <please specify a reason of ignoring this>
router.get("/orgs", (req, res) => {
    res.sendFile(global.appPath + '/views/index.html');
});
// deepcode ignore NoRateLimitingForExpensiveWebOperation: <please specify a reason of ignoring this>, deepcode ignore NoRateLimitingForExpensiveWebOperation: <please specify a reason of ignoring this>
router.get("/monitor", (req, res) => {
    res.sendFile(global.appPath + '/views/index.html');
});

module.exports = router;