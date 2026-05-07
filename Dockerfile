FROM node:22.22-alpine3.22

WORKDIR /usr/src/app

COPY . .

RUN npm install --omit=dev && apk add --no-cache libc6-compat

EXPOSE 3000

CMD ["npm", "start"]
