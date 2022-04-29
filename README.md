# Mist Webhook Monitor
This application provides an easy way to test and display Mist Webhooks. The application will automatically configure the Webhook settings in the Mist Org to receive them, and display each message received in a table.

# MIT LICENSE

Copyright (c) 2022 Thomas Munzer

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

# Features
* Automatically create and delete Webhook configuration in Mist Org (based on the required settings)
* Multiple simultanuous sessions from the same org (only one webhook configuration is created)
* Listen for Webhook messages comming from Mist Cloud
* Create a Websocket with the web browser, to forward the webhook messages to each web browser registered for the specific topic/org

**Note:** 
The application creates an Org API Token to be able to delete the Webhook configuration when the web browser session is closed. As of today, it is not possible to programmaticaly delete the Org Token, and it has to be done manually by the administrators.

<div>
<img src="https://github.com/tmunzer/mist_webhook_monitor/raw/main/._readme/img/config.png"  width="49%"  />
<img src="https://github.com/tmunzer/mist_webhook_monitor/raw/main/._readme/img/view.png"  width="49%"  />
<img src="https://github.com/tmunzer/mist_webhook_monitor/raw/main/._readme/img/details.png"  width="49%"  />
</div>
  
### Supported Webhook Topics
* alarms
* audits
* device-events
* device-updowns
* mxedge-events

# Install
This Reference Application can be used as a standalone Application, or it can be deployed as a Docker Image (recommanded).

## Deploy the Docker version (recommanded)
This application is available as a [Docker Image](https://hub.docker.com/repository/docker/tmunzer/mist_webhook_monitor). The Dockerfile is also available if you want top build it on your own.


The Docker Image exposes the following ports:
* TCP3000


### Run the Docker version
`   docker create -v  <path_to_config.js>/config.js:/app/config.js:ro --link <mongoDB_container_name>:mongo --name="<container_name>" -p 3000:80 tmunzer/mist_webhook_monitor`

### Configure the Docker version
Configuration can be done through the config file. An example of the `config.js` file can be found in `src/config_example.js`. Then, you just need to link the `config.js` file to `/app/config.js` in you container.

You can also use environment variables to configure the app:

Variable Name | Type | Default Value | Comment 
------------- | ---- | ------------- | ------- 
NODE_HOSTNAME | string | null | Server FQDN. Used to forge the url. |
NODE_PORT_HTTP | int | 3000 | TCP Port used for HTTP |
NODE_HTTPS | boolean | false | enable HTTPS in Node. require `NODE_HTTPS_CERT` and `NODE_HTTPS_KEY` |
NODE_PORT_HTTPS | int | 3443 | TCP Port used for HTTPS.. Only used if `NODE_HTTPS == true` |
NODE_HTTPS_CERT | string | null | certificate file name for HTTPS. The certificate file must be placed inside the `src/certs/` folder |
NODE_HTTPS_KEY | string | null | certificate key file name for HTTPS. The certificate key file must be placed inside the `src/certs/` folder |
NODE_WEBHOOK_HOSTNAME | string | null | SIf the server has a different public IP/FDQN for the webhook collector, otherwise use the NODE_HOSTNAME |
NODE_WEBHOOK_PORT | int | null | If you are deploying the app behind a reverse proxy or NAT, the public facing port may be different than the port used by the app. If null, the app doesn't specify the port when creating the webhook in Mist (which will use the default ws / wss ports) |
NODE_WEBHOOK_NAME | string | "webhook.mist-lab.fr" | name of the webhook created in Mist Org |
NODE_WEBHOOK_HTTPS | boolean | false | Ask Mist Cloud to send Webhook message through HTTPS (instead of HTTP). Require `NODE_HTTPS`==`true` or a reverse proxy in front of the app to deal with TLS |
NODE_WEBHOOK_CERT_CHECK | boolean | false | if `NODE_WEBHOOK_HTTPS`==`true`, tell Mist Cloud to check the TLS certificate or not |
NODE_WEBSOCKET_PORT | int | null | if the app is behind a reverse proxy, define the listening port, otherwise use the same value as `NODE_HTTP_PORT` or `NODE_HTTPS_PORT` |
NODE_WEBSOCKET_SECURE | boolean | false | to enable WSS at the app level. Require NODE_HTTPS = true |
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
SMTP_LOGO_URL | string | https://cdn.mist.com/wp-content/uploads/logo.png | URL to the logo to use in the Email |
APP_DISCLAIMER | string | null | Disclaimer to display on the Admin login page |


## Deploy the Standalone Application
This Reference APP is built over NodeJS. 

### Deploy the Application
* Install NodeJS LTS: https://nodejs.org/en/download/.
* Clone this repo.
* Configure the APP settings, in the `src/config.js` file. You will find an example in `src/config_example.js`. With Docker deployment, all the settings can be configured by using Environment Variables (see below)
* Install npm packages (`npm install` from the project folder).
* Start the APP with `npm start` from the `src` folder



