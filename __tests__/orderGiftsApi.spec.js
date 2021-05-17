import mongoose from 'mongoose';
import winston from 'winston';
import api from '../src/services/api';

const LOGS_FILE = 'logs/server-test.log';
const ERRORS_FILE = 'logs/errors-test.log';
const DEV_LOGS_FILE = 'logs/dev-logs-test.log';

winston.configure({
  transports: [
    new winston.transports.Console({
      level: 'debug',
      handleExceptions: true,
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
      filename: DEV_LOGS_FILE,
    }),
    new winston.transports.File({
      level: 'info',
      handleExceptions: true,
      format: winston.format.json(),
      filename: LOGS_FILE,
    }),
    new winston.transports.File({
      level: 'error',
      handleExceptions: true,
      format: winston.format.json(),
      filename: ERRORS_FILE,
    }),
  ],
});

describe('pages api', () => {
  beforeAll(async () => {
    const url = `mongodb://127.0.0.1:27017/cms-gifts`;
    const connection = await mongoose.createConnection(url, {
      useNewUrlParser: true,
      useFindAndModify: false,
      useUnifiedTopology: true,
    });
    await connection.dropDatabase();
    await mongoose.connect(url, { useNewUrlParser: true, useFindAndModify: false });
  });

  let giftId;
  const defaultData = {
    name: 'Default gift',
    from_the_price: 0,
    to_the_price: 1000,
  };

  test('add new gift', async () => {
    const result = await api.orderGifts.create(defaultData);
    giftId = result._id;
    expect(result.name).toEqual(defaultData.name);
  });

  test('get gift by id', async () => {
    const result = await api.orderGifts.getById(giftId);
    expect(result._id).toEqual(giftId);
  });

  test('get gifts', async () => {
    const result = await api.orderGifts.getList();
    expect(result[0]._id).toEqual(giftId);
  });

  test('update gift', async () => {
    const result = await api.orderGifts.updateObject(giftId, { name: 'Alfa gift' });
    expect(result.name).toEqual('Alfa gift');
  });

  test('delete gift', async () => {
    const result = await api.orderGifts.deleteObject(giftId);
    expect(result.status).toEqual('success');
  });
});
