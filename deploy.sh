#!/bin/bash

# Script para facilitar a implantação da aplicação com Docker

# Verificar se o Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "Docker não está instalado. Por favor, instale o Docker primeiro."
    exit 1
fi

# Verificar se o Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose não está instalado. Por favor, instale o Docker Compose primeiro."
    exit 1
fi

# Verificar se o arquivo .env existe
if [ ! -f .env ]; then
    echo "Arquivo .env não encontrado. Criando a partir do modelo .env.example..."
    cp .env.example .env
    echo "Por favor, edite o arquivo .env com suas configurações antes de continuar."
    exit 1
fi

# Construir e iniciar os containers
echo "Construindo e iniciando os containers..."
docker-compose build
docker-compose up -d

# Verificar se os containers estão rodando
if [ $? -eq 0 ]; then
    echo "========================================================"
    echo "Aplicação implantada com sucesso!"
    echo "Acesse a aplicação em: http://localhost:5000"
    echo "========================================================"
    
    # Mostrar os logs dos containers
    echo "Logs da aplicação (Ctrl+C para sair):"
    docker-compose logs -f app
else
    echo "Ocorreu um erro ao iniciar os containers. Verifique os logs para mais detalhes."
    docker-compose logs
fi