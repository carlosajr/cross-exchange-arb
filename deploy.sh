#!/bin/bash

# Script de deploy para o servidor
echo "🚀 Iniciando deploy do Cross Exchange Arbitrage..."

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Compilar TypeScript
echo "🔨 Compilando TypeScript..."
npm run build

# Verificar se a compilação foi bem-sucedida
if [ $? -eq 0 ]; then
    echo "✅ Compilação concluída com sucesso!"
else
    echo "❌ Erro na compilação!"
    exit 1
fi

# Criar diretório de logs se não existir
mkdir -p logs

# Parar aplicação existente (se houver)
echo "🛑 Parando aplicação existente..."
pm2 stop cross-exchange-arb 2>/dev/null || true
pm2 delete cross-exchange-arb 2>/dev/null || true

# Iniciar aplicação com PM2
echo "🚀 Iniciando aplicação com PM2..."
pm2 start ecosystem.config.js

# Salvar configuração do PM2
pm2 save

# Mostrar status
echo "📊 Status da aplicação:"
pm2 status

echo "✅ Deploy concluído! Use 'pm2 logs cross-exchange-arb' para ver os logs."