# --- Etapa 1: Build ---
# Usa una imagen de Node.js ligera como base para la compilación.
FROM node:20-alpine AS builder

# Establece el directorio de trabajo dentro del contenedor.
WORKDIR /app

# Habilita Corepack para usar la versión de Yarn especificada en package.json.
RUN corepack enable

# Copia los ficheros de definición de dependencias.
# Aprovecha el cache de Docker: si no cambian, no se reinstalan las dependencias.
COPY package.json yarn.lock* .yarnrc.yml ./

# Instala las dependencias de forma "inmutable", ideal para CI/CD.
RUN yarn install --immutable

# Copia el resto del código fuente de la aplicación.
COPY . .

# Ejecuta el script de build para generar los archivos estáticos de producción.
RUN yarn build

# --- Etapa 2: Production ---
# Usa una imagen de Nginx muy ligera para servir los archivos.
FROM nginx:stable-alpine

# Copia los archivos estáticos generados en la etapa de 'build' al directorio web de Nginx.
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia la configuración personalizada de Nginx.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expone el puerto 80, que es el puerto por defecto de Nginx.
EXPOSE 80

# El comando por defecto de la imagen de Nginx iniciará el servidor automáticamente.