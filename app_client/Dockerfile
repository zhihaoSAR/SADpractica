FROM node:12

WORKDIR /usr/src/app
COPY client.js ./
COPY package*.json ./

RUN npm install

EXPOSE 3020/tcp

CMD [ "node", "client.js" ]