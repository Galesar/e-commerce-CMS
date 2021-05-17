import jwt from 'jsonwebtoken';
import logger from 'winston';
import config from '../../config';

const cert = config.jwtSecretKey;

class AuthHeader {
  encodeUserLoginAuth(userId) {
    return jwt.sign({ userId }, cert);
  }

  decodeUserLoginAuth(token) {
    try {
      return jwt.verify(token, cert);
    } catch (error) {
      logger.error(error.toString());
    }
  }

  encodeUserPassword(token) {
    return jwt.sign({ password: token }, cert);
  }

  decodeUserPassword(token) {
    try {
      return jwt.verify(token, cert);
    } catch (error) {
      logger.error(error.toString());
    }
  }
}

export default new AuthHeader();
