import fs from "fs";
import { PDFParse } from "pdf-parse";

const extractText = async (filePath) => {
  try {
    const buffer = fs.readFileSync(filePath);
    const pdf = new PDFParse({ data: buffer });
    const result = await pdf.getText();
    return result.text || "";
  } catch (error) {
    console.error("PDF Parsing Error:", error);
    throw new Error("Failed to extract text from PDF: " + error.message);
  }
};

export default extractText;
