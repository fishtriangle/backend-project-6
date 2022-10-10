// @ts-check

import i18next from 'i18next';
import { ValidationError } from 'objection';

export default (app) => {
  app
    .get('/users', { name: 'users' }, async (req, reply) => {
      const users = await app.objection.models.user.query();
      reply.render('users/index', { users });
      return reply;
    })
    .get('/users/new', { name: 'newUser' }, (req, reply) => {
      const user = new app.objection.models.user();
      reply.render('users/new', { user });
    })
    .get(
      '/users/:id/edit',
      {
        name: 'editUser',
        preValidation: app.auth([app.checkUserPermission, app.authenticate]),
      },
      async (req, reply) => {
        // console.log('GET by id: ', req.params.id);
        const user = await app.objection.models.user.query().findById(req.params.id);
        // console.log('GET by id user: ', user);
        reply.render('users/edit', { user });
        return reply;
      },
    )
    .post('/users', { name: 'createUser' }, async (req, reply) => {
      const user = req.body.data;
      try {
        const validUser = await app.objection.models.user.fromJson(user);
        await app.objection.models.user.query().insert(validUser);
        req.flash('info', i18next.t('flash.users.create.success'));
        reply.redirect(app.reverse('root'));
      } catch (error) {
        if (error instanceof ValidationError) {
          console.log(error);
          req.flash('error', i18next.t('flash.users.create.error'));
          reply.render('users/new', { user, errors: error.data });
          return reply.code(422);
        }
        console.error(error);
      }
      return reply;
    })
    .patch(
      '/users/:id',
      {
        name: 'updateUser',
        // preValidation: app.auth([app.checkUserPermission, app.authenticate]),
      },
      async (req, reply) => {
        try {
          const {
            body: { data },
          } = req;
          // console.log('1');
          const user = await app.objection.models.user.query().findById(req.params.id);
          // console.log('2', patchData);
          // console.log(await app.objection.models.user.query());
          await user.$query().patch(data);
          // console.log('3');
          req.flash('success', i18next.t('flash.users.edit.success'));
          reply.redirect(app.reverse('users'));
          return reply;
        } catch (error) {
          if (error instanceof ValidationError) {
            // console.log(error.data);
            req.flash('error', i18next.t('flash.users.edit.error'));
            const user = new app.objection.models.user();
            user.$set({ ...req.body.data, id: req.params.id });
            reply.render('users/edit', {
              user,
              errors: error.data,
            });
            console.log('Validation failed');
            return reply.code(422);
          }
          throw error;
        }
      },
    )
    .delete(
      '/users/:id',
      {
        name: 'deleteUser',
        preValidation: app.auth([app.checkUserPermission, app.authenticate]),
      },
      async (req, reply) => {
        console.log('1');
        const user = await app.objection.models.user.query().findById(req.params.id);
        console.log('2', user);
        const usersTasks = await user.$relatedQuery('tasks');
        console.log('3');
        if (usersTasks.length !== 0) {
          req.flash('error', i18next.t('flash.users.delete.error'));
        } else {
          await user.$query().delete();
          req.logOut();
          req.flash('info', i18next.t('flash.users.delete.success'));
        }
        console.log('4');
        reply.redirect('/users');
        return reply;
      },
    );
};
