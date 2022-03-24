const nodemailer = require("nodemailer")
const fs = require('fs')
const mist_qrcode = require("./mist_qrcode")

function generateEmail(name, ssid, psk, cb) {
    qr_info = "You can also scan the QRCode below to configure your device:"
    mist_qrcode.generateQrCode(ssid, psk, (qr_code) => {
        fs.readFile(global.appPath + '/email.html', (err, data) => {
            if (err) {
                console.error(err)
                cb(err)
            } else {
                data = data.toString()
                    .replace("{logo}", config.SMTP_LOGO_URL)
                    .replace("{name}", name)
                    .replace("{ssid}", ssid)
                    .replace("{psk}", psk)
                    .replace("{qr_info}", qr_info)
                    .replace("{qr_code}", qr_code)
                cb(null, data)
            }
        })
    })
}

module.exports.send = function(email, name, ssid, psk, cb) {
    var smtp = nodemailer.createTransport({
        host: global.CONFIG.SMTP_HOSTNAME,
        port: global.CONFIG.SMTP_PORT,
        secure: global.CONFIG.SMTP_SECURE,
        auth: {
            user: global.CONFIG.SMTP_USER,
            pass: global.CONFIG.SMTP_PASSWORD,
        },
        tls: {
            rejectUnauthorized: global.CONFIG.SMTP_REJECT_UNAUTHORIZED
        }
    });

    generateEmail(name, ssid, psk, (err, html) => {
        if (html) {
            var message = {
                from: global.CONFIG.SMTP_FROM_NAME + " <" + global.CONFIG.SMTP_FROM_EMAIL + ">",
                to: email,
                subject: global.CONFIG.smtp.subject,
                html: html
            };
            smtp.sendMail(message, cb)
        }
    })
};