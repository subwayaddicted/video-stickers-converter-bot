FROM node:17-alpine3.14 as ts-compiler
WORKDIR /usr/app
COPY package*.json /usr/app/
COPY tsconfig*.json /usr/app/
RUN npm install
COPY . /usr/app/
RUN npm run build

FROM node:17-alpine3.14 as ts-remover
WORKDIR /usr/app
COPY --from=ts-compiler /usr/app/package*.json /usr/app/
COPY --from=ts-compiler /usr/app/ /usr/app/
RUN npm install --only=production

FROM node:17-alpine3.14
RUN apk add dumb-init
ENV NODE_ENV production
WORKDIR /usr/app
COPY --from=ts-remover /usr/app /usr/app/
RUN chown -Rh 1000:1000 /usr/app
USER 1000
CMD ["dumb-init", "npm", "start"]
