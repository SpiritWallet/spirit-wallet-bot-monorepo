


FROM node:18-alpine3.18 as prod-lib
WORKDIR /app
COPY package.json package.json
COPY yarn.lock yarn.lock
COPY packages/bot-service/package.json packages/bot-service/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/web3/package.json packages/web3/package.json

RUN yarn install --production  --ignore-scripts --prefer-offline

FROM node:18-alpine3.18 as dev-lib
WORKDIR /app
COPY package.json package.json
COPY yarn.lock yarn.lock
COPY packages/bot-service/package.json packages/bot-service/package.json
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

