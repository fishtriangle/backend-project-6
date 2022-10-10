// @ts-check

import i18next from 'i18next';
import { ValidationError } from 'objection';

export default (app) => {
  app
    .get('/labels', { name: 'labels', preValidation: app.authenticate }, async (req, reply) => {
      const labels = await app.objection.models.label.query();
      reply.render('labels/index', { labels });
      return reply;
    })
    .get('/labels/new', { name: 'newLabel', preValidation: app.authenticate }, (req, reply) => {
      const label = new app.objection.models.label();
      reply.render('labels/new', { label });
    })
    .post(
      '/labels',
      { name: 'createLabel', preValidation: app.authenticate },
      async (req, reply) => {
        try {
          const label = await app.objection.models.label.fromJson(req.body.data);
          await app.objection.models.label.query().insert(label);
          req.flash('info', i18next.t('flash.labels.create.success'));
          reply.redirect(app.reverse('labels'));
          return reply;
        } catch (error) {
          if (error instanceof ValidationError) {
            req.flash('error', i18next.t('flash.labels.create.error'));
            const label = (new app.objection.models.label()).$set(req.body.data);
            reply.render('/labels/new', { label, errors: error.data });
            return reply.code(422);
          }
          throw error;
        }
      },
    )
    .get(
      '/labels/:id/edit',
      { name: 'editLabel', preValidation: app.authenticate },
      async (req, reply) => {
        const label = await app.objection.models.label.query().findById(req.params.id);
        reply.render('labels/edit', { label });
        return reply;
      },
    )
    .patch(
      '/labels/:id',
      { name: 'updateLabel', preValidation: app.authenticate },
      async (req, reply) => {
        try {
          const label = await app.objection.models.label.query().findById(req.params.id);
          await label.$query().patch(req.body.data);
          req.flash('success', i18next.t('flash.labels.edit.success'));
          reply.redirect('/labels');
          return reply;
        } catch (error) {
          if (error instanceof ValidationError) {
            req.flash('error', i18next.t('flash.labels.edit.error'));
            const label = (new app.objection.models.label())
              .$set({ ...req.body.data, id: req.params.id });
            reply.render('labels/edit', {
              label,
              errors: error.data,
            });
            return reply.code(422);
          }
          throw error;
        }
      },
    )
    .delete(
      '/labels/:id',
      { name: 'deleteLabel', preValidation: app.authenticate },
      async (req, reply) => {
        const label = await app.objection.models.label.query().findById(req.params.id);
        const tasks = await label.$relatedQuery('tasks');
        if (tasks.length !== 0) {
          req.flash('error', i18next.t('flash.labels.delete.error'));
        } else {
          await label.$query().delete();
          req.flash('info', i18next.t('flash.labels.delete.success'));
        }
        reply.redirect(app.reverse('labels'));
        return reply;
      },
    );
};
