// @ts-check
import _ from 'lodash';
import fastify from 'fastify';

import init from '../server/plugin.js';
import encrypt from '../server/lib/secure.cjs';
import { getCookie, getTestData, prepareData } from './helpers/index.js';

describe('test users CRUD', () => {
  let app;
  let knex;
  let models;
  let cookie;
  let testData;

  beforeAll(async () => {
    app = fastify({ logger: { prettyPrint: true } });
    // console.log('1');
    await init(app);
    // console.log('APP: ', app);
    knex = app.objection.knex;
    // console.log('3');
    models = app.objection.models;
    // console.log('4');
    await knex.migrate.latest();
    // console.log('3');
    await prepareData(app);
    // console.log('4');
    testData = await getTestData(app, 'User');
    // console.log('5');
    cookie = await getCookie(app, testData.users.existing);
  });

  beforeEach(async () => {
    // console.log('2');
    // await knex.migrate.latest();
    // console.log('3');
    // await prepareData(app);
    // console.log('4');
    // testData = await getTestData(app);
    // console.log('5');

    // console.log('COOKIES: ', cookie);
  });

  it('Get /users page with code 200', async () => {
    const response = await app.inject({
      method: 'GET',
      url: app.reverse('users'),
    });

    expect(response.statusCode).toBe(200);
  });

  it('Get /users/new page with code 200', async () => {
    const response = await app.inject({
      method: 'GET',
      url: app.reverse('newUser'),
    });

    expect(response.statusCode).toBe(200);
  });

  it('Get user edit page with code 200', async () => {
    const existingUserFixtures = testData.users.existing;
    // console.log('1', existingUserFixtures.email)
    // console.log('2', await models.user.query())
    const { id } = await models.user.query().findOne({ email: existingUserFixtures.email });
    // console.log('3', id);
    console.log('3', cookie);
    const response = await app.inject({
      method: 'GET',
      // url: `/users/${id}/edit`,
      url: app.reverse('editUser', { id }),
      cookies: cookie,
    });
    // const response = '';
    // console.log('4')
    expect(response.statusCode).toBe(200);
  });

  it('User restricted from edit alien user data', async () => {
    const existingUserFixtures = testData.users.existing;
    const otherUserFixtures = testData.users.other;

    const user = await models.user.query().findOne({ email: otherUserFixtures.email });

    const { id } = user;

    const response = await app.inject({
      method: 'GET',
      url: app.reverse('editUser', { id }),
      cookies: cookie,
      payload: {
        data: existingUserFixtures,
      },
    });
    expect(response.statusCode).toBe(302);

    const notUpdatedUser = await models.user.query().findById(id);

    expect(notUpdatedUser).toMatchObject(user);
  });

  it('Create new user', async () => {
    const params = testData.users.new;

    // console.log('NEW USER:', params);
    // console.log(await models.user.query());

    const response = await app.inject({
      method: 'POST',
      url: app.reverse('createUser'),
      payload: {
        data: params,
      },
    });

    expect(response.statusCode).toBe(302);
    const expected = {
      ..._.omit(params, 'password'),
      passwordDigest: encrypt(params.password),
    };
    const user = await models.user.query().findOne({ email: params.email });
    // console.log('SAVEDUSER ', await models.user.query());
    expect(user).toMatchObject(expected);
  });

  it('User restricted from patch alien user data', async () => {
    const existingUserFixtures = testData.users.existing;
    const otherUserFixtures = testData.users.other;
    const user = await models.user.query().findOne({ email: otherUserFixtures.email });
    const { id } = user;

    const response = await app.inject({
      method: 'PATCH',
      url: app.reverse('updateUser', { id }),
      cookies: cookie,
      payload: {
        data: existingUserFixtures,
      },
    });

    expect(response.statusCode).toBe(422);

    const notUpdatedUser = await models.user.query().findById(id);
    const expected = {
      ..._.omit(notUpdatedUser, 'password'),
      passwordDigest: encrypt(otherUserFixtures.password),
    };
    expect(notUpdatedUser).toMatchObject(expected);
  });

  it('User restricted from delete alien user data', async () => {
    const otherUserFixtures = testData.users.other;
    const otherUser = await models.user.query().findOne({ email: otherUserFixtures.email });
    const { id } = otherUser;

    const response = await app.inject({
      method: 'DELETE',
      url: app.reverse('deleteUser', { id }),
      cookies: cookie,
    });

    expect(response.statusCode).toBe(302);

    const phoenixUser = await models.user.query().findById(id);
    expect(otherUser).toMatchObject(phoenixUser);
  });

  it('Delete user', async () => {
    const existingUserFixtures = testData.users.existing;
    console.log(await models.user.query().findOne({ email: existingUserFixtures.email }));

    const { id } = await models.user.query().findOne({ email: existingUserFixtures.email });
    const response = await app.inject({
      method: 'DELETE',
      url: app.reverse('deleteUser', { id }),
      cookies: cookie,
    });

    expect(response.statusCode).toBe(302);

    const deletedUser = await models.user.query().findById(id);
    expect(deletedUser).toEqual(undefined);
  });

  it('Patch user data', async () => {
    cookie = await getCookie(app, testData.users.other);
    const existingUserFixtures = testData.users.other;
    const { id } = await models.user.query().findOne({ email: existingUserFixtures.email });
    const updatedUserFixtures = testData.users.updated;
    // console.log('EXIST', id);
    const response = await app.inject({
      method: 'PATCH',
      url: app.reverse('updateUser', { id }),
      cookies: cookie,
      payload: {
        data: updatedUserFixtures,
      },
    });
    expect(response.statusCode).toBe(302);

    const updatedUser = _.pick(
      await models.user.query().findById(id),
      ['email', 'passwordDigest'],
    );
    // console.log('UPDATED id: ', id);
    // console.log('UPDATED: ', await models.user.query().findById(id));
    const expected = {
      ..._.omit(updatedUserFixtures, ['id', 'password']),
      passwordDigest: encrypt(updatedUserFixtures.password),
    };
    // console.log('EXPECT: ', expected);
    expect(updatedUser).toMatchObject(expected);
  });

  afterEach(async () => {
    // await knex.migrate.rollback();
  });

  afterAll(async () => {
    await app.close();
  });
});
