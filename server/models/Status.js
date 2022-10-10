// @ts-check

import objectionUnique from 'objection-unique';
import _ from 'lodash';
import BaseModel from './BaseModel.cjs';
// eslint-disable-next-line import/no-cycle
import Task from './Task.js';

const unique = objectionUnique({ fields: ['name'] });
export default class Status extends unique(BaseModel) {
  $parseJson(json, options) {
    const parsed = super.$parseJson(json, options);
    return {
      ...parsed,
      ...(parsed.name && { name: _.trim(parsed.name) }),
    };
  }

  static get tableName() {
    return 'statuses';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name'],

      properties: {
        id: { type: 'integer' },
        name: { type: 'string', minLength: 1 },
      },
    };
  }

  static get relationMappings() {
    return {
      tasks: {
        relation: BaseModel.HasManyRelation,
        modelClass: Task,
        join: {
          from: 'statuses.id',
          to: 'tasks.statusId',
        },
      },
    };
  }
}
