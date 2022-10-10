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

      console.log('QUERY: ', query);

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

      // console.log('2');
      const [tasks, users, statuses, labels] = await Promise.all([
        tasksQuery,
        app.objection.models.user.query(),
        app.objection.models.status.query(),
        app.objection.models.label.query(),
      ]);
      // console.log('3');
      const task = new app.objection.models.task();
      // console.log(
      //   'TASK: ',
      //   task,
      //   '\n',
      //   'USERS: ',
      //   users,
      //   // '\n',
      //   // 'STATUSES: ',
      //   // statuses,
      //   // '\n',
      //   // 'LABELS: ',
      //   // labels,
      // );

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
      const task = req.body.data;
      console.log('TASK: ', task);
      const {
        name, description, statusId, responsibleId, labels,
      } = task;

      const labelIds = [labels].flat().map((id) => ({ id: parseInt(id, 10) }));

      try {
        console.log('creatorId', req.user.id);
        const validTask = await app.objection.models.task.fromJson({
          name,
          description,
          responsibleId: parseInt(responsibleId, 10),
          creatorId: req.user.id,
          ...(responsibleId && { responsibleId: parseInt(responsibleId, 10) }),
          ...(statusId && { statusId: parseInt(statusId, 10) }),
        });
        // console.log('1', validTask);
        await app.objection.models.task.transaction(async (trx) => {
          await app.objection.models.task.query(trx)
            .insertGraph([{ ...validTask, labels: labelIds }], {
              relate: ['labels'],
            });
        });
        console.log('2');
        req.flash('info', i18next.t('flash.tasks.create.success'));
        reply.redirect(app.reverse('tasks'));
        return reply;
      } catch (error) {
        if (error instanceof ValidationError) {
          console.log('ERROR: ', error);
          req.flash('error', i18next.t('flash.tasks.create.error'));
          const validTask = new app.objection.models.task().$set(req.body.data);
          const [users, statuses, labelList] = await Promise.all([
            app.objection.models.user.query(),
            app.objection.models.status.query(),
            app.objection.models.label.query(),
          ]);
          reply.render('/tasks/new', {
            validTask,
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
          .withGraphJoined('[creator, executor, status]');
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
              name, description, statusId, responsibleId, labels = [],
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
                ...(responsibleId && { responsibleId: parseInt(responsibleId, 10) }),
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
        console.log('ID', req.params.id)
        const task = await app.objection.models.task.query().findById(req.params.id);
        console.log('TASK: ', task);
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
