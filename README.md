# hackathon-category-generator
# AWS Lambda Function: Product Categorization for Algolia Records

This AWS Lambda function processes an **Algolia Product Record** to generate recommended **categories**, **subcategories**, and **product characteristics**. It leverages OpenAI for predictive categorization and the `franc` library for language detection, providing accurate and structured outputs to enhance product organization and search optimization.

## Functionality

The function analyzes a given product record and outputs:

1. **Recommended Category:** The broadest category based on product attributes.  
2. **Subcategory:** A more specific type derived from the product data.  
3. **Product Characteristics:** A list of notable features to support filtering and search.  

This function is designed to be integrated with Algolia's merchandising workflows, particularly useful for cases where product data is inconsistent or incomplete.

---

## How It Works

### Input: 
- An **Algolia product record** (JSON format) containing product details such as `name`, `description`, `title`, and more.  
- **Category attributes** to guide categorization.  

### Process:
1. Detects the product language using `franc`.  
2. Builds a dynamic prompt for OpenAI based on the product's attributes.  
3. Makes an API call to OpenAI to predict the main category, subcategory, and key product characteristics.  
4. Structures the hierarchical categories and characteristic list.  

### Output:
- JSON object containing the following:  
  - **categoryIdentifiers:** Array of recommended categories.  
  - **hierarchicalCategories:** Nested category structure.  
  - **productCharacteristics:** Array of key product features.  

---

## Example Use Case

A retailer using Algolia needs to automatically categorize their product listings. This Lambda function:  
- Accepts the product record.  
- Predicts the best category and subcategory.  
- Outputs structured data ready for use in Algolia’s Merchandising Studio.  

### Sample Output:
```json
{
  "statusCode": 200,
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "message": "Successfully processed the request",
    "productDetails": {
      "categoryIdentifiers": [
        "Electronics > Smartphones",
        "Electronics"
      ],
      "hierarchicalCategories": {
        "lvl0": "Electronics",
        "lvl1": "Electronics > Smartphones"
      },
      "productCharacteristics": [
        "touch-screen",
        "4G-capable",
        "dual-camera",
        "facial-recognition"
      ]
    }
  }
}

