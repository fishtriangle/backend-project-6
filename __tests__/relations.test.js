// @ts-check

import fastify from 'fastify';

import init from '../server/plugin.js';
import { getTestData, prepareData, getCookie } from './helpers/index.js';

describe('test relations CRUD', () => {
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

  it('Create task with labelId should create only task-label relation', async () => {
    const taskData = testData.tasks.newTaskData;

    const response = await app.inject({
      method: 'POST',
      url: app.reverse('createTask'),
      cookies: cookie,
      payload: {
        data: taskData,
      },
    });

    const { labels } = await models.task
      .query()
      .findOne({ 'tasks.name': taskData.name })
      .withGraphJoined('labels');

    const newTask = await models.task.query().findOne({ 'tasks.name': taskData.name });

    // eslint-disable-next-line no-restricted-syntax
    for (const label of labels) {
      // eslint-disable-next-line no-await-in-loop
      const [fromRelationsTask] = await label.$relatedQuery('tasks');
      expect(newTask).toMatchObject(fromRelationsTask);
    }

    expect(response.statusCode).toBe(302);
  });

  it('Update task with adding labelId relation should add one label relations', async () => {
    const taskData = testData.tasks.existing;
    const expectedRelatedLabelId = testData.labels.relatedAdd;

    const task = await models.task.query().findOne({ 'tasks.name': taskData.name });
    const { id } = task;

    const response = await app.inject({
      method: 'PATCH',
      url: app.reverse('updateTask', { id }),
      cookies: cookie,
      payload: {
        data: { ...taskData, labels: expectedRelatedLabelId },
      },
    });

    const { labels } = await models.task
      .query()
      .findOne({ 'tasks.name': taskData.name })
      .withGraphJoined('labels');

    // eslint-disable-next-line no-restricted-syntax
    for (const label of labels) {
      // eslint-disable-next-line no-await-in-loop
      const [updatedTask] = await label.$relatedQuery('tasks');
      expect(task).toMatchObject(updatedTask);
    }

    expect(response.statusCode).toBe(302);
  });

  it('Update task with removing labelId relation should removing one label relations', async () => {
    const taskData = testData.tasks.existing;
    const expectedRelatedLabelId = testData.labels.relatedRemove;
    const labelRemovedFromRelation = testData.labels.relatedRemovedLabel;

    const task = await models.task.query().findOne({ 'tasks.name': taskData.name });
    const { id } = task;

    const response = await app.inject({
      method: 'PATCH',
      url: app.reverse('updateTask', { id }),
      cookies: cookie,
      payload: {
        data: { ...taskData, labels: expectedRelatedLabelId },
      },
    });

    const { labels } = await models.task
      .query()
      .findOne({ 'tasks.name': taskData.name })
      .withGraphJoined('labels');

    const labelWithRemovedTaskRealation = await models.label.query()
      .findById(labelRemovedFromRelation.id);

    const [taskFromRemovedRelation] = await labelWithRemovedTaskRealation.$relatedQuery('tasks');

    expect(taskFromRemovedRelation).toBeUndefined();

    // eslint-disable-next-line no-restricted-syntax
    for (const label of labels) {
      // eslint-disable-next-line no-await-in-loop
      const [updatedTask] = await label.$relatedQuery('tasks');
      expect(task).toMatchObject(updatedTask);
    }

    expect(response.statusCode).toBe(302);
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
