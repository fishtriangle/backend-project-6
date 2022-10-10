// @ts-check

// import Rollbar from 'rollbar';
//
// const rollbar = new Rollbar({
//   accessToken: process.env.ROLLBAR_TOKEN,
//   captureUncaught: true,
//   captureUnhandledRejections: true,
// });

export default (app) => {
  app
    .get('/', { name: 'root' }, (req, reply) => {
      // rollbar.log('Hello world!');
      reply.render('welcome/index');
    })
    .get('/protected', { name: 'protected', preValidation: app.authenticate }, (req, reply) => {
      reply.render('welcome/index');
    });
};
