const https = require('https');


function generate_headers(mist) {
    var headers = {}
    if (mist.apitoken) {
        headers.Authorization = "Token " + mist.apitoken;
    } else
    if (mist.cookie) {
        headers = {}
        for (var i in mist.cookie) {
            cookie = mist.cookie[i].split(';')[0].split("=")
            if (cookie[0].startsWith("csrftoken")) {
                headers["X-CSRFToken"] = cookie[1]
            }
        }
        headers.cookie = mist.cookie
    }
    headers['Content-Type'] = 'application/json'

    return headers
}

/**
 * HTTP GET Request
 * @param {Object} mist - API credentials
 * @param {String} mist.host - Mist Cloud to request
 * @param {String} mist.apitoken - Mist API Token
 * @param {String} path - path to request the ACS endpoint
 *  */
module.exports.GET = function(mist, path, callback) {
    let rejectUnauthorized = true;

    const headers = generate_headers(mist)
    const options = {
        rejectUnauthorized: rejectUnauthorized,
        host: mist.host,
        port: 443,
        path: path,
        method: "GET",
        headers: headers
    };
    this.httpRequest(options, callback);
};
/**
 * HTTP POST Request
 * @param {Object} mist - API credentials
 * @param {String} mist.host - Mist Cloud to request
 * @param {String} mist.apitoken - Mist API Token
 * @param {String} path - path to request the ACS endpoint
 * @param {Object} data - data to include to the POST Request
 *  */
module.exports.POST = function(mist, path, data, callback) {
    let rejectUnauthorized = true;

    const headers = generate_headers(mist)
    const options = {
        rejectUnauthorized: rejectUnauthorized,
        host: mist.host,
        port: 443,
        path: path,
        method: "POST",
        headers: headers
    };
    const body = JSON.stringify(data);
    this.httpRequest(options, callback, body);
};
/**
 * HTTP PUT Request
 * @param {Object} mist - API credentials
 * @param {String} mist.host - Mist Cloud to request
 * @param {String} mist.apitoken - Mist API Token
 * @param {String} path - path to request the ACS endpoint
 * @param {Object} data - data to include to the POST Request
 *  */
module.exports.PUT = function(mist, path, callback) {
    let rejectUnauthorized = true;

    const headers = generate_headers(mist)
    const options = {
        rejectUnauthorized: rejectUnauthorized,
        host: mist.host,
        port: 443,
        path: path,
        method: "PUT",
        headers: headers
    };
    this.httpRequest(options, callback);
};
/**
 * HTTP DELETE Request
 * @param {Object} mist - API credentials
 * @param {String} mist.host - Mist Cloud to request
 * @param {String} mist.apitoken - Mist API Token
 * @param {String} path - path to request the ACS endpoint
 *  */
module.exports.DELETE = function(mist, path, callback) {
    let rejectUnauthorized = true;

    const headers = generate_headers(mist)
    const options = {
        rejectUnauthorized: rejectUnauthorized,
        host: mist.host,
        port: 443,
        path: path,
        method: "DELETE",
        headers: headers
    };
    this.httpRequest(options, callback);
};

module.exports.httpRequest = function(options, callback, body) {
    let result = {};
    result.request = {};
    result.result = {};

    result.request.options = options;
    const req = https.request(options, function(res) {
        result.result.status = res.statusCode;
        console.info('\x1b[34mREQUEST QUERY\x1b[0m:', options.method, options.path);
        console.info('\x1b[34mREQUEST STATUS\x1b[0m:', result.result.status);
        result.result.headers = JSON.stringify(res.headers);
        res.setEncoding('utf8');
        let data = '';
        res.on('data', function(chunk) {
            data += chunk;
        });
        res.on('end', function() {
            switch (result.result.status) {
                case 200:
                    if (data != '') {
                        if (data.length > 400) console.info("\x1b[34mRESPONSE DATA\x1b[0m:", data.substr(0, 400) + '...');
                        else console.info("\x1b[34mRESPONSE DATA\x1b[0m:", data);
                    }
                    var dataJSON = JSON.parse(data);
                    callback(null, dataJSON, result.result.headers);
                    break;
                case 404:
                    callback({ code: 404, error: "Not Found" })
                    break;
                default:
                    var dataJSON = JSON.parse(data);
                    if ("detail" in dataJSON) dataJSON = dataJSON.detail
                    console.error("\x1b[31mRESPONSE ERROR\x1b[0m:", data);
                    callback({ code: result.result.status, error: dataJSON });
                    break;

            }
        });
    });
    req.on('error', function(err) {
        console.error("\x1b[31mREQUEST QUERY\x1b[0m:", options.path);
        console.error("\x1b[31mREQUEST ERROR\x1b[0m:", JSON.stringify(err));
        callback(err, null);
    });


    // write data to request body
    req.write(body + '\n');
    req.end();
}