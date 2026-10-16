const express = require("express");
const mongoose = require("mongoose");
const FoodItem = require("../models/FoodItem");
const { GoogleGenAI } = require("@google/genai");

const router = express.Router();

const recipeDatabase = [
  {
    name: "Tomato Sandwich",
    ingredients: ["tomato", "bread", "cheese"],
    instructions:
      "Slice tomatoes, add cheese between bread slices, and toast until golden.",
    cookingTime: 10,
    category: "Quick Snack",
  },
  {
    name: "Vegetable Fried Rice",
    ingredients: ["rice", "carrot", "peas", "onion"],
    instructions:
      "Cook rice, saute vegetables, add rice and seasonings, then stir-fry.",
    cookingTime: 20,
    category: "Main Course",
  },
  {
    name: "Banana Smoothie",
    ingredients: ["banana", "milk", "honey"],
    instructions: "Blend banana, milk and honey until smooth. Serve chilled.",
    cookingTime: 5,
    category: "Drink",
  },
  {
    name: "Potato Sandwich",
    ingredients: ["potato", "bread", "onion"],
    instructions:
      "Boil and mash potatoes, mix with onion and spices, fill bread and toast.",
    cookingTime: 15,
    category: "Quick Snack",
  },
  {
    name: "Cheese Tomato Pasta",
    ingredients: ["tomato", "pasta", "cheese"],
    instructions:
      "Cook pasta, prepare tomato sauce, mix together and add cheese.",
    cookingTime: 20,
    category: "Main Course",
  },
];

function isNotExpired(item) {
  if (!item.expiryDate) return true;

  const expiry = new Date(item.expiryDate);
  const today = new Date();

  expiry.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return expiry >= today;
}

// GET /api/recipes/suggestions
router.get("/suggestions", async (req, res) => {
  try {
    const pantryItems = await FoodItem.find({ status: "available" });
    const usableItems = pantryItems.filter(isNotExpired);
    const availableIngredients = usableItems.map((item) =>
      item.name.trim().toLowerCase(),
    );

    const suggestions = recipeDatabase
      .map((recipe) => {
        const matchedIngredients = recipe.ingredients.filter((ingredient) =>
          availableIngredients.some(
            (available) =>
              available === ingredient ||
              available.includes(ingredient) ||
              ingredient.includes(available),
          ),
        );

        const missingIngredients = recipe.ingredients.filter(
          (ingredient) => !matchedIngredients.includes(ingredient),
        );

        return {
          ...recipe,
          matchedIngredients,
          missingIngredients,
          matchPercentage: Math.round(
            (matchedIngredients.length / recipe.ingredients.length) * 100,
          ),
        };
      })
      .filter((recipe) => recipe.matchedIngredients.length > 0)
      .sort((a, b) => b.matchPercentage - a.matchPercentage);

    return res.status(200).json({
      success: true,
      availableIngredients,
      count: suggestions.length,
      suggestions,
    });
  } catch (error) {
    console.error("RECIPE SUGGESTIONS ERROR:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to generate recipe suggestions",
    });
  }
});

// GET /api/recipes/ai-suggestions
// GET /api/recipes/ai-suggestions?itemId=FOOD_ITEM_ID
router.get("/ai-suggestions", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Gemini API key is missing in the backend .env file.",
      });
    }

    const { itemId } = req.query;
    let usableItems;

    if (itemId) {
      if (!mongoose.Types.ObjectId.isValid(itemId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid food item ID.",
        });
      }

      const selectedItem = await FoodItem.findById(itemId);

      if (!selectedItem || selectedItem.status !== "available") {
        return res.status(404).json({
          success: false,
          message: "This food item is not available in your pantry.",
        });
      }

      if (!isNotExpired(selectedItem)) {
        return res.status(400).json({
          success: false,
          message: `${selectedItem.name} is expired. Choose a non-expired item.`,
        });
      }

      usableItems = [selectedItem];
    } else {
      const pantryItems = await FoodItem.find({ status: "available" });
      usableItems = pantryItems.filter(isNotExpired);
    }

    if (usableItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Add available, non-expired food items to your pantry first.",
      });
    }

    const ingredients = usableItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
    }));

    const selectedName = itemId ? usableItems[0].name : "";
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const prompt = `
You are NourishIQ, an AI cooking assistant that helps reduce food waste.

${
  selectedName
    ? `The user selected "${selectedName}".
