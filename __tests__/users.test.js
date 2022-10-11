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

    await init(app);

    knex = app.objection.knex;

    models = app.objection.models;

    await knex.migrate.latest();

    await prepareData(app);

    testData = await getTestData(app, 'User');

    cookie = await getCookie(app, testData.users.existing);
  });

  beforeEach(async () => {
    // await knex.migrate.latest();

    // await prepareData(app);

    // testData = await getTestData(app);
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

    const { id } = await models.user.query().findOne({ email: existingUserFixtures.email });

    const response = await app.inject({
      method: 'GET',
      // url: `/users/${id}/edit`,
      url: app.reverse('editUser', { id }),
      cookies: cookie,
    });
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

    const expected = {
      ..._.omit(updatedUserFixtures, ['id', 'password']),
      passwordDigest: encrypt(updatedUserFixtures.password),
    };

    expect(updatedUser).toMatchObject(expected);
  });

  afterEach(async () => {
    // await knex.migrate.rollback();
  });

  afterAll(async () => {
    await app.close();
  });
});
