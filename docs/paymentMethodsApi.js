/**
 * @api {get} /api/v1/payment_methods Получение методов оплаты
 * @apiName getPaymentMethods
 * @apiGroup PaymentMethodsApi
 * @apiVersion 0.1.0
 * @apiSuccess {Array} methods
 */

/**
 * @api {post} /api/v1/payment_methods Создание метода оплаты
 * @apiName createPaymentMethod
 * @apiGroup PaymentMethodsApi
 * @apiVersion 0.1.0
 * @apiParam {String} [name="Default gateway"]
 * @apiParam {Object} [gateway=empty_object]
 * @apiParam {Boolean} [online_payment=false] 
 * @apiSuccess {Object} method
 */

/**
 * @api {get} /api/v1/payment_methods/:id Получение метода оплаты по id
 * @apiName getPaymentMethodById
 * @apiGroup PaymentMethodsApi
 * @apiVersion 0.1.0
 * @apiSuccess {Object} method
 */

/**
 * @api {put} /api/v1/payment_methods/:id Обновление метода оплаты
 * @apiName updatePaymentMethod
 * @apiGroup PaymentMethodsApi
 * @apiVersion 0.1.0
 * @apiParam {String} [name="Default gateway"]
 * @apiParam {Object} [gateway=empty_object]
 * @apiParam {Boolean} [online_payment=false] 
 * @apiSuccess {Object} method
 */

/**
 * @api {delete} /api/v1/payment_methods/:id Удаление метода оплаты по id
 * @apiName deletePaymentMethod
 * @apiGroup PaymentMethodsApi
 * @apiVersion 0.1.0
 * @apiSuccess {Object} status
 */