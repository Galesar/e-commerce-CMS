import { Schema } from 'mongoose';

const customerSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
    },
    entity: {
      type: Boolean,
      default: false,
    },
    wholesaler: {
      type: Boolean,
      default: false,
    },
    wholesaler_settings: {
      type: Object,
      default: {
        organizationName: '',
        itn: '',
        bic: '',
        correspondingAccount: '',
        psrn: '',
        bankName: '',
        currentAccount: '',
        legalAddress: '',
        actualAddress: '',
      },
    },
    password: {
      type: String,
      required: true,
    },
    total_spent: {
      type: Number,
      default: 0,
    },
    orders_count: {
      type: Number,
      default: 0,
    },
    featured_products: {
      type: Array,
      default: [],
      index: true,
    },
    note: {
      type: String,
      default: '',
    },
    mobile: {
      type: String,
      default: '+70000000000',
    },
    full_name: {
      type: String,
      default: '',
      index: true,
    },
    gender: {
      type: String,
      default: '',
    },
    group_id: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    tags: {
      type: Array,
      default: [],
    },
    social_accounts: {
      type: Array,
      default: [],
    },
    birthdate: {
      type: Date,
      default: null,
    },
    shipping_address: {
      type: Object,
      default: {
        address: '',
        city: '',
        state: '',
        country: '',
        postal_code: '',
      },
    },
    browser: {
      type: Object,
      default: {},
    },
    scopes: {
      type: Array,
      default: [],
    },
    year_spent: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    refresh_tokens: {
      type: Array,
      default: [],
    },
    current_order: {
      type: Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true, versionKey: false },
);

export default customerSchema;
