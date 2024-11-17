FROM node:22.11-slim

WORKDIR /app

RUN npx corepack enable

COPY ./package.json ./pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile --prod

COPY . .

RUN pnpm build

CMD ["node", "dist/index.js"]
