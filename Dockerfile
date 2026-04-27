# Usa una imagen de Node.js ligera
FROM node:20-alpine

# Crear directorio de trabajo
WORKDIR /usr/src/app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Construir el proyecto
RUN npm run build

# Exponer el puerto de NestJS
EXPOSE 3000

# Comando para arrancar la app
CMD ["npm", "run", "start:prod"]