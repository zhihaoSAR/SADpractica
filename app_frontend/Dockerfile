FROM node:12

WORKDIR /usr/src/app
COPY frontend.js ./
COPY package*.json ./

RUN npm install

EXPOSE 3040/tcp

CMD [ "node", "frontend.js" ]