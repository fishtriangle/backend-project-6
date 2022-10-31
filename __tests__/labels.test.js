import fastify from 'fastify';

import init from '../server/plugin.js';
import { getTestData, prepareData, getCookie } from './helpers/index.js';

describe('labels statuses CRUD', () => {
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
    testData = await getTestData(app);
    cookie = await getCookie(app, testData.users.existing);
  });

  it('Labels page status code is 200', async () => {
    const response = await app.inject({
      method: 'GET',
      url: app.reverse('labels'),
      cookies: cookie,
    });

    expect(response.statusCode).toBe(200);
  });

  it('Labels create page status code is 200', async () => {
    const response = await app.inject({
      method: 'GET',
      url: app.reverse('newLabel'),
      cookies: cookie,
    });

    expect(response.statusCode).toBe(200);
  });

  it('Labels edit page status code is 200', async () => {
    const existingLabelData = testData.labels.existing;
    const { id } = await models.label.query().findOne({ name: existingLabelData.name });

    const response = await app.inject({
      method: 'GET',
      url: app.reverse('editLabel', { id }),
      cookies: cookie,
    });

    expect(response.statusCode).toBe(200);
  });

  it('User can create new label', async () => {
    const expected = testData.labels.new;

    const response = await app.inject({
      method: 'POST',
      url: app.reverse('createLabel'),
      cookies: cookie,
      payload: {
        data: expected,
      },
    });

    expect(response.statusCode).toBe(302);

    const label = await models.label.query().findOne({ name: expected.name });
    expect(label).toMatchObject(expected);
  });

  it('User can edit existing label', async () => {
    const existingLabelData = testData.labels.existing;
    const dataForLabelUpdating = testData.labels.updated;

    const { id } = await models.label.query().findOne({ name: existingLabelData.name });

    const response = await app.inject({
      method: 'PATCH',
      url: app.reverse('updateLabel', { id }),
      cookies: cookie,
      payload: {
        data: dataForLabelUpdating,
      },
    });

    expect(response.statusCode).toBe(302);

    const updatedStatus = await models.label.query().findById(id);
    expect(updatedStatus).toMatchObject(dataForLabelUpdating);
  });

  it('User can delete existing label', async () => {
    const existingLabelData = testData.labels.existing;

    const { id } = await models.label.query().findOne({ name: existingLabelData.name });

    const response = await app.inject({
      method: 'DELETE',
      url: app.reverse('deleteLabel', { id }),
      cookies: cookie,
    });

    expect(response.statusCode).toBe(302);

    const deletedStatus = await models.label.query().findById(id);
    expect(deletedStatus).toBeUndefined();
  });

  afterEach(async () => {
    await knex('users').truncate();
    await knex('statuses').truncate();
    await knex('tasks').truncate();
    await knex('labels').truncate();
    await knex('tasks_labels').truncate();
  });

  afterAll(() => {
    app.close();
  });
});
