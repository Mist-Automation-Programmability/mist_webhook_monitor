const api = require("./req");

/**
 * Create Mist API Token
 * @param {Object} mist - API credentials
 * @param {String} mist.host - Mist Cloud to request
 * @param {String} mist.apitoken - Mist TOKEN to use
 * @param {Object} mist.cookie - If not token, use the Mist session cookies
 * @param {String} callback(err, data) 
 *  */
module.exports.generate = function(mist, callback) {
    var path = "";
    var data = {}
    path = "/api/v1/self/apitokens"
    data = { "name": "webhook.mist-lab.fr_token" }
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
 * @param {String} mist.apitoken - Mist TOKEN to use
 * @param {Object} mist.cookie - If not token, use the Mist session cookies
 * @param {String} callback(err, data) 
 *  */
module.exports.check = function(mist, apitoken, callback) {
    const path = "/api/v1/self"
    api.GET({ host: mist.host, apitoken: apitoken }, path, (err, data) => {
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
 * @param {String} mist.apitoken - Mist TOKEN to use
 * @param {Object} mist.cookie - If not token, use the Mist session cookies
 * @param {String} apitoken_id - token id to delete
 * @param {String} callback(err, data) 
 *  */
module.exports.delete = function(mist, apitoken_id, callback) {
    const path = "/api/v1/self/apitokens/" + apitoken_id
    api.DELETE(mist, path, (err, data) => {
        if (err) {
            console.log(err)
            callback(err)
        } else {
            callback(null, data)
        }
    });
};