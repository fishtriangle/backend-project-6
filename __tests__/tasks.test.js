// @ts-check

import fastify from 'fastify';
import init from '../server/plugin.js';
import { getTestData, prepareData, getCookie } from './helpers/index.js';

const templatesTestsData = [
  {
    testName: 'Status code 200 on GET tasks',
    getTestURL: (server) => server.reverse('tasks'),
    shouldUseAuthentification: true,
    statusCode: 200,
  },
  {
    testName: 'Status code 200 on GET tasks/new',
    getTestURL: (server) => server.reverse('newTask'),
    shouldUseAuthentification: true,
    statusCode: 200,
  },
  {
    testName: 'Status code 200 on GET tasks/:id/edit',
    getTestURL: (server, id) => server.reverse('editTask', { id }),
    shouldUseAuthentification: true,
    statusCode: 200,
  },
  {
    testName: 'Status code 200 on GET tasks/:id',
    getTestURL: (server, id) => server.reverse('showTask', { id }),
    shouldUseAuthentification: true,
    statusCode: 200,
  },
  {
    testName: 'Status code 302 on GET tasks with unauthorized user',
    getTestURL: (server) => server.reverse('tasks'),
    shouldUseAuthentification: false,
    statusCode: 302,
  },
];

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
    testData = await getTestData(app);
    cookie = await getCookie(app, testData.users.existing);
  });

  describe('GET requests', () => {
    test.each(
      templatesTestsData.map(({
        testName, getTestURL, shouldUseAuthentification, statusCode,
      }) => [
        testName,
        getTestURL,
        shouldUseAuthentification,
        statusCode,
      ]),
    )('%s,', async (_, getTestURL, shouldUseAuthentification, statusCode) => {
      const existingTaskFixture = testData.tasks.existing;
      const { id } = await models.task.query().findOne({ name: existingTaskFixture.name });

      const response = await app.inject({
        method: 'GET',
        url: getTestURL(app, id),
        cookies: shouldUseAuthentification ? cookie : { session: '' },
      });

      expect(response.statusCode).toBe(statusCode);
    });
  });

  it('Create new task', async () => {
    const expectedTask = testData.tasks.new;
    const currentUser = await app.objection.models.user.query().findOne({
      email: testData.users.existing.email,
    });
    expectedTask.creatorId = currentUser.id;

    const response = await app.inject({
      method: 'POST',
      url: app.reverse('createTask'),
      cookies: cookie,
      payload: {
        data: expectedTask,
      },
    });

    expect(response.statusCode).toBe(302);

    const newTask = await models.task.query().findOne({ name: expectedTask.name });

    expect(newTask).toMatchObject(expectedTask);
  });

  const patchTaskTemplate = [
    {
      testName: 'Update name of existing task',
      testData: (data) => data.tasks.existing,
      updatedTestData: (data) => data.tasks.updatedName,
      getPayloadData: (data, fixture) => ({ ...fixture.tasks.existing, name: data.name }),
      expectedData: (data) => data.tasks.updatedName,
    },
    {
      testName: 'Update executor',
      testData: (data) => data.tasks.existing,
      updatedTestData: (data) => data.tasks.updatedExecutor,
      getPayloadData: (data, fixture) => ({
        ...fixture.tasks.existing, executorId: data.executorId,
      }),
      expectedData: (data) => data.tasks.updatedExecutor,
    },
    {
      testName: 'Update status',
      testData: (data) => data.tasks.existing,
      updatedTestData: (data) => data.tasks.updatedStatus,
      getPayloadData: (data, fixture) => ({ ...fixture.tasks.existing, statusId: data.statusId }),
      expectedData: (data) => data.tasks.updatedStatus,
    },
    {
      testName: 'Update all data',
      testData: (data) => data.tasks.existing,
      updatedTestData: (data) => data.tasks.updated,
      getPayloadData: (data) => data,
      expectedData: (data) => data.tasks.updated,
    },
    {
      testName: 'CreatorId could not be updated',
      testData: (data) => data.tasks.existing,
      updatedTestData: (data) => data.tasks.new,
      getPayloadData: (data, fixture) => ({
        ...fixture.tasks.existing,
        creatorId: data.creatorId,
      }),
      expectedData: (data) => data.tasks.existing,
    },
  ];

  describe('Task patch tests', () => {
    test.each(
      patchTaskTemplate.map(
        ({
          testName,
          testData: initialData,
          updatedTestData,
          getPayloadData,
          expectedData,
        }) => [
          testName,
          initialData,
          updatedTestData,
          getPayloadData,
          expectedData,
        ],
      ),
    )('%s', async (_, initialData, updatedTestData, getPayloadData, expectedData) => {
      const { id } = await models.task.query().findOne({ name: initialData(testData).name });
      const response = await app.inject({
        method: 'PATCH',
        url: app.reverse('updateTask', { id }),
        cookies: cookie,
        payload: {
          data: getPayloadData(updatedTestData(testData), testData),
        },
      });

      expect(response.statusCode).toBe(302);

      const updatedTask = await models.task.query().findById(id);
      expect(updatedTask).toMatchObject(expectedData(testData));
    });
  });

  it('User cannot delete task if he is not an owner', async () => {
    const anotherUserTaskFixture = testData.tasks.another;
    const anotherUserTask = await models.task.query()
      .findOne({ name: anotherUserTaskFixture.name });
    const { id } = anotherUserTask;
    const response = await app.inject({
      method: 'DELETE',
      url: app.reverse('deleteTask', { id }),
      cookies: cookie,
    });

    expect(response.statusCode).toBe(302);

    const unchangedTask = await models.task.query().findById(id);
    expect(anotherUserTask).toMatchObject(unchangedTask);
  });

  it('User can delete task', async () => {
    const existingTask = testData.tasks.existing;
    const { id } = await models.task.query().findOne({ name: existingTask.name });

    const response = await app.inject({
      method: 'DELETE',
      url: app.reverse('deleteTask', { id }),
      cookies: cookie,
    });

    expect(response.statusCode).toBe(302);

    const deletedTask = await models.task.query().findById(id);
    expect(deletedTask).toBeUndefined();
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
