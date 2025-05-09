#!/bin/bash

# Script para inicializar o banco de dados

# Esperar o banco de dados estar pronto
echo "Aguardando o banco de dados iniciar..."
sleep 10

# Executar a migração do banco de dados
echo "Aplicando as migrações do banco de dados..."
npm run db:push

# Inicializar com dados básicos se necessário
echo "Inicialização do banco de dados concluída!"