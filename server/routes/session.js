// @ts-check
import i18next from 'i18next';

export default (app) => {
  app
    .get('/session/new', { name: 'newSession' }, (req, reply) => {
      const signInForm = new app.objection.models.user();
      reply.render('session/new', { signInForm });
    })
    .post('/session', { name: 'session' }, app.fp.authenticate('form', async (req, reply, err) => {
      console.log(req.body?.data);
      if (err) {
        return app.httpErrors.internalServerError(err);
      }
      const user = req.body?.data;
      if (!user) {
        const signInForm = new app.objection.models.user().$set(req.body.data);
        const errors = {
          email: [{ message: i18next.t('flash.session.create.error') }],
        };

        return reply.render('session/new', { signInForm, errors });
      }
      await req.logIn(user);
      req.flash('success', i18next.t('flash.session.create.success'));
      return reply.redirect(app.reverse('root'));
    }))
    .delete('/session', { name: 'deleteSession' }, (req, reply) => {
      req.logOut();
      req.flash('info', i18next.t('flash.session.delete.success'));
      reply.redirect(app.reverse('root'));
    });
};
