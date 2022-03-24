/******************************************************************************
 *                                 NOTES                                    *
 *
 *      This file is an example
 *      Please move this file config_example.js to config.js
 *      and chage the values to match your configuration
 *
 ******************************************************************************/

/******************************************************************************
 *                                  SERVER                                    *
 ******************************************************************************/
module.exports.appServer = {

    /******************************************************************************
     *                                NODE HTTP                                   *
     ******************************************************************************/
    NODE_HOSTNAME: "localhost",
    NODE_PORT_HTTP: 3000,
    // Enable HTTPS directly with NodeJS. 
    // Set to false if you are using a reverse proxy to manage HTTPS (nginx, apache, ...)
    NODE_HTTPS: true,
    NODE_PORT_HTTPS: 3443,
    // used if NODE_HTTPS = true
    // certificate name. The certificate has to be installed into certs folder
    NODE_HTTPS_CERT: "default.pem",
    // key name. The key has to be installed into certs folder, without password
    NODE_HTTPS_KEY: "default.key",

    /******************************************************************************
     *                          NODE WEBHOOK COLLECTOR                            *
     ******************************************************************************/
    // If the server has a different public IP/FDQN for the webhook collector, otherwise use the NODE_HOSTNAME
    NODE_WEBHOOK_HOSTNAME: "127.0.0.1",
    // If you are deploying the app behind a reverse proxy or NAT, the public facing port may be different than the port used by the app
    // If null, the app doesn't specify the port when creating the webhook in Mist (which will use the default ws / wss ports)
    NODE_WEBHOOK_PORT: 3000,
    // name of the webhook created in Mist Org
    NODE_WEBHOOK_NAME: "webhook.mist-lab.fr",
    // Ask Mist Cloud to send Webhook message through HTTPS (instead of HTTP). 
    // Require NODE_HTTPS = true or a reverse proxy in front of the app to deal with TLS
    NODE_WEBHOOK_HTTPS: false,
    // if NODE_WEBHOOK_HTTPS = true, tell Mist Cloud to check the TLS certificate or not
    NODE_WEBHOOK_CERT_CHECK: false,

    /******************************************************************************
     *                        NODE WEBSOCKET COLLECTOR                            *
     ******************************************************************************/
    // if the app is behind a reverse proxy, define the listening port
    NODE_WEBSOCKET_PORT: 3000,
    // to enable WSS at the app level. Require NODE_HTTPS = true
    NODE_WEBSOCKET_SECURE: false,

    /******************************************************************************
     *                                MongoDB                                    *
     ******************************************************************************/
    MONGO_HOST: "localhost",
    MONGO_DB: "mwm",
    MONGO_USER: "mongo_user",
    MONGO_PASSWORD: "mongo_password",
    MONGO_ENC_KEY: "SOME_32BYTE_BASE64_STRING", //openssl rand -base64 32; 
    MONGO_SIG_KEY: "SOME_64BYTE_BASE64_STRING", //openssl rand -base64 64;
    /******************************************************************************
     *                                SMTP                                    *
     ******************************************************************************/
    SMTP_HOSTNAME: "mail.corp.org",
    SMTP_PORT: 25,
    SMTP_SECURE: false, // upgrade later with STARTTLS
    SMTP_REJECT_UNAUTHORIZED: false, // do not fail on invalid certs if false
    SMTP_USER: "user@corp.org",
    SMTP_PASSWORD: "secret",
    SMTP_FROM_NAME: "Wi-Fi Access",
    SMTP_FROM_EMAIL: "wi-fi@corp.org",
    SMTP_LOGO_URL: "https://cdn.mist.com/wp-content/uploads/logo.png",
}