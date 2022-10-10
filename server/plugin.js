// @ts-check
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fastifyStatic from 'fastify-static';
import fastifyErrorPage from 'fastify-error-page';
import fastifyAuth from 'fastify-auth';
import pointOfView from 'point-of-view';
import fastifyFormbody from 'fastify-formbody';
import fastifySecureSession from 'fastify-secure-session';
import fastifyPassport from 'fastify-passport';
import fastifySensible from 'fastify-sensible';
import { plugin as fastifyReverseRoutes } from 'fastify-reverse-routes';
import fastifyMethodOverride from 'fastify-method-override';
import fastifyObjectionjs from 'fastify-objectionjs';
import qs from 'qs';
import Pug from 'pug';
import i18next from 'i18next';
import ru from './locales/ru.js';
// @ts-ignore

import addRoutes from './routes/index.js';
import getHelpers from './helpers/index.js';
import * as knexConfig from '../knexfile.js';
import models from './models/index.js';
import FormStrategy from './lib/passportStrategies/FormStrategy.js';
import webpackConfig from '../webpack.config.js';

dotenv.config();

const __dirname = fileURLToPath(path.dirname(import.meta.url));

const mode = process.env.NODE_ENV || 'development';
const isDevelopment = mode === 'development';
const isProduction = mode === 'production';

const setUpViews = (app) => {
  const helpers = getHelpers(app);
  app.register(pointOfView, {
    engine: {
      pug: Pug,
    },
    includeViewExtension: true,
    defaultContext: {
      ...helpers,
      assetPath: (filename) => `/assets/${filename}`,
    },
    templates: path.join(__dirname, '..', 'server', 'views'),
  });

  app.decorateReply('render', function render(viewPath, locals) {
    this.view(viewPath, { ...locals, reply: this });
  });
};

const setUpStaticAssets = (app) => {
  const pathPublic = isProduction
    ? path.join(__dirname, '..', 'public')
    : path.join(__dirname, '..', 'dist', 'public');
  app.register(fastifyStatic, {
    root: pathPublic,
    prefix: '/assets/',
  });
};

const setupLocalization = async () => {
  await i18next
    .init({
      lng: 'ru',
      fallbackLng: 'en',
      debug: isDevelopment,
      resources: {
        ru,
      },
    });
};

const addHooks = (app) => {
  app.addHook('preHandler', async (req, reply) => {
    reply.locals = {
      isAuthenticated: () => req.isAuthenticated(),
    };
  });
};

const addErrorHadlers = (app) => {
  app.setErrorHandler((error, request, reply) => {
    const isUnhandledInternalError = reply.raw.statusCode === 500
      && error.explicitInternalServerError !== true;
    const errorMessage = isUnhandledInternalError ? 'Something went wrong!!!' : error.message;
    request.log.error(error);

    request.flash('error', errorMessage);
    reply.redirect('/');
  });
};

const registerPlugins = (app) => {
  app.register(fastifyAuth);
  app.register(fastifySensible);
  if (isDevelopment) app.register(fastifyErrorPage);
  app.register(fastifyReverseRoutes);
  app.register(fastifyFormbody, { parser: qs.parse });
  app.register(fastifySecureSession, {
    secret: process.env.SESSION_KEY,
    cookie: {
      path: '/',
    },
  });

  fastifyPassport.registerUserDeserializer(
    (user) => {
      // console.log('HERE?', user);
      const validUser = app.objection.models.user.query().findOne({ email: user.email });
      // console.log('HERE?', validUser);
      return validUser;
    },
  );
  fastifyPassport.registerUserSerializer((user) => Promise.resolve(user));
  fastifyPassport.use(new FormStrategy('form', app));
  app.register(fastifyPassport.initialize());
  app.register(fastifyPassport.secureSession());
  app.decorate('fp', fastifyPassport);
  app.decorate('authenticate', (...args) => fastifyPassport.authenticate(
    'form',
    {
      failureRedirect: app.reverse('root'),
      failureFlash: i18next.t('flash.authError'),
    },
  // @ts-ignore
  )(...args));

  app.register(fastifyMethodOverride);
  app.register(fastifyObjectionjs, {
    knexConfig: knexConfig[mode],
    models,
  });
  app.decorate('checkUserPermission', async (request, reply) => {
    console.log('checkUserPermission');
    console.log(request.user.id, request.params.id);
    if (request.user?.id !== parseInt(request.params.id, 10)) {
      console.log('error checkUserPermission');
      request.flash('error', i18next.t('flash.users.authError'));
      reply.redirect('/users');
    }
  });

  app.decorate('checkIfUserCreatedTask', async (request, reply) => {
    const { creatorId } = await app.objection.models.task.query().findById(request.params.id);
    if (request.user.id !== creatorId) {
      request.flash('error', i18next.t('flash.tasks.authError'));
      reply.redirect('/tasks');
    }
  });
};

// eslint-disable-next-line no-unused-vars
export default async (app, options) => {
  // console.log('11');
  registerPlugins(app);
  // console.log('12');
  await setupLocalization();
  // console.log('13');
  setUpViews(app);
  // console.log('14');
  setUpStaticAssets(app);
  // console.log('15');
  app.after(() => {
    addRoutes(app);
  });
  // console.log('16');
  addHooks(app);
  // console.log('17');
  return app;
};

export const options = {
  port: process.env.PORT || 3000,
};
