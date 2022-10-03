// @ts-check

import objectionUnique from 'objection-unique';
// import path from 'path';
import _ from 'lodash';

import BaseModel from './BaseModel.cjs';

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
        id: { type: 'string' },
        name: { type: 'string', minLength: 1 },
      },
    };
  }

  // static get relationMappings() {
  //   return {
  //     // tasks: {
  //     //   relation: BaseModel.HasManyRelation,
  //     //   modelClass: path.join(__dirname, 'Task'),
  //     //   join: {
  //     //     from: 'statuses.id',
  //     //     to: 'tasks.statusId',
  //     //   },
  //     },
  //   };
  // }
}
