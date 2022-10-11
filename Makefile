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
