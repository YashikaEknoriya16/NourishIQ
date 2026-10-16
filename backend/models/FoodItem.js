
const mongoose = require("mongoose");

const foodItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    unit: {
      type: String,
      required: true,
      enum: ["pcs", "kg", "g", "litre", "ml", "pack"],
    },

    category: {
      type: String,
      required: true,
      enum: [
        "Fruits",
        "Vegetables",
        "Dairy",
        "Grains",
        "Snacks",
        "Other",
      ],
    },

    expiryDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["available", "used", "discarded"],
      default: "available",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FoodItem", foodItemSchema);
