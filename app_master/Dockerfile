FROM node:12

WORKDIR /usr/src/app
COPY Master.js ./
COPY package*.json ./

RUN npm install

EXPOSE 3000/tcp
EXPOSE 3001/tcp

CMD [ "node", "Master.js" ]