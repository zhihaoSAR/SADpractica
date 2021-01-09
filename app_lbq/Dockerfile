FROM node:12

WORKDIR /usr/src/app
COPY LBQ.js ./
COPY package*.json ./

RUN npm install

EXPOSE 3020/tcp
EXPOSE 3021/tcp
EXPOSE 3022/tcp

CMD [ "node", "LBQ.js" ]