import { Types } from 'mongoose';
import bcrypt from 'bcrypt';
import handlebars from 'handlebars';
import logger from 'winston';
import config from '../../../config/index';
import parse from '../../libs/parse';
import models from '../models';
import mailer from '../../libs/mailer';
import PaymentGateways from '../../paymentGateways';
import api from '../api';

const { saltRounds } = config.saltRounds;

const { OrderModel } = models;

class OrdersApi {
  getFilter(params = {}) {
    const filter = {};
    const grandTotalMin = parse.getNumberIfPositive(params.grand_total_min);
    const grandTotalMax = parse.getNumberIfPositive(params.grand_total_max);
    const datePlacedMin = parse.getDateIfValid(params.date_placed_min);
    const datePlacedMax = parse.getDateIfValid(params.date_placed_max);
    const dateClosedMin = parse.getDateIfValid(params.date_closed_min);
    const dateClosedMax = parse.getDateIfValid(params.date_closed_max);
    const datePaidMin = parse.getDateIfValid(params.date_paid_min);
    const datePaidMax = parse.getDateIfValid(params.date_paid_max);

    if (grandTotalMin || grandTotalMax) {
      filter.grand_total = {};
      if (grandTotalMin) {
        filter.grand_total.$gte = grandTotalMin;
        delete params.grand_total_min;
      }
      if (grandTotalMax) {
        filter.grand_total.$lte = grandTotalMax;
        delete params.grand_total_max;
      }
    }

    if (datePlacedMin || datePlacedMax) {
      filter.date_placed = {};
      if (datePlacedMin) {
        filter.date_placed.$gte = datePlacedMin;
        delete params.date_placed_min;
      }
      if (datePlacedMax) {
        filter.date_placed.$lte = datePlacedMax;
        delete params.date_placed_max;
      }
    }

    if (dateClosedMin || dateClosedMax) {
      filter.date_closed = {};
      if (dateClosedMin) {
        filter.date_closed.$gte = dateClosedMin;
        delete params.date_closed_min;
      }
      if (dateClosedMax) {
        filter.date_closed.$lte = dateClosedMax;
        delete params.date_closed_max;
      }
    }

    if (datePaidMin || datePaidMax) {
      filter.date_paid = {};
      if (datePaidMin) {
        filter.date_paid.$gte = datePaidMin;
        delete params.date_paid_min;
      }
      if (datePaidMax) {
        filter.date_paid.$lte = datePaidMax;
        delete params.date_paid_max;
      }
    }
    Object.assign(filter, params);
    delete filter.offset;
    delete filter.limit;
    return filter;
  }

  async getOrders(params = {}) {
    const filter = await this.getFilter(params);
    const limit = parse.getNumberIfPositive(params.limit) || 1000;
    const offset = parse.getNumberIfPositive(params.offset) || 0;
    const orders = await OrderModel.find(filter)
      .sort({ date_placed: 1, date_created: 1 })
      .skip(offset)
      .limit(limit);

    const countOfOrders = await OrderModel.countDocuments(filter);
    const orderStatuses = await api.orderStatuses.getStatuses();
    const ShippingMethods = await api.shippingMethods.getMethods();
    const PaymentMethods = await api.paymentMethods.getMethods();
    const items = orders.map(order =>
      this.changeProperties(order, orderStatuses, ShippingMethods, PaymentMethods),
    );
    const result = {
      total_count: countOfOrders,
      has_more: items.length < countOfOrders, // offset + item.length < countOfOrders
      data: items,
    };
    return result;
  }

  async getSingleOrder(id) {
    if (!Types.ObjectId.isValid(id)) {
      return 'Invalid Identifier';
    }

    const orders = await this.getOrders({ _id: id });
    const result = orders.data[0] || {};
    return result;
  }

