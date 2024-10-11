


FROM node:18-alpine3.18 as prod-lib
WORKDIR /app
COPY package.json package.json
COPY yarn.lock yarn.lock
COPY packages/bot-service/package.json packages/bot-service/package.json
COPY packages/offchain-worker/package.json packages/offchain-worker/package.json
COPY packages/onchain-worker/package.json packages/onchain-worker/package.json
COPY packages/onchain-queue/package.json packages/onchain-queue/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/web3/package.json packages/web3/package.json

RUN yarn install --production  --ignore-scripts --prefer-offline
RUN apk add --no-cache --virtual .gyp python3 make g++ curl\
  && npm rebuild bcrypt --build-from-source \
  && apk del .gyp make gcc g++ python3

FROM node:18-alpine3.18 as dev-lib
WORKDIR /app
COPY package.json package.json
COPY yarn.lock yarn.lock
COPY packages/bot-service/package.json packages/bot-service/package.json
COPY packages/offchain-worker/package.json packages/offchain-worker/package.json
COPY packages/onchain-worker/package.json packages/onchain-worker/package.json
COPY packages/onchain-queue/package.json packages/onchain-queue/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/web3/package.json packages/web3/package.json

RUN yarn install

FROM dev-lib as builder
ARG PKG
COPY packages/shared packages/shared
COPY packages/web3 packages/web3
COPY packages/${PKG} packages/${PKG}
COPY package.json package.json
COPY yarn.lock yarn.lock
COPY tsconfig.json tsconfig.json
RUN yarn workspace ${PKG} build 

FROM prod-lib as runner
ARG PKG
COPY --from=builder /app/packages/${PKG}/dist packages/${PKG}/dist
RUN find packages/${PKG}/dist -name '*.map' -type f -delete

RUN chown -R node:node /app
USER node  

ENV main=packages/${PKG}/dist/${PKG}/src/main.js
CMD node $main

