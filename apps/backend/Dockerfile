# Usamos una imagen oficial de Python
FROM python:3.10-slim

# Establecemos el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos el archivo de requerimientos
COPY requirements.txt .

# Instalamos las dependencias
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos el resto del proyecto
COPY . .

# Aseguramos que el script pueda ejecutarse
RUN chmod +x ./entrypoint.sh

# Exponemos el puerto donde correrá Django y Flower
EXPOSE 8000
EXPOSE 5555


# Comando por defecto para iniciar el servidor de desarrollo de Django
# CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
# Usamos el entrypoint personalizado
ENTRYPOINT ["./entrypoint.sh"]