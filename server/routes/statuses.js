// @ts-check

import i18next from 'i18next';
import { ValidationError } from 'objection';

export default (app) => {
  app
    .get('/statuses', { name: 'statuses', preValidation: app.authenticate }, async (req, reply) => {
      const statuses = await app.objection.models.status.query();
      reply.render('statuses/index', { statuses });
      return reply;
    })
    .get(
      '/statuses/new',
      { name: 'getStatusPage', preValidation: app.authenticate },
      (req, reply) => {
        const status = new app.objection.models.status();
        reply.render('statuses/new', { status });
      },
    )
    .get(
      '/statuses/:id/edit',
      { name: 'editStatus', preValidation: app.authenticate },
      async (req, reply) => {
        const status = await app.objection.models.status.query().findById(req.params.id);

        reply.render('statuses/edit', { status });

        return reply;
      },
    )
    .post(
      '/statuses',
      { name: 'createStatus', preValidation: app.authenticate },
      async (req, reply) => {
        const status = req.body.data;
        try {
          const validStatus = await app.objection.models.status.fromJson(status);
          await app.objection.models.status.query().insert(validStatus);
          req.flash('info', i18next.t('flash.statuses.create.success'));
          reply.redirect(app.reverse('statuses'));
        } catch (error) {
          if (error instanceof ValidationError) {
            req.flash('error', i18next.t('flash.statuses.create.error'));
            reply.render('statuses/new', { status, errors: error.data });
            return reply.code(422);
          }
          console.error(error);
        }
        return reply;
      },
    )
    .patch(
      '/statuses/:id',
      { name: 'updateStatus', preValidation: app.authenticate },
      async (req, reply) => {
        try {
          const status = await app.objection.models.status.query().findById(req.params.id);

          await status.$query().patch(req.body.data);

          req.flash('success', i18next.t('flash.statuses.edit.success'));
          reply.redirect(app.reverse('statuses'));
          return reply;
        } catch (error) {
          if (error instanceof ValidationError) {
            req.flash('error', i18next.t('flash.statuses.edit.error'));
            reply.render('statuses/edit', {
              status: { ...req.body.data, id: req.params.id },
              errors: error.data,
            });
            return reply.code(422);
          }
          throw error;
        }
      },
    )
    .delete(
      '/statuses/:id',
      { name: 'deleteStatus', preValidation: app.authenticate },
      async (req, reply) => {
        const status = await app.objection.models.status.query().findById(req.params.id);
        const statusTasks = await status.$relatedQuery('tasks');
        if (statusTasks.length !== 0) {
          req.flash('error', i18next.t('flash.statuses.delete.error'));
        } else {
          await status.$query().delete();
          req.flash('info', i18next.t('flash.statuses.delete.success'));
        }
        reply.redirect(app.reverse('statuses'));
        return reply;
      },
    );
};
