FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
	CMD node -e "require('http').get('http://localhost:5173/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
