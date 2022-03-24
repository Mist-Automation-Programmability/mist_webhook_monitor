# Mist Webhook Monitor
This application provides a single page app to get a Mist PSK from the Mist Cloud. This App can use AzureAD, ADFS/SAML, Okta or Google authentication.

# MIT LICENSE

Copyright (c) 2022 Thomas Munzer

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


# Install
This Reference Application can be used as a standalone Application, or it can be deployed as a Docker Image (recommanded).

## Deploy the Docker version (recommanded)
This application is available as a [Docker Image](https://hub.docker.com/repository/docker/tmunzer/mpss). The Dockerfile is also available if you want top build it on your own.

### Run the Docker version
`   docker create -v  <path_to_config.js>/config.js:/app/config.js:ro --link <mongoDB_container_name>:mongo --name="<container_name>" -p 3000:80 tmunzer/mpss`

### Configure the Docker version
Configuration can be done through the config file. An example of the `config.js` file can be found in `src/config_example.js`. Then, you just need to link the `config.js` file to `/app/config.js` in you container.

You can also use environment variables to configure the app:

Variable Name | Type | Default Value | Comment 
------------- | ---- | ------------- | ------- 
NODE_HOSTNAME | string | null | Server FQDN. Used to forge the url. |
NODE_PORT | int | 3000 | TCP Port used for HTTP |
NODE_HTTPS | boolean | false | enable HTTPS in Node. require `NODE_HTTPS_CERT` and `NODE_HTTPS_KEY` |
NODE_PORT_HTTPS | int | 3443 | TCP Port used for HTTPS.. Only used if `NODE_HTTPS == true` |
NODE_HTTPS_CERT | string | null | certificate file name for HTTPS. The certificate file must be placed inside the `src/certs/` folder |
NODE_HTTPS_KEY | string | null | certificate key file name for HTTPS. The certificate key file must be placed inside the `src/certs/` folder |
MONGO_HOST | string | null | Mongo server hostname |
MONGO_DB | string | mpss | Mongo Database name |
MONGO_USER | string | null | If the Mongo server require authentication |
MONGO_PASSWORD | string | null | If the Mongo server require authentication |
MONGO_ENC_KEY | string | null | Used to encrypt the data stored inside the Mongo DB. If not set, the data will be store in cleartext. Can be generated with `openssl rand -base64 32` command |
MONGO_SIG_KEY | string | null | Used to encrypt the data stored inside the Mongo DB. If not set, the data will be store in cleartext. Can be generated with `openssl rand -base64 64` command |
SMTP_HOSTNAME | string | null | SMTP server FQDN or IP Address |
SMTP_PORT | int | 25 | | 
SMTP_SECURE | boolean | false | indicate NODE to use STARTTLS or SSL/TLS to communicate with the SMTP server |
SMTP_REJECT_UNAUTHORIZED | boolean | true | if `SMTP_SECCUR==true`, reject SMTP Server with invalid certificates |
SMTP_USER | string | null | SMTP user account (if authentication is required) |
SMTP_PASSWORD | string | null | SMTP user password (if authentication is required) |
SMTP_FROM_NAME | string | Wi-Fi Access | Sender name |
SMTP_FROM_EMAIL | string | wi-fi@corp.org | Sender email |
SMTP_SUBJECT | string | Your Personal Wi-Fi access code | |
SMTP_LOGO_URL | string | https://cdn.mist.com/wp-content/uploads/logo.png | URL to the logo to use in the Email |
SMTP_ENABLE_QRCODE | boolean | true | Enable the QRCode function on the portal and in the emails |
GOOGLE_CLIENTID | string | null | Google API Client_ID if Google Auth is used |
GOOGLE_CLIENTSECRET | string | null | Google API Client_Secret if Google Auth is used |
APP_DISCLAIMER | string | null | Disclaimer to display on the Admin login page |

### Permanent storage
This App is storing ADFS/SAML information used for the SSO process. You can use a permanent storage to keep the same settings even if the container is restarting. I will simply show the basic procedure here to use a permanent storage:

1. Create a data directory on a suitable volume on your host system, e.g. /my/own/datadir.

2. Start your app container like this:

```$ docker run --name some-name -v /my/own/datadir:/app/certs -d tmunzer/mpss```

The `-v /my/own/datadir:/app/certs` part of the command mounts the /my/own/datadir directory from the underlying host system as /app/certs inside the container, where Mpss by default will store the certificates.

## Deploy the Standalone Application
This Reference APP is built over NodeJS. 

### Deploy the Application
* Install NodeJS LTS: https://nodejs.org/en/download/.
* Clone this repo.
* Configure the APP settings, in the `src/config.js` file. You will find an example in `src/config_example.js`. With Docker deployment, all the settings can be configured by using Environment Variables (see below)
* Install npm packages (`npm install` from the project folder).
* Start the APP with `npm start` from the `src` folder

### Manage HTTPS at the application level
If you want to use OAuth authentication, the application will need to use HTTPS. To do so, you can use a reverse Proxy (NGINX, Apache, ...) and manage the certificates at the reverse proxy level, or you can configure the app to enable HTTPS. In this case:
* Edit the `config.js` to enable HTTP
* Place you certificate and certificate key in the `src/certs` folder. The certificate and key must be name based on the names configured in the `config.js`file
* Start the APP with `npm start` from the `src` folder

## Security concerns
It is very important to protect your Mongo DB from external access. 

This application needs some critical information to be able to create/delete/retrieve the users' PSK. For example, the application need the Mist API Token, the Mist org_id and Mist site_id. These information can be used by afterward by malicious users to access your Mist Organization.

To protect your data, be sure to:
* Block all the external access to your Mongo DB
* Protect your Mongo DB with authentication

It is also possible to encypt most of the information stored by the application by setting the `MONGO_ENC_KEY` and `MONGO_SIG_KEY` configuration variables (or `encKey` and `sigKey` in the `config.js` file).

### Migrate from unencrypted DB to encrypted DB
** WARNING: Be sure to backup your DB before starting the migration **

If you start to use the application without setting the encription and signature keys, the application already stored some data unencrypted.

You can use the `encrypt_db.js` node script to automatically encrypt the data in your DB. To do so, just configure the encyption and signature keys, start the script (`node ./encypt_db.js` from the `src` folder). If the script ended succesfully, you can start the app again (`npm start`) with the encryption settings set.
