import Router from 'koa-router';
import apiRouter from './api';
import clientRouter from './client';

const router = new Router();

router
  .use(apiRouter.routes())
  .use(apiRouter.allowedMethods())
  .use(clientRouter.routes())
  .use(clientRouter.allowedMethods());

export default router;
