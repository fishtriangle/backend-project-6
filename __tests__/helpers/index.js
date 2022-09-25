// @ts-check

// import { URL } from 'url';
// import fs from 'fs';
// import path from 'path';
import { faker } from '@faker-js/faker';
// import {use} from "i18next";
import encrypt from '../../server/lib/secure.cjs';

// TODO: использовать для фикстур https://github.com/viglucci/simple-knex-fixtures

// const getFixturePath = (filename) => path.join('..', '..', '__fixtures__', filename);
// const readFixture = (filename) => (
//   fs.readFileSync(new URL(getFixturePath(filename), import.meta.url), 'utf-8')
// ).trim();
// const getFixtureData = (filename) => JSON.parse(readFixture(filename));

function createRandomUser() {
  return {
    id: faker.datatype.number(),
    // username: faker.internet.userName(),
    email: faker.internet.email(),
    // avatar: faker.image.avatar(),
    password: faker.internet.password(15, false, /[a-zA-Z]|\d/),
    // birthdate: faker.date.birthdate(),
    // registeredAt: faker.date.past(),
  };
}

// export const getTestData = () => getFixtureData('testData.json');
export const getTestData = async (app) => {
  const users = {
    users: {
      new: createRandomUser(),
      existing: createRandomUser(),
      updated: createRandomUser(),
      other: createRandomUser(),
    },
  };

  const { knex } = app.objection;

  const usersList = Object.values(users.users)
    .filter(({ id }) => ((id === users.users.existing.id) || (id === users.users.other.id)))
    .map(({ id, email, password }) => ({ id, email, passwordDigest: encrypt(password) }));
  // console.log('HELPERS', usersList);

  await knex('users').insert(usersList);

  return users;
};

export const prepareData = async (app) => {
  const { knex } = app.objection;

  const usersList = [];
  Array.from({ length: 5 }).forEach(() => {
    const generatedUser = createRandomUser();
    generatedUser.passwordDigest = encrypt(generatedUser.password);
    delete generatedUser.password;
    usersList.push(generatedUser);
  });

  // получаем данные из фикстур и заполняем БД
  await knex('users').insert(usersList);
};

export const getCookie = async (app, data) => {
  const responseSignIn = await app.inject({
    method: 'POST',
    url: app.reverse('session'),
    payload: {
      data,
    },
  });

  const [sessionCookie] = responseSignIn.cookies;
  const { name, value } = sessionCookie;
  const cookie = { [name]: value };
  return cookie;
};
