// collectibles-prod/utils/inventory.js
const validationRules = {
  "Pokémon": {
    attributes: { required: ["set", "series", "number", "rarity", "language"], optional: [] },
    condition: { required: ["type"] } // e.g., "Raw", "Graded", "Near Mint"
  },
  "Video Games": {
    attributes: { required: ["platform", "region"], optional: ["edition"] },
    condition: { required: ["type"] } // e.g., "CIB", "Loose", "No Manual"
  },
  "Comics": {
    attributes: { required: ["title", "issue", "publisher"], optional: ["variant", "year"] },
    condition: { required: ["type"] } // e.g., "Raw", "Graded", "Fine"
  },
  "Football Jerseys": {
    attributes: { required: ["team", "season", "size"], optional: ["player", "signed"] },
    condition: { required: ["type"] } // e.g., "Worn", "New"
  },
  "GAA Jerseys": {
    attributes: { required: ["county", "year", "size"], optional: ["player", "signed"] },
    condition: { required: ["type"] } // e.g., "Worn", "New"
  },
  "Coins": {
    attributes: { required: ["denomination", "year", "country"], optional: ["metal", "mint_mark"] },
    condition: { required: ["type"] } // e.g., "Circulated", "Uncirculated"
  },
  "Video Game Consoles": {
    attributes: { required: ["model", "region"], optional: ["edition", "serial_number"] },
    condition: { required: ["type"] } // e.g., "Loose", "Boxed"
  },
  "Electronics": {
    attributes: { required: ["type", "brand", "model"], optional: ["year"] },
    condition: { required: ["type"] } // e.g., "Used", "New"
  },
  "Other TCGs": {
    attributes: { required: ["game", "set", "number", "rarity"], optional: ["language"] },
    condition: { required: ["type"] } // e.g., "Raw", "Graded"
  },
  "Sports Cards": {
    attributes: { required: ["sport", "player", "year", "brand"], optional: ["card_number"] },
    condition: { required: ["type"] } // e.g., "Raw", "Graded"
  }
};

function validateInventoryItem(item) {
  const rules = validationRules[item.category];
  if (!rules) throw new Error(`Unknown category: ${item.category}`);

  // Validate attributes
  const attrRules = rules.attributes;
  const missingAttrs = attrRules.required.filter(key => !(key in item.attributes));
  if (missingAttrs.length > 0) throw new Error(`Missing required attributes: ${missingAttrs}`);
  const invalidAttrs = Object.keys(item.attributes).filter(
    key => !attrRules.required.includes(key) && !attrRules.optional.includes(key)
  );
  if (invalidAttrs.length > 0) throw new Error(`Invalid attributes: ${invalidAttrs}`);

  // Validate condition (single string)
  const condRules = rules.condition;
  if (!item.condition || typeof item.condition !== 'string') {
    throw new Error('Condition is required and must be a string');
  }

  // Validate condition_history
  if (!Array.isArray(item.condition_history)) {
    throw new Error('Condition history must be an array');
  }
  item.condition_history.forEach((entry, index) => {
    if (!entry.type || typeof entry.type !== 'string') {
      throw new Error(`Condition history entry at ${index} must have a string type`);
    }
    if (!entry.date || typeof entry.date !== 'string') {
      throw new Error(`Condition history entry at ${index} must have a date`);
    }
  });

  return true;
}

module.exports = { validateInventoryItem, validationRules };