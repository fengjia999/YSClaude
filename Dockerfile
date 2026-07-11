FROM node:22-bookworm-slim

WORKDIR /app

# React Native DevTools bundles a native browser shell that needs these shared
# libraries during Expo web export in slim Linux images.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libasound2 \
        libatk-bridge2.0-0 \
        libatk1.0-0 \
        libcups2 \
        libdrm2 \
        libgbm1 \
        libnspr4 \
        libnss3 \
        libxcomposite1 \
        libxdamage1 \
        libxfixes3 \
        libxkbcommon0 \
        libxrandr2 \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx expo export --platform web

RUN npm install -g serve

EXPOSE 8080
CMD ["sh", "-c", "serve dist -l ${PORT:-8080}"]
