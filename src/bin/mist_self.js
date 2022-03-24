var api = require("./req");

/**
 * Allows one to query the collection of user groups given query parameters as input
 * @param {Object} mist - API credentials
 * @param {String} mist.host - Mist Cloud to request
 * @param {String} mist.api_token - Mist API Token
 *  */
module.exports.getSelf = function(mist, callback) {
    var path = "/api/v1/self";
    api.GET(mist, path, callback);
};