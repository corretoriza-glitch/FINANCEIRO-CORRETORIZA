FROM node:22-alpine

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de dependências
COPY package*.json ./

# Instala as dependências, incluindo as devDependencies para o build do Vite e o tsx
RUN npm ci

# Copia todo o código para dentro do container
COPY . .

# Executa o build da aplicação frontend (Vite)
RUN npm run build

# Define a porta que será exposta
EXPOSE 8080

# Define as variáveis de ambiente para modo produção
ENV NODE_ENV=production

# Comando para iniciar a aplicação via tsx
CMD ["npx", "tsx", "server.ts"]
