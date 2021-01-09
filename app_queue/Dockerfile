FROM node:12

WORKDIR /usr/src/app
COPY Queue.js ./
COPY package*.json ./

RUN npm install

EXPOSE 3030/tcp
EXPOSE 3031/tcp

CMD [ "node", "Queue.js" ]