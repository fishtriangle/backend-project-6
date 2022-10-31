// @ts-check

import { faker } from '@faker-js/faker';
import encrypt from '../../server/lib/secure.cjs';

function createRandomUser() {
  return {
    email: faker.helpers.unique(faker.internet.email),
    password: faker.internet.password(15, false, /[a-zA-Z]|\d/),
  };
}

function createRandomStatus() {
  return {
    name: `${faker.hacker.ingverb()}-${faker.helpers.unique(faker.datatype.number)}`,
  };
}

function createRandomTask(statusId, creatorId, executorId) {
  return {
    name: `${faker.word.interjection()}-${faker.helpers.unique(faker.datatype.number)}`,
    description: faker.lorem.paragraph(),
    statusId,
    creatorId,
    executorId,
  };
}

function createRandomLabel() {
  return {
    name: `${faker.hacker.abbreviation()}-${faker.helpers.unique(faker.datatype.number)}`,
  };
}

// export const getTestData = () => getFixtureData('testData.json');
export const getTestData = async (app, testModel) => {
  const users = {
    new: createRandomUser(),
    existing: createRandomUser(),
    empty: {
      email: '',
      password: '',
    },
    updated: createRandomUser(),
    other: createRandomUser(),
    relatedNewExecutor: {
      ...createRandomUser(),
      id: 1,
    },
    relatedNewCreator: {
      ...createRandomUser(),
      id: 4,
    },
    existingWithoutTasks: createRandomUser(),
  };

  const statuses = {
    new: createRandomStatus(),
    updated: createRandomStatus(),
    existing: createRandomStatus(),
    relatedNew: {
      ...createRandomStatus(),
      // id: 2,
    },
  };
  let tasks = {
    new: createRandomTask(1, 5, 1),
    existing: {
      ...createRandomTask(2, 5, 1),
      // id: 1,
    },
    updated: createRandomTask(1, 5, 2),
    newTaskData: {
      ...createRandomTask(2, 5, 1),
      // labels: [12],
    },
    another: createRandomTask(),
  };

  tasks = {
    ...tasks,
    updatedName: {
      ...tasks.existing,
      name: faker.word.adjective(),
    },
    updatedExecutor: {
      ...tasks.existing,
      executorId: 2,
    },
    updatedStatus: {
      ...tasks.existing,
      statusId: 1,
    },
    updatedCreator: {
      ...tasks.existing,
      creatorId: 2,
    },
    updatedLabels: {
      ...tasks.existing,
      // labels: [13, 11],
    },
    existingWithLabel: {
      ...tasks.existing,
      // labels: [13],
    },
  };

  const labels = {
    new: createRandomLabel(),
    existing: createRandomLabel(),
    updated: createRandomLabel(),
    relatedNew: {
      ...createRandomLabel(),
    },
    relatedAdd: [11, 12],
    relatedRemove: [12],
    relatedRemovedLabel: {
      id: 11,
    },
  };

  const fixtures = {
    users,
    statuses,
    tasks,
    labels,
  };

  const { knex } = app.objection;

  const usersList = Object.values(fixtures.users)
    .filter(({ email }) => (
      (email === fixtures.users.existing.email)
      || (email === fixtures.users.other.email)
      || (email === fixtures.users.existingWithoutTasks.email)
    ))
    .map(({ id, email, password }) => ({ id, email, passwordDigest: encrypt(password) }));

  await knex('users').insert(usersList);

  const statusList = Object.values(fixtures.statuses)
    .filter(({ name }) => (
      (name === fixtures.statuses.existing.name) || (name === fixtures.statuses.relatedNew.name)
    ));

  await knex('statuses').insert(statusList);

  const tasksList = Object.values(fixtures.tasks)
    .filter(({ name }) => (
      (name === fixtures.tasks.existing.name) || (name === fixtures.tasks.another.name)
    ));

  if (testModel !== 'User') {
    await knex('tasks').insert(tasksList);
  }

  const labelsList = Object.values(fixtures.labels)
    .filter(({ name }) => (
      (name === fixtures.labels.existing.name) || (name === fixtures.labels.relatedNew.name)
    ));
  await knex('labels').insert(labelsList);

  return fixtures;
};

export const prepareData = async (app) => {
  const { knex } = app.objection;

  const usersList = [];
  const statusesList = [];
  const tasksList = [];
  const labelsList = [];
  const tasksLabelsList = [{
    task_id: 1,
    label_id: 17,
  }];

  Array.from({ length: 4 }).forEach((_, index) => {
    const generatedUser = createRandomUser();
    const generatedStatus = createRandomStatus();
    const generatedTask = createRandomTask(
      faker.datatype.number({ min: 1, max: 2 }),
      faker.datatype.number({ min: 1, max: 4 }),
      faker.datatype.number({ min: 1, max: 4 }),
    );
    const generatedLabel = createRandomLabel();
    generatedLabel.id = 10 + index;
    generatedUser.passwordDigest = encrypt(generatedUser.password);
    delete generatedUser.password;
    usersList.push(generatedUser);
    statusesList.push(generatedStatus);
    tasksList.push(generatedTask);
    labelsList.push(generatedLabel);
  });

  await knex('users').insert(usersList);

  await knex('statuses').insert(statusesList);

  await knex('tasks').insert(tasksList);

  await knex('labels').insert(labelsList);

  await knex('tasks_labels').insert(tasksLabelsList);
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
