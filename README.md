<h1>Backend project level 3 (Tasks manager)</h1>

### Hexlet tests:
[![Actions Status](https://github.com/fishtriangle/backend-project-6/workflows/hexlet-check/badge.svg)](https://github.com/fishtriangle/backend-project-6/actions)

### Code working tests and linter status:
[![Node CI](https://github.com/fishtriangle/backend-project-6/actions/workflows/nodejs.yml/badge.svg)](https://github.com/fishtriangle/backend-project-6/actions/workflows/nodejs.yml)

<hr>

[![Maintainability](https://api.codeclimate.com/v1/badges/8801a76f076e61934cd0/maintainability)](https://codeclimate.com/github/fishtriangle/backend-project-6/maintainability)

[![Test Coverage](https://api.codeclimate.com/v1/badges/8801a76f076e61934cd0/test_coverage)](https://codeclimate.com/github/fishtriangle/backend-project-6/test_coverage)

<hr>

### Demonstration webpage:
https://web-production-9bec.up.railway.app/

<hr>

## Description
Fourth studying project created with node.js, pug, bootstrap.
Manage users, their tasks, task labels and task statuses. 
Project uses postgres and sqlite databases.

## Make scripts
Install enviroment:
```
make install
```

Create tables in database:
```
make db-migrate
```

Run tests:
```
make test
```

Run tests coverage:
```
make test-coverage
```

start frontend:
```
make start-frontend
```

start backend in nodemon:
```
make start-back-nodemon
```

start backend:
```
make start-backend
```
