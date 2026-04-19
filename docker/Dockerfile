FROM oven/bun:1.2.22

WORKDIR /app

COPY package.json bun.lock pnpm-lock.yaml tsconfig.json config.yaml ./
RUN bun install --frozen-lockfile

COPY . .

EXPOSE 8989

CMD ["bun", "run", "dev"]
