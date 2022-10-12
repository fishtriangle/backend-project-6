// @ts-check
import i18next from 'i18next';
import { ValidationError } from 'objection';

export default (app) => {
  app
    .get('/session/new', { name: 'newSession' }, (req, reply) => {
      const signInForm = new app.objection.models.user();
      reply.render('session/new', { signInForm });
    })
    .post('/session', { name: 'session' }, app.fp.authenticate('form', async (req, reply, err) => {
      if (err) {
        reply.code(422);
        return reply.render('session/new');
      }
      const user = req.body?.data;
      try {
        const validUser = await app.objection.models.user.fromJson(user);
        await req.logIn(validUser);
        req.flash('success', i18next.t('flash.session.create.success'));
        return reply.redirect(app.reverse('root'));
      } catch (error) {
        if (error instanceof ValidationError) {
          // req.flash('error', i18next.t('flash.users.create.error'));
          const signInForm = new app.objection.models.user().$set(req.body.data);
          const errors = {
            email: [{ message: i18next.t('flash.session.create.error') }],
          };
          reply.render('session/new', { signInForm, errors });
          return reply.code(422);
        }
        console.error(error);
        return reply.code(422);
      }
    }))
    .delete('/session', { name: 'deleteSession' }, (req, reply) => {
      req.logOut();
      req.flash('info', i18next.t('flash.session.delete.success'));
      reply.redirect(app.reverse('root'));
    });
};
