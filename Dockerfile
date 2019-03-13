FROM node:10.13-alpine AS builder

WORKDIR /usr/src/me

COPY package*.json ./
RUN npm ci --silent

COPY . .
RUN npm run build

FROM node:10.13-alpine
WORKDIR /me
RUN npm install serve -g 
COPY --from=builder /usr/src/me/build /me/build
COPY --from=builder /usr/src/me/package.json /me

EXPOSE 3080
CMD npm run serve