/**
 * @api {get} /api/v1/shipping_methods Получение методов доставки
 * @apiName getShippingMethods
 * @apiGroup ShippingMethodsApi
 * @apiVersion 0.1.0
 * @apiSuccess {Array} methods
 */

/**
 * @api {post} /api/v1/shipping_methods Создание метода доставки
 * @apiName createShippingMethod
 * @apiGroup ShippingMethodsApi
 * @apiVersion 0.1.0
 * @apiParam {String} name
 * @apiParam {String} [description='Пустая строка']
 * @apiParam {Number} [position=0]
 * @apiParam {Bollean} [enabled=false]
 * @apiParam {Number} [price=0]
 * @apiSuccess {Object} method
 */

/**
 * @api {get} /api/v1/shipping_methods/:id Получение метода доставки по id
 * @apiName getShippingMethodById
 * @apiGroup ShippingMethodsApi
 * @apiVersion 0.1.0
 * @apiSuccess {Object} method
 */

/**
 * @api {put} /api/v1/shipping_methods/:id Обновление метода доставки
 * @apiName updateShippingMethod
 * @apiGroup ShippingMethodsApi
 * @apiVersion 0.1.0
 * @apiParam {String} name
 * @apiParam {String} [description='Пустая строка']
 * @apiParam {Number} [position=0]
 * @apiParam {Bollean} [enabled=false]
 * @apiParam {Number} [price=0]
 * @apiSuccess {Object} method
 */

/**
 * @api {delete} /api/v1/shipping_methods/:id Удаление метода доставки по id
 * @apiName deleteShippingMethod
 * @apiGroup ShippingMethodsApi
 * @apiVersion 0.1.0
 * @apiSuccess {Object} status
 */