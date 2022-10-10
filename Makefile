setup: prepare install db-migrate

install:
	npm install

db-migrate:
	npx knex migrate:latest

build:
	npm run build

prepare:
	cp -n .env.example .env || true

start:
	heroku local -f Procfile.dev

start-backend:
	npm start --options --watch --verbose-watch --ignore-watch='node_modules .git .sqlite'

start-back-nodemon:
	nodemon --exec npm run dev

start-frontend:
	npx webpack --watch --progress

lint:
	npx eslint .

test:
	npm test -s

test-coverage:
	npm test -- --coverage

image-build:
	docker build --tag task-manager:dev -f ./Dockerfile .

container-start:
	docker start task-manager-test

container-build:
	docker run \
		-itd \
		--name task-manager-test \
		-p 127.0.0.1:5000:5000/tcp \
		-v "$$(pwd)"/:/app \
		task-manager:dev

container-lint:
	docker exec -it task-manager-test make lint

container-test:
	docker exec -it task-manager-test make test


compose-setup: compose-build compose-app-setup

compose-build:
	docker-compose build

compose-lint:
	docker-compose run app make lint

compose-test:
	docker-compose run app make test

compose-app-setup:
	docker-compose run app make setup

compose-app-build:
	docker-compose run app make build

compose:
	docker-compose up

compose-down:
	docker-compose down -v --remove-orphans