  async getOrCreateCustomer(orderId) {
    const order = await this.getSingleOrder(orderId);
    if (!order.customer_id && order.email) {
      const customers = await api.customers.getCustomers({ email: order.email });
      const customerExists = customers && customers.data && customers.data.length > 0;
      if (customerExists) {
        // if customer exist - set new customer_id
        order.customer_id = customers.data[0]._id;
        return order;
      }
      // if customer not exist - create new customer and set new customer_id
      const addresses = [];
      if (order.shipping_address) {
        addresses.push(order.shipping_addresses);
      }

      const salt = await bcrypt.genSalt(saltRounds);
      const hashPassword = await bcrypt.hash(order.password, salt);

      const customer = await api.customers.addCustomer({
        first_name: order.first_name,
        last_name: order.last_name,
        password: hashPassword,
        email: order.email,
        full_name: `${order.first_name} ${order.last_name}`,
        mobile: order.mobile,
        browser: order.browser,
        adresses: order.shipping_address,
      });
      order.customer_id = customer.id;
      return order;
    }
  }

  async addOrder(data) {
    try {
      const orderData = await this.getValidDocumentForInsert(data);
      const order = await OrderModel.create(orderData);
      return order;
    } catch (error) {
      logger.error(error.toString());
    }
  }

  async getValidDocumentForInsert(data) {
    const lastOrder = await OrderModel.find({}, { number: 1 }).sort({ number: -1 }).limit(1);
    let orderNumber = config.orderStartNumber;
    if (lastOrder && lastOrder.length > 0) {
      orderNumber = lastOrder[0].number + 1;
    }
    data.number = orderNumber;
    return data;
  }

  async getValidDataForOrderUpdate(data) {
    if (data.shipping_method_id) {
      const shippingMethod = await api.shippingMethods.getMethodById(data.shipping_method_id);
      data.shipping_price = shippingMethod.price;
    } else delete data.shipping_method_id;
    if (data.email) {
      const users = await api.customers.getCustomers({ email: data.email });
      if (users.data.length > 0) data.customer_id = users.data[0]._id;
      else data.customer_id = null;
    }
    if (data.paid) {
      data.date_paid = new Date();
    }
    return data;
  }

  async updateOrder(id, data, options = {}) {
    if (!Types.ObjectId.isValid(id)) {
      return 'Invalid Identifier';
    }
    // if(data.paid_date) data.paid_date = new Date(data.paid_date)
    const updateData = await this.getValidDataForOrderUpdate(data);
    try {
      await OrderModel.findByIdAndUpdate(id, updateData, options);
      const response = await this.getSingleOrder(id);
      await this.updateCustomerStatistics(response.customer_id);
      return response;
    } catch (error) {
      logger.error(error.toString());
    }
  }

  async deleteOrder(id) {
    if (!Types.ObjectId.isValid(id)) {
      return 'Invalid Identifier';
    }

    try {
      await OrderModel.findByIdAndDelete(id);
      return { status: 'success' };
    } catch (error) {
      logger.error(error);
      return { status: 'error', error: error.toString() };
    }
  }

  getEmailSubject(emailTemplate, order) {
    if (emailTemplate && order) {
      const subjectTemplate = handlebars.compile(emailTemplate.subject);
      return subjectTemplate(order);
    }
    return null;
  }

  async getEmailBody({ emailTemplate, order, shopId }) {
    if (emailTemplate && order) {
      const shop = await api.shops.getShopById(shopId);
      const shippingMethod = await api.shippingMethods.getMethodById(order.shipping_method_id);
      const paymentMethod = await api.paymentMethods.getMethodById(order.payment_method_id);
      const orderGift = await api.orderGifts.getById(order.gift_id);

      order.items = this.updateItemsPriceByShop(order.items, shop.warehouse);
      order.subtotal = this.getOrderPrice(order.items).subtotal;
      order.shipping_total = shippingMethod.price || 0;
      order.grand_total = order.subtotal + order.shipping_total;
      order.shipping_method = shippingMethod.name || 'Самовывоз';
      order.payment_method = paymentMethod.name;
      if (shop) {
        order.shop = {
          name: shop.name,
          work_time: shop.work_time,
          phone: shop.phone,
        };
      } else {
        order.shop = {
          name: 'Не указано',
          work_time: 'Не указано',
          phone: 'Не указано',
        };
      }
      await handlebars.registerHelper('comment', () => {
        let string = '';
        if (!order.paid) {
          string +=
            '<p>После обработки заказа с вами свяжется наш менеджер для уточнения деталей. Пожалуйста, ожидайте.</p><br />';
        }
        if (order.gift_id) {
          const giftName = orderGift.name;
          string += `<p>Ваш подарок к заказу: ${giftName}</p><br />`;
        }
        return new handlebars.SafeString(string);
      });
      const bodyTemplate = handlebars.compile(emailTemplate.body);
      return bodyTemplate(order);
    }
    return null;
  }

