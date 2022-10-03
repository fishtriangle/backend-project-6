// @ts-check

import init from '../server/plugin.js';
import { getTestData, prepareData, getCookie } from './helpers/index.js';
import fastify from "fastify";

describe('test statuses CRUD', () => {
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
  });

  beforeEach(async () => {
    await knex.migrate.latest();
    await prepareData(app);
    testData = getTestData();
    cookie = await getCookie(app, testData.users.existing);
  });

  it('Get statuses page with code 200', async () => {
    const response = await app.inject({
      method: 'GET',
      url: app.reverse('statuses'),
      cookies: cookie,
    });

    expect(response.statusCode).toBe(200);
  });

  it('Get statuses page with code 302 unauthorized user', async () => {
    const response = await app.inject({
      method: 'GET',
      url: app.reverse('getStatusPage'),
    });

    expect(response.statusCode).toBe(302);
  });

  it('Get new status code page with code 200', async () => {
    const response = await app.inject({
      method: 'GET',
      url: app.reverse('getStatusPage'),
      cookies: cookie,
    });

    expect(response.statusCode).toBe(200);
  });

  it('Get statuses edit status code is 200', async () => {
    const existingStatus = testData.statuses.existing;
    const { id } = await models.status.query().findOne({ name: existingStatus.name });

    const response = await app.inject({
      method: 'GET',
      url: app.reverse('editStatus', { id }),
      cookies: cookie,
    });

    expect(response.statusCode).toBe(200);
  });

  it('Create new status', async () => {
    const expectStatus = testData.statuses.new;

    const response = await app.inject({
      method: 'POST',
      url: app.reverse('createStatus'),
      cookies: cookie,
      payload: {
        data: expectStatus,
      },
    });

    expect(response.statusCode).toBe(302);

    const status = await models.status.query().findOne({ name: expectStatus.name });
    expect(status).toMatchObject(expectStatus);
  });

  it('Two statuses with the same name are denied', async () => {
    const existingStatus = testData.statuses.existing;

    const expectedStatuses = await models.status.query();

    const response = await app.inject({
      method: 'POST',
      url: app.reverse('createStatus'),
      cookies: cookie,
      payload: {
        data: existingStatus,
      },
    });

    expect(response.statusCode).toBe(422);

    const updatedStatuses = await models.status.query();
    expect(updatedStatuses).toMatchObject(expectedStatuses);
  });

  it('Authorized user can edit status', async () => {
    const existingStatus = testData.statuses.existing;
    const updatedStatusFixture = testData.statuses.updated;

    const { id } = await models.status.query().findOne({ name: existingStatus.name });

    const response = await app.inject({
      method: 'PATCH',
      url: app.reverse('updateStatus', { id }),
      cookies: cookie,
      payload: {
        data: updatedStatusFixture,
      },
    });

    expect(response.statusCode).toBe(302);

    const updatedStatus = await models.status.query().findById(id);
    expect(updatedStatus).toMatchObject(updatedStatusFixture);
  });

  it('Authorized user can delete status', async () => {
    const existingStatus = testData.statuses.existing;

    const { id } = await models.status.query().findOne({ name: existingStatus.name });

    const response = await app.inject({
      method: 'DELETE',
      url: app.reverse('deleteStatus', { id }),
      cookies: cookie,
    });

    expect(response.statusCode).toBe(302);

    const deletedStatus = await models.status.query().findById(id);
    expect(deletedStatus).toBeUndefined();
  });

  afterEach(async () => {
    // await knex.migrate.rollback();
  });

  afterAll(async () => {
    await app.close();
  });
});
