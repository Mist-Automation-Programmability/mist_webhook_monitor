const api = require("./req");

/**
 * Create Mist API Token
 * @param {Object} mist - API credentials
 * @param {String} mist.host - Mist Cloud to request
 * @param {String} mist.org_id - Mist ORG to use
 * @param {String} mist.apitoken - Mist TOKEN to use
 * @param {Object} mist.cookie - If not token, use the Mist session cookies
 * @param {String} callback(err, data) 
 *  */
module.exports.generate = function(mist, callback) {
    var path = "";
    var data = {}
    path = "/api/v1/orgs/" + mist.org_id + "/apitokens"
    data = {
        "name": "webhook.mist-lab.fr_token",
        "privileges": [
            { "scope": "org", "role": "write" }
        ]
    }
    api.POST(mist, path, data, (err, data) => {
        if (err) {
            console.log(err)
            callback(err)
        } else {
            callback(null, data)
        }
    });
};

/**
 * Check if Mist API Token exists
 * @param {Object} mist - API credentials
 * @param {String} mist.host - Mist Cloud to request
 * @param {String} mist.org_id - Mist ORG to use
 * @param {String} mist.apitoken - Mist TOKEN to use
 * @param {Object} mist.cookie - If not token, use the Mist session cookies
 * @param {String} apitoken_id - token id to delete
 * @param {String} callback(err, data) 
 *  */
module.exports.check = function(mist, apitoken_id, callback) {
    const path = "/api/v1/orgs/" + mist.org_id + "/apitokens/" + apitoken_id
    api.GET(mist, path, (err, data) => {
        if (err) {
            console.log(err)
            callback(err)
        } else {
            callback(null, data)
        }
    });
};

/**
 * Delete Mist API Token
 * @param {Object} mist - API credentials
 * @param {String} mist.host - Mist Cloud to request
 * @param {String} mist.org_id - Mist ORG to use
 * @param {String} mist.apitoken - Mist TOKEN to use
 * @param {Object} mist.cookie - If not token, use the Mist session cookies
 * @param {String} apitoken_id - token id to delete
 * @param {String} callback(err, data) 
 *  */
module.exports.delete = function(mist, apitoken_id, callback) {
    const path = "/api/v1/orgs/" + mist.org_id + "/apitokens/" + apitoken_id
    api.DELETE(mist, path, (err, data) => {
        if (err) {
            console.log(err)
            callback(err)
        } else {
            callback(null, data)
        }
    });
};