FROM --platform=linux/amd64 node:14

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 80

CMD ["node", "app.js"]
