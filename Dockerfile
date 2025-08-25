# ---- Base Stage ----
FROM node:20-alpine AS base
WORKDIR /usr/src/app

# Install everything (prod + dev deps)
COPY package*.json ./
RUN npm install

# ---- Build Stage ----
FROM base AS build
WORKDIR /usr/src/app
COPY . .
RUN npm run build

# # ---- Dev Stage ----
# FROM base AS dev
# WORKDIR /usr/src/app
# COPY . .
# # Run nodemon for hot reload
# CMD ["npm", "run", "dev"]

# ---- Production Stage ----
FROM node:20-alpine AS production
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
EXPOSE 8081
CMD ["npm", "run", "start"]
