
const express = require("express");
const FoodItem = require("../models/FoodItem");

const router = express.Router();

// GET: Get all pantry items
router.get("/", async (req, res) => {
  try {
    const items = await FoodItem.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error) {
    console.error("FETCH PANTRY ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch pantry items",
    });
  }
});

 // GET: Track food expiry dates
router.get("/expiry", async (req, res) => {
  try {
    const items = await FoodItem.find({
      status: "available",
      expiryDate: { $ne: null },
    }).sort({ expiryDate: 1 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);

    const trackedItems = items.map((item) => {
      const expiry = new Date(item.expiryDate);
      expiry.setHours(0, 0, 0, 0);

      let expiryStatus;

      if (expiry < today) {
        expiryStatus = "Expired";
      } else if (expiry <= threeDaysLater) {
        expiryStatus = "Expiring Soon";
      } else {
        expiryStatus = "Fresh";
      }

      return {
        ...item.toObject(),
        expiryStatus,
      };
    });

    res.status(200).json({
      success: true,
      count: trackedItems.length,
      items: trackedItems,
    });
  } catch (error) {
    console.error("EXPIRY TRACKER ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to track food expiry",
    });
  }
});


// POST: Add a food item
router.post("/", async (req, res) => {
  try {
    console.log("RECEIVED BODY:", req.body);

    const { name, quantity, unit, category, expiryDate } = req.body || {};

    // Validate required fields
    if (
      typeof name !== "string" ||
      !name.trim() ||
      quantity === undefined ||
      quantity === null ||
      quantity === "" ||
      !Number.isFinite(Number(quantity)) ||
      Number(quantity) <= 0 ||
      typeof unit !== "string" ||
      !unit.trim() ||
      typeof category !== "string" ||
      !category.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid data received",
        received: req.body || null,
      });
    }

    // Validate expiry date if provided
    if (
      expiryDate &&
      Number.isNaN(Date.parse(expiryDate))
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid expiry date",
      });
    }

    // Save food item to MongoDB
    const item = await FoodItem.create({
      name: name.trim(),
      quantity: Number(quantity),
      unit: unit.trim(),
      category: category.trim(),
      expiryDate: expiryDate || null,
    });

    return res.status(201).json({
      success: true,
      message: "Food item added successfully",
      item,
    });
  } catch (error) {
    console.error("ADD FOOD ITEM ERROR:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to add food item",
    });
  }
});

// DELETE: Delete a food item by ID
router.delete("/:id", async (req, res) => {
  try {
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid food item ID",
      });
    }

    const item = await FoodItem.findByIdAndDelete(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Food item not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Food item deleted successfully",
    });
  } catch (error) {
    console.error("DELETE FOOD ITEM ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete food item",
    });
  }
});

module.exports = router;
