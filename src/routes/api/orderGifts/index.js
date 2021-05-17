import Router from 'koa-router';
import koaBody from 'koa-body';
import api from '../../../services/api';
import utils from '../../../libs/utils';
import security from '../../../libs/security';

const orderGiftsRouter = new Router({ prefix: '/v1/order_gifts' });

orderGiftsRouter.get(
  '/',
  security.checkUserScope.bind(this, security.scope.READ_ORDER_GIFTS),
  async ctx => {
    ctx.body = await api.orderGifts.getList();
  },
);

orderGiftsRouter.post(
  '/',
  security.checkUserScope.bind(this, security.scope.WRITE_ORDER_GIFTS),
  async ctx => {
    ctx.body = await api.orderGifts.create(ctx.request.body);
  },
);

orderGiftsRouter.get(
  '/:id',
  security.checkUserScope.bind(this, security.scope.READ_ORDER_GIFTS),
  async ctx => {
    ctx.body = await api.orderGifts.getById(utils.getIdByUrl(ctx.url, 1));
  },
);

orderGiftsRouter.put(
  '/:id',
  security.checkUserScope.bind(this, security.scope.WRITE_ORDER_GIFTS),
  async ctx => {
    ctx.body = await api.orderGifts.updateObject(utils.getIdByUrl(ctx.url, 1), ctx.request.body);
  },
);

orderGiftsRouter.delete(
  '/:id',
  security.checkUserScope.bind(this, security.scope.WRITE_ORDER_GIFTS),
  async ctx => {
    ctx.body = await api.orderGifts.deleteObject(utils.getIdByUrl(ctx.url, 1));
  },
);

orderGiftsRouter.post(
  '/:id/image',
  security.checkUserScope.bind(this, security.scope.WRITE_ORDER_GIFTS),
  koaBody({
    formidable: {
      uploadDir: './upload',
      keepExtensions: true,
      multiples: true,
    },
    multipart: true,
    urlencoded: true,
    formLimit: '100mb',
  }),
  async ctx => {
    ctx.body = await api.orderGifts.uploadImage(
      utils.getIdByUrl(ctx.url, 2),
      ctx.request.files.file,
    );
  },
);

orderGiftsRouter.delete(
  '/:id/image',
  security.checkUserScope.bind(this, security.scope.WRITE_ORDER_GIFTS),
  async ctx => {
    ctx.body = await api.orderGifts.deleteImage(utils.getIdByUrl(ctx.url, 2));
  },
);

export default orderGiftsRouter;
