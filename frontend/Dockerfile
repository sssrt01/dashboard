FROM node:latest AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .

RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Запуск nginx
CMD ["nginx", "-g", "daemon off;"]
