# Estágio de build
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install && npm run build

# Estágio de produção
FROM node:20-alpine
WORKDIR /app
# Copie apenas os arquivos necessários
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
# Copie o arquivo .env para as configurações do banco de dados
COPY .env .env

# Instale todas as dependências (incluindo as de desenvolvimento)
RUN npm install

# Exponha a porta usada pelo servidor
EXPOSE 3000

# Variável de ambiente para produção
ENV NODE_ENV=production

# Execute o servidor Node.js
CMD ["node", "dist/index.js"]