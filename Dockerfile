# Usa una imagen oficial de Python como imagen base. La versión 'slim' es más ligera.
FROM python:3.11-slim

# Establece variables de entorno para optimizar la ejecución de Python en Docker.
# PYTHONDONTWRITEBYTECODE: Evita que Python escriba archivos .pyc.
# PYTHONUNBUFFERED: Asegura que los logs de Python se muestren en tiempo real.
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Establece el directorio de trabajo dentro del contenedor.
WORKDIR /app

# Instala 'uv', el gestor de paquetes de Python que usa el proyecto.
RUN pip install uv

# Copia el fichero de dependencias primero para aprovechar el cache de capas de Docker.
# Si este fichero no cambia, Docker no volverá a instalar las dependencias en builds futuros.
COPY requirements.txt .

# Instala las dependencias del proyecto usando 'uv'.
RUN uv pip install --no-cache-dir -r requirements.txt

# Copia el resto del código de la aplicación del backend al directorio de trabajo.
COPY . .

# Crea un usuario y un grupo sin privilegios de root por seguridad.
RUN addgroup --system app && adduser --system --group app

# Cambia el propietario del directorio de la aplicación al nuevo usuario.
RUN chown -R app:app /app

# Cambia al usuario no-root.
USER app

# Expone el puerto 8000 para que la aplicación sea accesible desde fuera del contenedor.
EXPOSE 8000

# Comando para ejecutar la aplicación con Uvicorn.
# Asume que tu fichero principal se llama 'main.py' y la instancia de FastAPI es 'app'.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