  updateItemsPriceByShop(items, status) {
    if (status) {
      items.map(item => {
        item.price = item.stock_price;
        item.price_total = item.stock_price_total;
      });
    }
    return items;
  }

  getOrderPrice(items) {
    let subtotal = 0;
    let stockSubtotal = 0;
    items.map(item => {
      subtotal += item.price_total;
      stockSubtotal += item.stock_price_total;
    });
    return { subtotal, stockSubtotal };
  }

  async sendAllMails(toEmail, copyTo, subject, body) {
    if (toEmail) {
      await mailer.send({
        to: toEmail,
        subject,
        html: body,
      });
      await mailer.send({
        to: copyTo,
        subject,
        html: body,
      });
    }
  }

  async checkoutOrder({ orderId, shopId, userId, delivery }) {
    const totalPrice = await this.getOrderTotalPrice(orderId, shopId, userId);
    const order = await this.updateOrder(orderId, {
      customer_id: userId,
      date_placed: new Date(),
      draft: false,
      shop_id: shopId,
      total_price: totalPrice,
    });

    const updatedOrder = await api.orderItems.calculateAndUpdateAllItems(orderId, true);
    await this.addGiftToOrder(updatedOrder);
    try {
      const emailTemplate = await api.emailTemplates.getEmailTemplate('order_confirmation');
      const dashboardSettings = await api.settings.getSettings();
      const subject = this.getEmailSubject(emailTemplate, order);
      const orderJson = await OrderModel.findById(orderId).lean().exec();
      const body = await this.getEmailBody({ emailTemplate, order: orderJson, shopId, delivery });
      const copyTo = dashboardSettings.order_confirmation_copy_to;
      this.sendAllMails(order.email, copyTo, subject, body);
      await api.products.handleOrderCheckout(orderId, shopId);
    } catch (error) {
      logger.error(error.toString());
    }

    return order;
  }

  async addGiftToOrder(order, shopId) {
    const gifts = await api.orderGifts.getList();
    if (gifts.length > 0) {
      const shop = await api.shops.getShopById(shopId);
      const prices = this.getOrderPrice(order.items);
      const price = shop.warehouse ? prices.stockSubtotal : prices.subtotal;
      let currentGift = {
        price: 0,
      };
      gifts.forEach(item => {
        if (price > item.from_the_price && currentGift.price < item.from_the_price) {
          currentGift = item;
        }
      });
      await this.updateOrder(order._id, { gift_id: currentGift._id });
    }
  }

  async getOrderTotalPrice(orderId, shopId, userId) {
    const order = await this.getSingleOrder(orderId);
    const shop = await api.shops.getShopById(shopId);
    const customer = await api.customers.getSingleCustomer(userId);
    const { subtotal, stockSubtotal } = this.getOrderPrice(order.items);
    const sum = shop.warehouse ? stockSubtotal : subtotal;
    let udsDiscount = 0;
    let userDiscount = 0;
    if (order.uds) {
      udsDiscount = order.uds.discount_points;
    }
    if (customer.discount) userDiscount = (sum / 100) * customer.discount;
    const result = sum - udsDiscount - userDiscount;
    return result;
  }

  async cancelOrder(orderId) {
    try {
      await api.products.handleCancelOrder(orderId);
      return await this.updateOrder(orderId, { cancelled: true, date_cancelled: new Date() });
    } catch (error) {
      logger.error(error.toString());
    }
  }

  async closeOrder(orderId) {
    const result = await this.updateOrder(orderId, { closed: true });
    return result;
  }

