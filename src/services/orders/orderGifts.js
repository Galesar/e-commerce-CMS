import logger from 'winston';
import { Types } from 'mongoose';
import path from 'path';
import fse from 'fs-extra';
import url from 'url';
import pMap from 'p-map';
import models from '../models';
import config from '../../../config';
import api from '../api';

const { OrderGift } = models;
const INVALID_IDENTIFIER = 'Invalid identifier';

function getError(message) {
  return { status: 'error', message };
}

async function changeProperties(object) {
  if (object.image) {
    const currentSettings = await api.settings.getSettings();
    object.image.url = url.resolve(
      currentSettings.domain,
      `${config.orderGiftsUploadUrl}/${object._id}/${object.image.filename}`,
    );
  }
  return object;
}

class OrderGiftsApi {
  async create(data) {
    try {
      const result = await OrderGift.create(data);
      return result;
    } catch (error) {
      logger.error(error.toString());
      return getError(error.toString());
    }
  }

  async changePropertiesMapper(item) {
    const result = await changeProperties(item);
    return result;
  }

  async getList(filter = {}) {
    try {
      const gifts = await OrderGift.find(filter);
      const result = await pMap(gifts, this.changePropertiesMapper, { concurrency: 1 });
      return result;
    } catch (error) {
      logger.error(error.toString());
      return getError(error.toString());
    }
  }

  async getById(id) {
    if (!Types.ObjectId.isValid(id)) {
      return INVALID_IDENTIFIER;
    }

    const gift = await OrderGift.findById(id);
    const result = await changeProperties(gift);
    if (!result) return 'Object not found';
    return result;
  }

  async updateObject(id, data) {
    if (!Types.ObjectId.isValid(id)) {
      return INVALID_IDENTIFIER;
    }

    try {
      await OrderGift.findByIdAndUpdate(id, data);
      const result = await this.getById(id);
      return result;
    } catch (error) {
      logger.error(error.toString());
      return getError(error.toString());
    }
  }

  async deleteObject(id) {
    if (!Types.ObjectId.isValid(id)) {
      return INVALID_IDENTIFIER;
    }

    try {
      await OrderGift.findByIdAndDelete(id);
      return { status: 'success' };
    } catch (error) {
      logger.error(error.toString());
      return getError(error.toString());
    }
  }

  async uploadImage(id, image) {
    if (!Types.ObjectId.isValid(id)) {
      return INVALID_IDENTIFIER;
    }
    if (!image) {
      return 'Image file is required';
    }

    const uploadDir = path.resolve(`${config.orderGiftsUploadPath}/${id}`);
    // create dir, if it doesn't exist
    try {
      await fse.ensureDir(uploadDir);
    } catch (error) {
      logger.error(error.toString());
      return getError(error.toString());
    }
    // move file with new name to product dir
    try {
      await fse.rename(image.path, `${uploadDir}/${image.name}`);
    } catch (error) {
      logger.error(error.toString());
      return getError(error.toString());
    }
    //
    const imageData = {
      _id: new Types.ObjectId(),
      alt: '',
      position: 99,
      filename: image.name,
    };
    await this.updateObject(id, { image: imageData });
    return { status: 'success' };
  }

  async deleteImage(id) {
    if (!Types.ObjectId.isValid(id)) {
      return INVALID_IDENTIFIER;
    }

    const gift = await this.getById(id);
    if (gift.image) {
      const { filename } = gift.image;
      try {
        const filePath = path.resolve(`${config.orderGiftsUploadPath}/${id}/${filename}`);
        await fse.remove(filePath);
        await this.updateObject(id, { image: null });
        return { status: 'success' };
      } catch (error) {
        logger.error(error.toString());
        return getError(error.toString());
      }
    }
  }
}

export default new OrderGiftsApi();
