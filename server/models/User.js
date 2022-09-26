// @ts-check
import _ from 'lodash';
import objectionUnique from 'objection-unique';
import BaseModel from './BaseModel.cjs';
import encrypt from '../lib/secure.cjs';

const unique = objectionUnique({ fields: ['email'] });

export default class User extends unique(BaseModel) {
  $parseJson(json, options) {
    const parsed = super.$parseJson(json, options);
    return {
      ...parsed,
      ...(parsed.firstName && { name: _.trim(parsed.firstName) }),
      ...(parsed.lastName && { name: _.trim(parsed.lastName) }),
      ...(parsed.email && { name: _.trim(parsed.email) }),
      ...(parsed.password && { name: _.trim(parsed.password) }),
    };
  }

  static get tableName() {
    return 'users';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['email', 'password', 'id'],
      properties: {
        id: { type: 'string' },
        email: { type: 'string', minLength: 1 },
        password: { type: 'string', minLength: 3 },
        firstName: { type: 'string', minLength: 1 },
        lastName: { type: 'string', minLength: 1 },
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