  async updateCustomerStatistics(customerId) {
    if (customerId) {
      const orders = await this.getOrders({ customer_id: customerId });
      let totalSpent = 0;
      let ordersCount = 0;

      if (orders.data && orders.data.length > 0) {
        for (const order of orders.data) {
          if (order.draft === false) {
            ordersCount += 1;
          }
          if (order.paid === true || order.closed === true) {
            totalSpent += order.grand_total;
          }
        }
      }

      const result = await api.customers.updateCustomerStatistics(
        customerId,
        totalSpent,
        ordersCount,
      );
      return result;
    }
  }

  async chargeOrder(orderId) {
    const order = await this.getSingleOrder(orderId);
    const isSuccess = await PaymentGateways.processOrderPayment(order);
    return isSuccess;
  }

  changeProperties(order, orderStatuses, shippingMethods, paymentMethods) {
    if (order) {
      const orderStatus =
        order.status_id && orderStatuses.length > 0
          ? orderStatuses.find(status => status._id.equals(order.status_id))
          : null;

      const orderShippingMethod =
        order.shipping_method_id && shippingMethods.length > 0
          ? shippingMethods.find(method => method._id.equals(order.shipping_method_id))
          : null;

      const orderPaymentMethod =
        order.payment_method_id && paymentMethods.length > 0
          ? paymentMethods.find(method => method._id.equals(order.payment_method_id))
          : null;

      order.status = orderStatus ? orderStatus.name : '';
      order.shipping_method = orderShippingMethod ? orderShippingMethod.name : '';
      order.payment_method = orderPaymentMethod ? orderPaymentMethod.gateway : '';

      let sumItemsWeight = 0;
      let sumItemsPriceTotal = 0;
      let sumItemsDiscountTotal = 0;
      let sumDiscountsAmount = 0;
      let sumItemsTaxTotal = 0;

      if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
          const itemWeight = item.weight * item.quantity;
          if (itemWeight > 0) {
            sumItemsWeight += itemWeight;
          }
        });

        order.items.forEach(item => {
          if (item.price_total > 0) {
            sumItemsPriceTotal += item.price_total;
          }
        });

        order.items.forEach(item => {
          if (item.price_total > 0 && order.tax_rate > 0) {
            if (order.item_tax_included) {
              sumItemsTaxTotal += item.price_total - item.price_total / (1 + order.tax_rate / 100);
            } else {
              sumItemsTaxTotal += item.price_total * (order.tax_rate / 100);
            }
          }
        });

        order.items.forEach(item => {
          if (item.discount_total > 0) {
            sumItemsDiscountTotal += item.discount_total;
          }
        });
      }

      const taxIncludedTotal =
        (order.item_tax_included ? 0 : sumItemsTaxTotal) +
        (order.shipping_tax_included ? 0 : order.shipping_tax);

      if (order.discounts && order.discounts.length > 0) {
        order.items.forEach(item => {
          if (item.amount > 0) {
            sumDiscountsAmount += item.amount;
          }
        });
      }

      const taxTotal = sumItemsTaxTotal + order.shipping_tax;
      const shippingTotal = order.shipping_price - order.shipping_discount;
      const discountTotal = sumItemsDiscountTotal + sumDiscountsAmount;
      const grandTotal = sumItemsPriceTotal + shippingTotal + taxIncludedTotal - discountTotal;

      order.weight_total = sumItemsWeight;
      order.discount_total = discountTotal; // sum(items.discount_total)+sum(discounts.amount)
      order.subtotal = sumItemsPriceTotal; // sum(items.price_total)
      order.tax_included_total = taxIncludedTotal; // if(item_tax_included, 0, item_tax) + if(shipment_tax_included, 0, shipping_tax)
      order.tax_total = taxTotal; // item_tax + shipping_tax
      order.shipping_total = shippingTotal; // shipping_price-shipping_discount
      order.grand_total = grandTotal; // subtotal + shipping_total + tax_included_total - (discount_total)
    }

    return order;
  }
}

export default new OrdersApi();
