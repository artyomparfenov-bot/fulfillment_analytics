import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import Papa from "papaparse";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Helper function to merge CSV data
async function mergeCSVData(newData: any[]): Promise<{ success: boolean; message: string; recordsAdded: number; duplicatesRemoved: number; totalRecords: number }> {
  const dataPath = path.join(process.cwd(), "client", "public", "data_merged.csv");
  
  try {
    // Read existing data
    let existingData: any[] = [];
    if (fs.existsSync(dataPath)) {
      const existingContent = fs.readFileSync(dataPath, "utf-8");
      const parseResult = Papa.parse(existingContent, {
        header: true,
        delimiter: ";",
        skipEmptyLines: true,
      });
      existingData = parseResult.data || [];
    }

    // Combine data
    const combined = [...existingData, ...newData];
    
    // Deduplicate by ID заказа
    const seen = new Set<string>();
    const deduplicated = combined.filter((row: any) => {
      const id = row["ID заказа"];
      if (seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    });

    const duplicatesRemoved = combined.length - deduplicated.length;
    const recordsAdded = newData.length;
    const totalRecords = deduplicated.length;

    // Save merged data
    const csv = Papa.unparse(deduplicated, { delimiter: ";" });
    fs.writeFileSync(dataPath, csv, "utf-8");

    return {
      success: true,
      message: `Data uploaded successfully. Added ${recordsAdded} records, removed ${duplicatesRemoved} duplicates.`,
      recordsAdded,
      duplicatesRemoved,
      totalRecords,
    };
  } catch (error) {
    console.error("Error merging CSV data:", error);
    throw error;
  }
}

// POST endpoint for CSV upload
router.post("/upload-csv", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }

    // Parse CSV file
    const csvContent = req.file.buffer.toString("utf-8");
    const parseResult = Papa.parse(csvContent, {
      header: true,
      delimiter: ";",
      skipEmptyLines: true,
    });

    if (!parseResult.data || parseResult.data.length === 0) {
      return res.status(400).json({ success: false, message: "CSV file is empty" });
    }

    // Merge with existing data
    const result = await mergeCSVData(parseResult.data);

    res.json(result);
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ success: false, message: "Error processing CSV file" });
  }
});

export default router;