Generate 3 different recipes specifically using "${selectedName}" as the MAIN ingredient.
Use only this selected pantry item as the pantry ingredient.
Do not claim other pantry items are available.
List other required ingredients under additionalIngredients.`
    : `Generate 3 practical recipes using the available pantry ingredients below.`
}

Available pantry ingredients:
${JSON.stringify(ingredients)}

Rules:
1. Follow the selected-item requirement above.
2. Clearly list additional ingredients that are needed.
3. Never claim an unavailable ingredient is in the pantry.
4. Include short cooking instructions and cooking time in minutes.
5. Use simple English.
6. Make the recipes different from one another.
7. Return only a valid JSON array without Markdown fences.

Each recipe must have this structure:
{
  "name": "Recipe name",
  "ingredients": ["ingredient with quantity"],
  "additionalIngredients": ["extra ingredient"],
  "instructions": ["step 1", "step 2"],
  "cookingTime": 20,
  "difficulty": "Easy",
  "wasteReductionTip": "A practical tip"
}
`;

    // Try the model that succeeded in your logs first.
    const modelsToTry = ["gemini-3.5-flash-lite", "gemini-3.8-flash"];

    let response = null;
    let lastError = null;

    for (const model of modelsToTry) {
      let modelWorked = false;

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          console.log(`NourishIQ: trying ${model}, attempt ${attempt + 1}`);

          response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              maxOutputTokens: 1500,
              temperature: 0.4,
            },
          });

          modelWorked = true;
          console.log(`NourishIQ: generated recipes using ${model}`);
          break;
        } catch (error) {
          lastError = error;

          const errorText = [
            error.message || "",
            error.status || "",
            error.code || "",
          ]
            .join(" ")
            .toUpperCase();

          const temporaryError =
            /503|UNAVAILABLE|429|RESOURCE_EXHAUSTED|500|INTERNAL|TIMEOUT|ECONNRESET/.test(
              errorText,
            );

          console.error(`Gemini error for ${model}:`, error.message || error);

          if (!temporaryError) throw error;

          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        }
      }

      if (modelWorked) break;
    }

    if (!response || !response.text) {
      throw lastError || new Error("Gemini returned an empty response.");
    }

    let generatedRecipes;

    try {
      generatedRecipes = JSON.parse(response.text);
    } catch {
      throw new Error("Gemini returned invalid JSON. Please try again.");
    }

    if (!Array.isArray(generatedRecipes)) {
      throw new Error("Gemini did not return a recipe list.");
    }

    return res.status(200).json({
      success: true,
      message: selectedName
        ? `AI recipes for ${selectedName} generated successfully`
        : "AI recipes generated successfully",
      selectedItem: selectedName || null,
      pantryIngredients: ingredients,
      count: generatedRecipes.length,
      recipes: generatedRecipes,
    });
  } catch (error) {
    console.error("GEMINI AI ERROR:", error.message || error);

    const errorText = [
      error.message || "",
      error.status || "",
      error.code || "",
    ]
      .join(" ")
      .toUpperCase();

    const isBusy =
      /503|UNAVAILABLE|429|RESOURCE_EXHAUSTED|500|INTERNAL|TIMEOUT|ECONNRESET/.test(
        errorText,
      );

    return res.status(isBusy ? 503 : 500).json({
      success: false,
      message: isBusy
        ? "Gemini AI is temporarily busy. Please try again in a little while."
        : "Failed to generate AI recipes. Check the backend terminal for details.",
      error: error.message || "Unknown Gemini error",
    });
  }
});

module.exports = router;
