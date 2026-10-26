# PrepTrace frontend (React + Vite)

# 1. Build the static site. Vite reads VITE_* variables at BUILD time,
#    so the backend URL is passed as a build argument.
FROM node:22-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .
ARG VITE_BACKEND_URL=http://localhost:8000
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
RUN npm run build

# 2. Serve the built files. -s = single-page-app fallback to index.html
FROM node:22-slim
WORKDIR /app
RUN npm install -g serve@14 --no-audit --no-fund
COPY --from=build /app/dist ./dist

EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]
