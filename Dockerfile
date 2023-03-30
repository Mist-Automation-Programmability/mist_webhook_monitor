FROM node:current-alpine3.16
LABEL fr.mist-lab.mwm.version="0.0.1"
LABEL fr.mist-lab.mwm.release-date="2022-03-21"

COPY ./src /app/

WORKDIR /app

RUN npm	install

EXPOSE 3000
ENTRYPOINT [ "npm", "start" ]


