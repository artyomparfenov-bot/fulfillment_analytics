import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import Papa from "papaparse";
import fs from "fs";
import path from "path";
import { mergeXlsxFiles } from "../services/xlsxMergeService";

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
  uploadXlsxFiles: protectedProcedure
    .input(
      z.object({
        ordersBase64: z.string(),
        reportsBase64: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const tempDir = path.join(process.cwd(), "temp");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const ordersPath = path.join(tempDir, `orders_${Date.now()}.xlsx`);
      const reportsPath = path.join(tempDir, `reports_${Date.now()}.xlsx`);

      try {
        // Validate base64 input
        if (!input.ordersBase64 || input.ordersBase64.length === 0) {
          return {
            success: false,
            message: "Orders file is empty",
            error: "Orders file is empty",
          };
        }
        if (!input.reportsBase64 || input.reportsBase64.length === 0) {
          return {
            success: false,
            message: "Reports file is empty",
            error: "Reports file is empty",
          };
        }

        console.log(`[Data Router] Writing Orders file: ${ordersPath}`);
        console.log(`[Data Router] Orders base64 length: ${input.ordersBase64.length}`);
        
        // Write base64 files to disk
        try {
          fs.writeFileSync(ordersPath, Buffer.from(input.ordersBase64, "base64"));
        } catch (writeError) {
          console.error(`[Data Router] Failed to write Orders file:`, writeError);
          return {
            success: false,
            message: `Failed to write Orders file: ${writeError instanceof Error ? writeError.message : "Unknown error"}`,
            error: writeError instanceof Error ? writeError.message : "Unknown error",
          };
        }
        
        console.log(`[Data Router] Writing Reports file: ${reportsPath}`);
        console.log(`[Data Router] Reports base64 length: ${input.reportsBase64.length}`);
        
        try {
          fs.writeFileSync(reportsPath, Buffer.from(input.reportsBase64, "base64"));
        } catch (writeError) {
          console.error(`[Data Router] Failed to write Reports file:`, writeError);
          return {
            success: false,
            message: `Failed to write Reports file: ${writeError instanceof Error ? writeError.message : "Unknown error"}`,
            error: writeError instanceof Error ? writeError.message : "Unknown error",
          };
        }

        // Merge XLSX files
        console.log(`[Data Router] Starting XLSX merge...`);
        const mergeResult = mergeXlsxFiles(ordersPath, reportsPath);
        console.log(`[Data Router] XLSX merge result:`, { success: mergeResult.success, error: mergeResult.error });

        if (!mergeResult.success) {
          return {
            success: false,
            message: `XLSX merge failed: ${mergeResult.error}`,
            error: mergeResult.error,
          };
        }

        // Merge with existing data
        const result = await mergeCSVData(mergeResult.mergedData);

        return {
          success: true,
          message: result.message,
          recordsAdded: result.recordsAdded,
          duplicatesRemoved: result.duplicatesRemoved,
          totalRecords: result.totalRecords,
          stats: mergeResult.stats,
        };
      } catch (error) {
        console.error("[Data Router] XLSX merge upload error:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          message: `Error processing XLSX files: ${errorMessage}`,
          error: errorMessage,
        };
      } finally {
        // Cleanup temp files
        try {
          fs.unlinkSync(ordersPath);
          fs.unlinkSync(reportsPath);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }),

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

