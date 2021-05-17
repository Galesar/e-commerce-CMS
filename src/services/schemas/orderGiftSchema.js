import { Schema } from 'mongoose';

const orderGiftSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    from_the_price: {
      type: Number,
      default: 0,
    },
    image: {
      type: Object,
      default: null,
    },
  },
  { timestamps: true, versionKey: false },
);

export default orderGiftSchema;
