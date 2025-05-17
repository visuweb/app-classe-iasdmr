# Estágio de build
FROM node:20-alpine AS builder

# Definindo diretório de trabalho
WORKDIR /app

# Copiando arquivos da aplicação
COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

# Executando o build
RUN npm run build

# ===============================
# Estágio de produção
FROM node:20-alpine

# Definindo diretório de trabalho
WORKDIR /app

# Copiando apenas o necessário para produção
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json

# Instalando apenas dependências de produção
RUN npm install --only=production --legacy-peer-deps

# Criação de um usuário não-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Expondo a porta correta
EXPOSE 3001

# Definindo a variável de ambiente para produção
ENV NODE_ENV=production
ENV PORT=3001

# Executando o servidor Node.js
CMD ["node", "dist/index.js"]
