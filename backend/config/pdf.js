import { PDFParse } from "pdf-parse";

// Extract plain text from a PDF held in memory (multer memoryStorage).
const extractText = async (buffer) => {
  try {
    const pdf = new PDFParse({ data: buffer });
    const result = await pdf.getText();
    await pdf.destroy?.();
    return result.text || "";
  } catch (error) {
    console.error("PDF Parsing Error:", error);
    throw new Error("Failed to extract text from PDF: " + error.message);
  }
};

export default extractText;
