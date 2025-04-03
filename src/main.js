import OpenAI from "openai";
import { franc } from "franc";
import dotenv from "dotenv";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Language detection function
function detectLanguage(text) {
  try {
    const lang = franc(text);
    return lang !== "und" ? lang : "en";
  } catch (error) {
    console.error("Error detecting language:", error.message);
    return "en";
  }
}

// Extract language from product data
function getProductLanguage(product) {
  const textFields = ["description", "title", "name", "productName", "label"];
  for (const field of textFields) {
    if (
      product[field] &&
      typeof product[field] === "string" &&
      product[field].trim()
    ) {
      return detectLanguage(product[field]);
    }
  }
  return "en";
}

// Build hierarchical category structure
function buildCategoryHierarchy(categoryPaths) {
  const hierarchy = {};
  categoryPaths.forEach((path) => {
    const parts = path
      .replace("/", ">")
      .split(">")
      .map((p) => p.trim());
    parts.forEach((part, i) => {
      const levelKey = `lvl${i}`;
      const levelValue = parts.slice(0, i + 1).join(" > ");
      hierarchy[levelKey] = hierarchy[levelKey] || [];
      if (!hierarchy[levelKey].includes(levelValue)) {
        hierarchy[levelKey].push(levelValue);
      }
    });
  });
  return hierarchy;
}

// Build a dynamic prompt for OpenAI
function buildDynamicPrompt(record, industry, language) {
  const languageInstructions = {
    en: "Analyze this product and respond in English",
    es: "Analiza este producto y responde en español",
    fr: "Analysez ce produit et répondez en français",
    de: "Analysieren Sie dieses Produkt und antworten Sie auf Deutsch",
    it: "Analizza questo prodotto e rispondi in italiano",
  };
  const instruction = languageInstructions[language] || "Analyze this product";

  let prompt =
    `${instruction}. Return JSON with:\n` +
    "1. Category hierarchy (main category and subcategories)\n" +
    "2. General product characteristics\n" +
    `This categorization should be based on the ${industry} industry\n` +
    "Product Data:\n";

  for (const [key, value] of Object.entries(record)) {
    if (["string", "number", "boolean"].includes(typeof value)) {
      prompt += `- ${key}: ${value}\n`;
    }
  }

  prompt += [
    "\nResponse Requirements:",
    "- Respond in the same language as the product data",
    "- main_category: Broadest product category",
    "- subcategory: More specific product type",
    "- characteristics: Array of notable product features",
    "\nExample Response Structure (English):",
    `{
            "main_category": "Jewelry",
            "subcategory": "Ear Cuffs",
            "characteristics": ["gold", "handcrafted"]
        }`,
  ].join("\n");

  return prompt;
}

// Analyze the product using OpenAI
async function analyzeProduct(record, industry) {
  try {
    const language = getProductLanguage(record);
    const prompt = buildDynamicPrompt(record, industry, language);

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0125",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const result = JSON.parse(response.choices[0].message.content);
    const hierarchicalCategory = `${result.main_category} > ${result.subcategory}`;
    const categories = [hierarchicalCategory, result.main_category];

    return {
      categoryIdentifiers: categories,
      hierarchicalCategories: {
        lvl0: result.main_category,
        lvl1: hierarchicalCategory,
      },
      productCharacteristics: result.characteristics || [],
    };
  } catch (error) {
    console.error("Error analyzing product:", error.message);
    throw new Error("Product analysis failed");
  }
}

// Process and validate categories
function processCategories(categories, record) {
  if (!Array.isArray(categories) || categories.length === 0) {
    throw new Error("400: No valid categories provided.");
  }

  const categoryValues = categories.flatMap((category) => {
    if (
      !Array.isArray(category.attributes) ||
      category.attributes.length === 0
    ) {
      throw new Error(`400: Invalid attributes in category '${category.type}'`);
    }
    return category.attributes.flatMap((attr) => record[attr] || []);
  });

  return {
    categoryIdentifiers: categoryValues,
    hierarchicalCategories: buildCategoryHierarchy(categoryValues),
  };
}

export const handler = async (event) => {
  try {
    console.log("Received event:", JSON.stringify(event, null, 2));

    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing request body" }),
      };
    }

    let requestBody;
    try {
      requestBody =
        typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } catch (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid JSON format in request body" }),
      };
    }

    console.log("Parsed request body:", requestBody);

    if (
      typeof requestBody !== "object" ||
      Object.keys(requestBody).length === 0
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Request body must be a valid JSON object",
        }),
      };
    }

    let finalProduct = await analyzeProduct(requestBody);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        Vary: "*",
        "Last-Modified": "2017-01-13",
      },
      body: JSON.stringify({
        message: "Successfully processed the request",
        productDetails: finalProduct,
      }),
    };
  } catch (error) {
    console.error("Error processing request:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
