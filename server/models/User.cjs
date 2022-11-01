// @ts-check

const objectionUnique = require('objection-unique');
const BaseModel = require('./BaseModel.cjs');
const encrypt = require('../lib/secure.cjs');

const unique = objectionUnique({ fields: ['email'] });

module.exports = class User extends unique(BaseModel) {
  $parseJson(json, options) {
    const parsed = super.$parseJson(json, options);
    return {
      ...parsed,
      firstName: parsed.firstName?.trim(),
      lastName: parsed.lastName?.trim(),
      email: parsed.email?.trim(),
      password: parsed.password?.trim(),
    };
  }

  static get tableName() {
    return 'users';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        id: { type: 'integer' },
        email: { type: 'string', minLength: 1 },
        password: { type: 'string', minLength: 3 },
        firstName: { type: 'string', minLength: 1 },
        lastName: { type: 'string', minLength: 1 },
      },
    };
  }

  static get relationMappings() {
    return {
      tasks: {
        relation: BaseModel.HasManyRelation,
        modelClass: 'Task.cjs',
        join: {
          from: 'users.id',
          to: 'tasks.creatorId',
        },
      },
    };
  }

  set password(value) {
    this.passwordDigest = encrypt(value);
  }

  verifyPassword(password) {
    return encrypt(password) === this.passwordDigest;
  }

  get name() {
    return `${this.firstName} ${this.lastName}`;
  }
}
