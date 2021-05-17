import models from '../src/services/models';
import config from '../config';
import mongoose from 'mongoose';
import winston from 'winston';

const addProduct = async () => {
    const productCategoriesCount = await models.categoryModel.countDocuments({});
    const productsCount = await models.productModel.countDocuments({});
    const productsNotExists = productCategoriesCount === 0 && productsCount === 0;
    if(productsNotExists) {
        try {
        const catA = await models.categoryModel.create({
            name: 'Category A',
			slug: 'category-a',
			image: '',
			parent_id: null,
			enabled: true
        })

        await models.productModel.create({
            name: 'Product A',
			slug: 'product-a',
			category_id: catA.insertedId,
			regular_price: 950,
			stock_quantity: 999,
			enabled: true,
			discontinued: false,
			attributes: [
				{ name: 'Brand', value: 'Brand A' },
				{ name: 'Size', value: 'M' }
			]
        })

        await models.productModel.create({
			name: 'Product B',
			slug: 'product-b',
			category_id: catA.insertedId,
			regular_price: 1250,
			stock_quantity: 999,
			enabled: true,
			discontinued: false,
			attributes: [
				{ name: 'Brand', value: 'Brand B' },
				{ name: 'Size', value: 'L' }
			]
        })

        winston.info('- Added products');
     } catch (error) {winston.error(error)}
    }
}

const addPage = async (pageObject) => {
    try {
        const countOfDoc = await models.pageModel.countDocuments({
            slug: pageObject.slug
        });
        const docExists = +countOfDoc > 0;
        if(!docExists) {
            await models.pageModel.create(pageObject);
            winston.info(`- Added page: /${pageObject.slug}`);
        }
    } catch (error) {
        console.log(`${error}`.red)
    }
}

const addAllPages = async () => {
    await addPage({
        slug: '',
		meta_title: 'Home',
		enabled: true,
		is_system: true
    });
    await addPage({
		slug: 'checkout',
		meta_title: 'Checkout',
		enabled: true,
		is_system: true
    });
    await addPage({
		slug: 'checkout-success',
		meta_title: 'Thank You!',
		enabled: true,
		is_system: true
    });
    await addPage({
		slug: 'about',
		meta_title: 'About us',
		enabled: true,
		is_system: false
    });
    await addPage({
		slug: 'login',
		meta_title: 'Login',
		enabled: true,
		is_system: true
    });
    await addPage({
		slug: 'register',
		meta_title: 'Register',
		enabled: true,
		is_system: true
    });
    await addPage({
		slug: 'customer-account',
		meta_title: 'Customer Account',
		enabled: true,
		is_system: true
    });
    await addPage({
		slug: 'forgot-password',
		meta_title: 'Forgot Password',
		enabled: true,
		is_system: true
    });
    await addPage({
		slug: 'reset-password',
		meta_title: 'Reset Password',
		enabled: true,
		is_system: true
    });
}

export default async function () {
    mongoose.connect(config.mongoDbUrl, {useNewUrlParser: true, useFindAndModify: false}, (err) => {
        if(err) console.log(err);
        else console.log('Succesfull Connected to database'.green);
    })

    await addAllPages();
    await addProduct();
    // add productOption
    // add productVariant
    // add shop
    // add productShop
    // add productImage
    // add productFile
    // add categoryImage
    // add customer
    // add customerGroup
    // add order
    // add orderAddresses
    // add orderItem
    // add orderStatus
    // add productTag
    // add settings
    // add emailTemplates
}