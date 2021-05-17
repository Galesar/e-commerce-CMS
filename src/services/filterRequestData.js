import bcrypt from 'bcrypt';
import config from '../../config';

const { saltRounds } = config;

export default class FilterRequestData {
  static filterData(object, type) {
    const returnObject = { ...object };
    if (type === 'customer') {
      if (object.email) returnObject.email = returnObject.email.toLowerCase();
      if (object.password) {
        const inputPassword = object.password;
        const salt = bcrypt.genSaltSync(saltRounds);
        returnObject.password = bcrypt.hashSync(inputPassword, salt);
      }
      if (object.featured_products !== undefined)
        returnObject.featured_products = [returnObject.featured_products];
      return returnObject;
    }
  }
}
