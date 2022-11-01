// @ts-check

const BaseModel = require('./BaseModel.cjs');

module.exports = class Task extends BaseModel {
  $parseJson(json, options) {
    const parsed = super.$parseJson(json, options);
    return {
      ...parsed,
      name: parsed.name?.trim(),
      description: parsed.description?.trim(),
      executorId: Number(parsed.executorId),
      statusId: Number(parsed.statusId),
    };
  }

  static get tableName() {
    return 'tasks';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'creatorId', 'executorId'],

      properties: {
        id: { type: 'integer' },
        name: { type: 'string', minLength: 1 },
        description: { type: 'string' },
        creatorId: { type: 'integer', minimum: 1 },
        statusId: { type: 'integer' },
        executorId: { type: 'integer', minimum: 1 },
      },
    };
  }

  static get relationMappings() {
    return {
      creator: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: 'User.cjs',
        join: {
          from: 'tasks.creatorId',
          to: 'users.id',
        },
      },
      executor: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: 'User.cjs',
        join: {
          from: 'tasks.executorId',
          to: 'users.id',
        },
      },
      status: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: 'Status.cjs',
        join: {
          from: 'tasks.statusId',
          to: 'statuses.id',
        },
      },
      labels: {
        relation: BaseModel.ManyToManyRelation,
        modelClass: 'Label.cjs',
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
