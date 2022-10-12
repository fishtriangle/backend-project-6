// @ts-check

import _ from 'lodash';
import BaseModel from './BaseModel.cjs';
// eslint-disable-next-line import/no-cycle
import User from './User.js';
// eslint-disable-next-line import/no-cycle
import Status from './Status.js';
// eslint-disable-next-line import/no-cycle
import Label from './Label.js';

export default class Task extends BaseModel {
  $parseJson(json, options) {
    const parsed = super.$parseJson(json, options);
    return {
      ...parsed,
      ...(parsed.name && { name: _.trim(parsed.name) }),
      ...(parsed.description && { description: _.trim(parsed.description) }),
    };
  }

  static get tableName() {
    return 'tasks';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'creatorId', 'statusId'],

      properties: {
        id: { type: 'integer' },
        name: { type: 'string', minLength: 1 },
        description: { type: 'string' },
        creatorId: { type: 'integer' },
        statusId: { type: 'integer' },
        executorId: { type: 'integer' },
      },
    };
  }

  static get relationMappings() {
    return {
      creator: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'tasks.creatorId',
          to: 'users.id',
        },
      },
      executor: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'tasks.executorId',
          to: 'users.id',
        },
      },
      status: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: Status,
        join: {
          from: 'tasks.statusId',
          to: 'statuses.id',
        },
      },
      labels: {
        relation: BaseModel.ManyToManyRelation,
        modelClass: Label,
        join: {
          from: 'tasks.id',
          through: {
            from: 'tasks_labels.taskId',
            to: 'tasks_labels.labelId',
          },
          to: 'labels.id',
        },
      },
    };
  }

  static modifiers = {
    filterCreator(query, id) {
      query.where('creatorId', id);
    },

    filterExecutor(query, id) {
      query.where('executorId', id);
    },

    filterStatus(query, id) {
      query.where('statusId', id);
    },

    filterLabel(query, id) {
      query.where('labels.id', id);
    },
  };
}
