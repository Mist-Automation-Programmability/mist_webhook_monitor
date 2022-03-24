var api = require("./req");
var self = require("./mist_self")
    /**
     * Log In Mist Cloud
     * @param {Object} mist - API credentials
     * @param {String} mist.host - Mist Cloud to request
     * @param {String} username - usernmae
     * @param {String} password - password
     *  */
module.exports.login = function(mist, username, password, two_factor_code, callback) {
    var path = "/api/v1/login";
    var data = {
        email: username,
        password: password
    }
    if (two_factor_code) data["two_factor"] = two_factor_code;
    api.POST(mist, path, data, (err, data, headers) => {
        if (err) {
            console.log(err)
            callback(err)
        } else {
            if (headers) {
                var headersJSON = JSON.parse(headers);
                mist.cookie = headersJSON["set-cookie"];
            }
            self.getSelf(mist, (err, data) => {
                callback(err, { self: data, mist: mist })
            })
        }
    });
};