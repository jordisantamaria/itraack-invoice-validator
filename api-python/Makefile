.PHONY: clean build-layer deploy local

# Variables
STACK_NAME = itraack-invoice-api
REGION = eu-south-2
PYTHON_VERSION = python3.11

# Cargar variables de entorno si existe .env
-include .env
export

# Limpiar archivos temporales
clean:
	rm -rf layer
	rm -rf .aws-sam
	rm -rf __pycache__
	find . -name "*.pyc" -delete

# Crear el layer con las dependencias
build-layer:
	@echo "Creando layer con dependencias..."
	mkdir -p layer/python
	pip install --platform manylinux2014_x86_64 --only-binary=:all: -r requirements.txt -t layer/python/
	@echo "Layer creado en ./layer/python/"

# Construir la aplicación SAM
build: build-layer
	sam build

# Desplegar la aplicación
deploy: build
	@if [ -z "$(OPENAI_API_KEY)" ]; then \
		echo "ERROR: La variable OPENAI_API_KEY no está definida en el archivo .env"; \
		echo "Por favor, ejecuta 'make setup-env' y configura tu API key"; \
		exit 1; \
	fi
	sam deploy --stack-name $(STACK_NAME) \
		--region $(REGION) \
		--capabilities CAPABILITY_IAM \
		--parameter-overrides OpenAIApiKey=$(OPENAI_API_KEY)

# Ejecutar localmente
local:
	cd src && $(PYTHON_VERSION) app.py

# Configurar variables de entorno
setup-env:
	@echo "Configurando variables de entorno..."
	@if [ ! -f .env ]; then \
		echo "OPENAI_API_KEY=" > .env; \
		echo "Archivo .env creado. Por favor, añade tu API key de OpenAI."; \
	else \
		echo "El archivo .env ya existe."; \
	fi

# Instalar dependencias de desarrollo
dev-setup:
	pip install -r requirements.txt

# Ayuda
help:
	@echo "Comandos disponibles:"
	@echo "  make clean         - Limpiar archivos temporales"
	@echo "  make build-layer   - Crear el layer con dependencias"
	@echo "  make build         - Construir la aplicación SAM"
	@echo "  make deploy        - Desplegar la aplicación"
	@echo "  make local         - Ejecutar la aplicación localmente"
	@echo "  make setup-env     - Configurar archivo .env"
	@echo "  make dev-setup     - Instalar dependencias de desarrollo"