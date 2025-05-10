FROM node:20-slim as builder

# Usar uma imagem base mais leve e compatível com ARM64
WORKDIR /app

# Copiar arquivos de dependências
COPY package.json package-lock.json ./

# Instalar dependências
RUN npm ci

# Copiar todo o código fonte
COPY . .

# Compilar o projeto para produção
RUN npm run build

# Stage 2: Criar a imagem de produção
FROM node:20-slim

WORKDIR /app

# Copiar apenas os arquivos necessários para rodar a aplicação
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env ./.env

# Expor a porta que a aplicação usa
EXPOSE 3000

# Comando para rodar a aplicação
CMD ["node", "dist/server/index.js"]