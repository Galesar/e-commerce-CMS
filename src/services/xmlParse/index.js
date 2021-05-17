import parser from 'fast-xml-parser';
import he from 'he';
import fse from 'fs-extra';
import path from 'path';
import logger from 'winston';
import mongoose from 'mongoose';
import pMap from 'p-map';
import config from '../../../config';
import api from '../api';
import models from '../models';

const product = models.ProductModel;

async function changeProperties(productObject) {
  const result = { ...productObject };
  if (result.options) delete result.options;
  if (result.category) {
    const category = await api.categories.getCategories({ name: result.category });
    result.categoryId = category[0]._id;
    delete result.category;
  }
  return result;
}

async function addImage(productId, imagePath) {
  const uploadDir = path.resolve(`${config.productsUploadPath}/${productId}`);
  // create dir, if it doesn't exist
  try {
    await fse.ensureDir(uploadDir);
  } catch (error) {
    logger.error(error.toString());
  }
  // move file with new name to product dir
  const fileName = imagePath.split('/');
  try {
    await fse.rename(`catalog/${imagePath}`, `${uploadDir}/${fileName[1]}`);
  } catch (error) {
    logger.error(error.toString());
  }
  //
  const imageData = {
    _id: new mongoose.Types.ObjectId(),
    alt: '',
    position: 99,
    filename: fileName[1],
  };
  await product.findByIdAndUpdate(productId, {
    $push: { images: imageData },
  });
}

async function addFileToProduct(productId, filePath) {
  const uploadDir = path.resolve(`${config.productsFilesUploadPath}/${productId}`);
  try {
    await fse.ensureDir(uploadDir);
  } catch (error) {
    logger.error(error.toString());
  }
  const fileName = filePath.split('/');
  try {
    await fse.rename(`catalog/files/${filePath}`, `${uploadDir}/${fileName[1]}`);
  } catch (error) {
    logger.error(error.toString());
  }

  const fileData = {
    _id: new mongoose.Types.ObjectId(),
    filename: fileName[1],
  };
  await product.findByIdAndUpdate(productId, {
    $push: { files: fileData },
  });
}

async function addProductOptions(options, productId) {
  const mapper = async item => {
    await api.products.addOption(productId, {
      name: item.name,
      values: [item.value],
    });
  };
  await pMap(options, mapper, { concurrency: 1 });
}

async function addProductsToDb(data) {
  let counterSuccess = 0;
  let counterFailure = 0;
  const productErrors = [];
  for (let i = 0; i < data.length; i += 1) {
    try {
      const importData = await changeProperties(data[i]);
      const result = await api.products.addProduct(importData);
      if (result) {
        const dataOptions = data[i].options;
        if (dataOptions) {
          await addProductOptions(dataOptions, result._id);
        }
        await addImage(result._id, data[i].image);
        if (data[i].file) await addFileToProduct(result._id, data[i].file);
        counterSuccess += 1;
      } else counterFailure += 1;
    } catch (error) {
      logger.error(error.toString());
      productErrors.push(error);
    }
  }
  return { success_added: counterSuccess, failure_added: counterFailure, productErrors };
}

async function xmlParse(xmlFile) {
  const fileContent = await fse.readFile(xmlFile.path, 'utf-8');
  const options = {
    attributeNamePrefix: '@_',
    attrNodeName: 'attr', // default is 'false'
    textNodeName: '#text',
    ignoreAttributes: true,
    ignoreNameSpace: false,
    allowBooleanAttributes: false,
    parseNodeValue: true,
    parseAttributeValue: false,
    trimValues: true,
    cdataTagName: '__cdata', // default is 'false'
    cdataPositionChar: '\\c',
    parseTrueNumberOnly: false,
    arrayMode: false, // "strict"
    attrValueProcessor: val => he.decode(val, { isAttributeValue: true }), // default is a=>a
    tagValueProcessor: val => he.decode(val), // default is a=>a
    stopNodes: ['parse-me-as-string'],
  };
  if (parser.validate(fileContent) === true) {
    // optional (it'll return an object in case it's not valid)
    const jsonObj = parser.parse(fileContent, options);
    const productsArray = jsonObj.products.product;
    return addProductsToDb(productsArray);
  }
  const tObj = parser.getTraversalObj(fileContent, options);
  const jsonObj = parser.convertToJson(tObj, options);
  const productsArray = jsonObj.products.product;
  return addProductsToDb(productsArray);
}

export async function addImagesToProduct(productId, imagesPath) {
  const files = await fse.readdir(imagesPath);
  addImage(productId, `${imagesPath}${files[0]}`);
}

export default xmlParse;
