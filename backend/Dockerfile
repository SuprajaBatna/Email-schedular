FROM node:20-alpine

WORKDIR /app

# Install openssl for Prisma
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 5000

CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && npm start"]
