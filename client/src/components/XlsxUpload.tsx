import React, { useState } from "react";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface UploadStats {
  ordersRowsRead: number;
  reportsRowsRead: number;
  ordersUniqueIds: number;
  reportRowsUsedLastWins: number;
  ordersWithReportMatch: number;
  coveragePercent: number;
  outputRows: number;
  directionBreakdown: Record<string, number>;
  marketplaceTop10: Record<string, number>;
  qualityChecks: {
    badDateRows: number;
    negativeOrZeroUnits: number;
    weightAnomalies: number;
  };
}

export function XlsxUpload({ onSuccess }: { onSuccess?: () => void }) {
  const [ordersFile, setOrdersFile] = useState<File | null>(null);
  const [reportsFile, setReportsFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [stats, setStats] = useState<UploadStats | null>(null);

  const uploadMutation = trpc.data.uploadXlsxFiles.useMutation();

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "orders" | "reports"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx")) {
      setError(`${type === "orders" ? "Orders" : "Reports"} file must be .xlsx format`);
      return;
    }

    if (type === "orders") {
      setOrdersFile(file);
    } else {
      setReportsFile(file);
    }
    setError(null);
  };

  // Helper function to convert ArrayBuffer to base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const handleUpload = async () => {
    if (!ordersFile || !reportsFile) {
      setError("Please select both Orders and Reports files");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const ordersBuffer = await ordersFile.arrayBuffer();
      const reportsBuffer = await reportsFile.arrayBuffer();

      // Use btoa for browser-safe base64 encoding
      const ordersBase64 = arrayBufferToBase64(ordersBuffer);
      const reportsBase64 = arrayBufferToBase64(reportsBuffer);

      const result = await uploadMutation.mutateAsync({
        ordersBase64,
        reportsBase64,
      });

      if (result.success) {
        setSuccess(true);
        setStats(result.stats as UploadStats);
        setOrdersFile(null);
        setReportsFile(null);
        
        // Clear file inputs
        const ordersInput = document.getElementById("orders-input") as HTMLInputElement;
        const reportsInput = document.getElementById("reports-input") as HTMLInputElement;
        if (ordersInput) ordersInput.value = "";
        if (reportsInput) reportsInput.value = "";

        onSuccess?.();

        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          setSuccess(false);
        }, 5000);
      } else {
        setError(result.message || "Upload failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      console.error("Upload error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* File Upload Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Orders Upload */}
        <div className="relative">
          <input
            id="orders-input"
            type="file"
            accept=".xlsx"
            onChange={(e) => handleFileSelect(e, "orders")}
            className="hidden"
          />
          <label
            htmlFor="orders-input"
            className={`block p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              ordersFile
                ? "border-green-500 bg-green-50"
                : "border-gray-300 hover:border-blue-400"
            }`}
          >
            <div className="flex flex-col items-center justify-center space-y-2">
              <FileSpreadsheet className="w-8 h-8 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Orders XLSX</span>
              <span className="text-xs text-gray-500">Drag and drop or click to select</span>
              {ordersFile && (
                <span className="text-xs text-green-600 font-semibold">✓ {ordersFile.name}</span>
              )}
            </div>
          </label>
        </div>

        {/* Reports Upload */}
        <div className="relative">
          <input
            id="reports-input"
            type="file"
            accept=".xlsx"
            onChange={(e) => handleFileSelect(e, "reports")}
            className="hidden"
          />
          <label
            htmlFor="reports-input"
            className={`block p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              reportsFile
                ? "border-green-500 bg-green-50"
                : "border-gray-300 hover:border-blue-400"
            }`}
          >
            <div className="flex flex-col items-center justify-center space-y-2">
              <FileSpreadsheet className="w-8 h-8 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Reports XLSX</span>
              <span className="text-xs text-gray-500">Drag and drop or click to select</span>
              {reportsFile && (
                <span className="text-xs text-green-600 font-semibold">✓ {reportsFile.name}</span>
              )}
            </div>
          </label>
        </div>
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={!ordersFile || !reportsFile || loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Upload and Merge Files
          </>
        )}
      </button>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Upload Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && stats && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
          <div className="flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-900">Data uploaded successfully</p>
              <p className="text-sm text-green-700">Files have been merged and data updated</p>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
            <div className="bg-white p-3 rounded border border-green-200">
              <p className="text-xs text-gray-600">Orders Read</p>
              <p className="text-lg font-bold text-gray-900">{stats.ordersRowsRead}</p>
            </div>
            <div className="bg-white p-3 rounded border border-green-200">
              <p className="text-xs text-gray-600">Reports Read</p>
              <p className="text-lg font-bold text-gray-900">{stats.reportsRowsRead}</p>
            </div>
            <div className="bg-white p-3 rounded border border-green-200">
              <p className="text-xs text-gray-600">Coverage</p>
              <p className="text-lg font-bold text-gray-900">{stats.coveragePercent.toFixed(1)}%</p>
            </div>
            <div className="bg-white p-3 rounded border border-green-200">
              <p className="text-xs text-gray-600">Output Rows</p>
              <p className="text-lg font-bold text-gray-900">{stats.outputRows}</p>
            </div>
            <div className="bg-white p-3 rounded border border-green-200">
              <p className="text-xs text-gray-600">Matched</p>
              <p className="text-lg font-bold text-gray-900">{stats.ordersWithReportMatch}</p>
            </div>
            <div className="bg-white p-3 rounded border border-green-200">
              <p className="text-xs text-gray-600">Duplicates Removed</p>
              <p className="text-lg font-bold text-gray-900">{stats.reportRowsUsedLastWins}</p>
            </div>
          </div>

          {/* Direction Breakdown */}
          {Object.keys(stats.directionBreakdown).length > 0 && (
            <div className="mt-4 pt-4 border-t border-green-200">
              <p className="text-sm font-semibold text-gray-900 mb-2">Direction Breakdown:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(stats.directionBreakdown).map(([direction, count]) => (
                  <div key={direction} className="text-xs">
                    <p className="text-gray-600">{direction}</p>
                    <p className="font-bold text-gray-900">{count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quality Checks */}
          {(stats.qualityChecks.badDateRows > 0 ||
            stats.qualityChecks.negativeOrZeroUnits > 0 ||
            stats.qualityChecks.weightAnomalies > 0) && (
            <div className="mt-4 pt-4 border-t border-yellow-200 bg-yellow-50 p-3 rounded">
              <p className="text-sm font-semibold text-yellow-900 mb-2">Quality Warnings:</p>
              <ul className="text-xs text-yellow-800 space-y-1">
                {stats.qualityChecks.badDateRows > 0 && (
                  <li>• {stats.qualityChecks.badDateRows} rows with invalid dates</li>
                )}
                {stats.qualityChecks.negativeOrZeroUnits > 0 && (
                  <li>• {stats.qualityChecks.negativeOrZeroUnits} rows with invalid quantities</li>
                )}
                {stats.qualityChecks.weightAnomalies > 0 && (
                  <li>• {stats.qualityChecks.weightAnomalies} rows with weight anomalies</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

