# Plan de Migración de ExpenseFlow v2.2

## Objetivo
Migrar la aplicación ExpenseFlow de Data Button a un entorno auto-gestionado.

## Tareas Pendientes
- [ ] **Análisis del proyecto (con IA):**
    - [x] Leer la documentación proporcionada.
    - [x] Identificar el frontend (React/TypeScript) y el backend (FastAPI/Python).
    - [ ] Identificar todas las dependencias y servicios externos (Firebase Auth, Firestore, Google Drive).

- [ ] **Configuración del Entorno Local (Docker):**
    - [x] Crear un `Dockerfile` para el backend.
    - [x] Crear un `Dockerfile` para el frontend.
    - [ ] Crear un `docker-compose.yml` para gestionar ambos servicios.

- [ ] **Refactorización de Autenticación y APIs:**
    - [ ] Reemplazar la autenticación de Firebase/Databutton con una solución auto-gestionada (por ejemplo, con JWT).
    - [ ] Modificar el backend para usar una base de datos local (por ejemplo, PostgreSQL o MySQL) en lugar de Firestore.
    - [ ] Ajustar las APIs del frontend para que se conecten al nuevo backend.

- [ ] **Ajuste de Servicios Externos:**
    - [ ] Adaptar la subida de recibos a Google Drive o a un servicio de almacenamiento local.
    - [ ] Ajustar la lógica de exportación a Excel.

- [ ] **Despliegue y Control de Versiones:**
    - [x] Inicializar un repositorio Git.
    - [ ] Conectar el repositorio a GitHub/GitLab.
    - [ ] Desplegar la aplicación en un servidor web.