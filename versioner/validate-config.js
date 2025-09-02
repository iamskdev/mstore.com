const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "versioner.json");

try {
  const raw = fs.readFileSync(filePath, "utf-8");
  JSON.parse(raw);
  console.log("✅ versioner.json is valid JSON");
} catch (err) {
  console.error("❌ Invalid JSON in versioner.json");
  console.error(err.message);
}