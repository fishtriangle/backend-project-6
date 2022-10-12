// @ts-check

import i18next from 'i18next';
import { ValidationError } from 'objection';

export default (app) => {
  app
    .get('/tasks', { name: 'tasks', preValidation: app.authenticate }, async (req, reply) => {
      const {
        query,
        user: { id },
      } = req;

      const tasksQuery = app.objection.models.task
        .query()
        .withGraphJoined('[creator, executor, status, labels]');

      if (query.executor) {
        tasksQuery.modify('filterExecutor', query.executor);
      }

      if (query.status) {
        tasksQuery.modify('filterStatus', query.status);
      }

      if (query.label) {
        tasksQuery.modify('filterLabel', query.label);
      }

      if (query.isCreatorUser) {
        tasksQuery.modify('filterCreator', id);
      }

      const [tasks, users, statuses, labels] = await Promise.all([
        tasksQuery,
        app.objection.models.user.query(),
        app.objection.models.status.query(),
        app.objection.models.label.query(),
      ]);

      const task = new app.objection.models.task();

      reply.render('tasks/index', {
        task,
        tasks,
        users,
        statuses,
        labels,
        query,
      });
      return reply;
    })
    .get('/tasks/new', { name: 'newTask', preValidation: app.authenticate }, async (req, reply) => {
      const task = new app.objection.models.task();
      const [users, statuses, labels] = await Promise.all([
        app.objection.models.user.query(),
        app.objection.models.status.query(),
        app.objection.models.label.query(),
      ]);
      reply.render('tasks/new', {
        task,
        users,
        statuses,
        labels,
      });
    })
    .post('/tasks', { name: 'createTask', preValidation: app.authenticate }, async (req, reply) => {
      const { data } = req.body;

      const {
        name, description, statusId, executorId, labels,
      } = data;

      const labelIds = [labels].flat().map((id) => ({ id: parseInt(id, 10) }));

      try {
        const task = await app.objection.models.task.fromJson({
          name,
          description,
          executorId: parseInt(executorId, 10),
          creatorId: req.user.id,
          ...(executorId && { executorId: parseInt(executorId, 10) }),
          ...(statusId && { statusId: parseInt(statusId, 10) }),
        });

        await app.objection.models.task.transaction(async (trx) => {
          await app.objection.models.task.query(trx)
            .insertGraph([{ ...task, labels: labelIds }], {
              relate: ['labels'],
            });
        });

        req.flash('info', i18next.t('flash.tasks.create.success'));
        reply.redirect(app.reverse('tasks'));
        return reply;
      } catch (error) {
        if (error instanceof ValidationError) {
          console.log('1');
          req.flash('error', i18next.t('flash.tasks.create.error'));
          const task = new app.objection.models.task().$set(req.body.data);
          const [users, statuses, labelList] = await Promise.all([
            app.objection.models.user.query(),
            app.objection.models.status.query(),
            app.objection.models.label.query(),
          ]);
          console.log(
            task,
            users,
            statuses,
            labelList,
            error.data,
          );
          reply.render('/tasks/new', {
            task,
            users,
            statuses,
            labels: labelList,
            errors: error.data,
          });
          return reply.code(422);
        }
        throw error;
      }
    })
    .get(
      '/tasks/:id',
      { name: 'showTask', preValidation: app.authenticate },
      async (req, reply) => {
        const task = await app.objection.models.task
          .query()
          .findById(req.params.id)
          .withGraphJoined('[creator, executor, status, labels]');
        if (!task) {
          req.flash('error', i18next.t('flash.tasks.showError'));
          reply.redirect(app.reverse('tasks'));
        } else {
          reply.render('tasks/show', { task });
        }
        return reply;
      },
    )
    .get(
      '/tasks/:id/edit',
      { name: 'editTask', preValidation: app.authenticate },
      async (req, reply) => {
        const [task, users, statuses, labels] = await Promise.all([
          app.objection.models.task.query().findById(req.params.id)/* .withGraphJoined('labels') */,
          app.objection.models.user.query(),
          app.objection.models.status.query(),
          app.objection.models.label.query(),
        ]);
        reply.render('tasks/edit', {
          task,
          users,
          statuses,
          labels,
        });
        return reply;
      },
    )
    .patch(
      '/tasks/:id',
      { name: 'updateTask', preValidation: app.authenticate },
      async (req, reply) => {
        const {
          body: {
            data: {
              name, description, statusId, executorId, labels = [],
            },
          },
        } = req;

        const labelIds = [labels].flat().map((id) => ({ id: parseInt(id, 10) }));
        try {
          await app.objection.models.task.transaction(async (trx) => {
            await app.objection.models.task.query(trx).upsertGraph(
              {
                name,
                description,
                labels: labelIds,
                id: parseInt(req.params.id, 10),
                ...(executorId && { executorId: parseInt(executorId, 10) }),
                ...(statusId && { statusId: parseInt(statusId, 10) }),
              },
              {
                relate: true,
                unrelate: true,
              },
            );
          });
          req.flash('success', i18next.t('flash.tasks.edit.success'));
          reply.redirect('/tasks');
          return reply;
        } catch (error) {
          if (error instanceof ValidationError) {
            req.flash('error', i18next.t('flash.tasks.edit.error'));
            const [task, users, statuses, taskLabels] = await Promise.all([
              app.objection.models.task.query().findById(req.params.id).withGraphJoined('labels'),
              app.objection.models.user.query(),
              app.objection.models.status.query(),
              app.objection.models.label.query(),
            ]);
            reply.render('tasks/edit', {
              task,
              users,
              statuses,
              labels: taskLabels,
              errors: error.data,
            });
            return reply.code(422);
          }
          throw error;
        }
      },
    )
    .delete(
      '/tasks/:id',
      {
        name: 'deleteTask',
        preValidation: app.auth([app.checkIfUserCreatedTask, app.authenticate]),
      },
      async (req, reply) => {
        const task = await app.objection.models.task.query().findById(req.params.id);

        await app.objection.models.task.transaction(async (trx) => {
          await task.$relatedQuery('labels', trx).unrelate();
          await task.$query(trx).delete();
        });
        req.flash('info', i18next.t('flash.tasks.delete.success'));
        reply.redirect('/tasks');
        return reply;
      },
    );
};
