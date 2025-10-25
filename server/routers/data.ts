import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import Papa from "papaparse";
import fs from "fs";
import path from "path";

// Helper function to merge CSV data
async function mergeCSVData(
  newData: any[]
): Promise<{
  success: boolean;
  message: string;
  recordsAdded: number;
  duplicatesRemoved: number;
  totalRecords: number;
}> {
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
      if (!id || seen.has(id)) {
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

// Validate CSV structure
function validateCSVStructure(data: any[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const requiredColumns = ["Партнер", "Артикул", "Дата заказа", "Направление", "Склад"];

  if (data.length === 0) {
    errors.push("CSV file is empty");
    return { valid: false, errors };
  }

  const firstRow = data[0];
  const columns = Object.keys(firstRow);

  for (const col of requiredColumns) {
    if (!columns.includes(col)) {
      errors.push(`Missing required column: ${col}`);
    }
  }

  // Validate that records have required data
  let validRecordCount = 0;
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const record = data[i];
    if (record["Партнер"] && record["Дата заказа"]) {
      validRecordCount++;
    }
  }

  if (validRecordCount === 0) {
    errors.push("No valid records found. Ensure Partner and Date columns have values.");
  }

  return { valid: errors.length === 0, errors };
}

export const dataRouter = router({
  uploadCSV: protectedProcedure
    .input(z.object({ csvContent: z.string() }))
    .mutation(async ({ input }) => {
      try {
        // Parse CSV
        const parseResult = Papa.parse(input.csvContent, {
          header: true,
          delimiter: ";",
          skipEmptyLines: true,
        });

        const data = parseResult.data || [];

        // Validate structure
        const validation = validateCSVStructure(data);
        if (!validation.valid) {
          return {
            success: false,
            message: `CSV validation failed: ${validation.errors.join(", ")}`,
            errors: validation.errors,
          };
        }

        // Merge with existing data
        const result = await mergeCSVData(data);

        return {
          success: true,
          message: result.message,
          recordsAdded: result.recordsAdded,
          duplicatesRemoved: result.duplicatesRemoved,
          totalRecords: result.totalRecords,
        };
      } catch (error) {
        console.error("Upload error:", error);
        return {
          success: false,
          message: `Error processing CSV file: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    }),
});

