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

      const ordersBase64 = Buffer.from(ordersBuffer).toString("base64");
      const reportsBase64 = Buffer.from(reportsBuffer).toString("base64");

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
            <div className="text-center">
              <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="font-semibold text-gray-700">Orders XLSX</p>
              <p className="text-sm text-gray-500">Drag and drop or click to select</p>
              {ordersFile && (
                <p className="text-sm text-green-600 mt-2">✓ {ordersFile.name}</p>
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
            <div className="text-center">
              <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="font-semibold text-gray-700">Reports XLSX</p>
              <p className="text-sm text-gray-500">Drag and drop or click to select</p>
              {reportsFile && (
                <p className="text-sm text-green-600 mt-2">✓ {reportsFile.name}</p>
              )}
            </div>
          </label>
        </div>
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={!ordersFile || !reportsFile || loading}
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Upload className="w-5 h-5" />
            Upload and Merge Files
          </>
        )}
      </button>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Upload Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message with Stats */}
      {success && stats && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex gap-3 mb-4">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-900">Upload Successful!</p>
              <p className="text-sm text-green-700">Files merged and system updated</p>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
            <div className="bg-white p-3 rounded border border-green-100">
              <p className="text-xs text-gray-600">Orders Read</p>
              <p className="text-lg font-bold text-green-700">{stats.ordersRowsRead}</p>
            </div>
            <div className="bg-white p-3 rounded border border-green-100">
              <p className="text-xs text-gray-600">Unique Orders</p>
              <p className="text-lg font-bold text-green-700">{stats.ordersUniqueIds}</p>
            </div>
            <div className="bg-white p-3 rounded border border-green-100">
              <p className="text-xs text-gray-600">Reports Read</p>
              <p className="text-lg font-bold text-green-700">{stats.reportsRowsRead}</p>
            </div>
            <div className="bg-white p-3 rounded border border-green-100">
              <p className="text-xs text-gray-600">Reports Used</p>
              <p className="text-lg font-bold text-green-700">{stats.reportRowsUsedLastWins}</p>
            </div>
            <div className="bg-white p-3 rounded border border-green-100">
              <p className="text-xs text-gray-600">Match Coverage</p>
              <p className="text-lg font-bold text-green-700">{stats.coveragePercent.toFixed(1)}%</p>
            </div>
            <div className="bg-white p-3 rounded border border-green-100">
              <p className="text-xs text-gray-600">Final Records</p>
              <p className="text-lg font-bold text-green-700">{stats.outputRows}</p>
            </div>
          </div>

          {/* Direction Breakdown */}
          {Object.keys(stats.directionBreakdown).length > 0 && (
            <div className="mt-4 p-3 bg-white rounded border border-green-100">
              <p className="text-sm font-semibold text-gray-700 mb-2">Direction Breakdown</p>
              <div className="space-y-1">
                {Object.entries(stats.directionBreakdown).map(([direction, count]) => (
                  <div key={direction} className="flex justify-between text-sm">
                    <span className="text-gray-600">{direction}</span>
                    <span className="font-semibold text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Marketplace Distribution */}
          {Object.keys(stats.marketplaceTop10).length > 0 && (
            <div className="mt-4 p-3 bg-white rounded border border-green-100">
              <p className="text-sm font-semibold text-gray-700 mb-2">Top Marketplaces</p>
              <div className="space-y-1">
                {Object.entries(stats.marketplaceTop10)
                  .slice(0, 5)
                  .map(([marketplace, count]) => (
                    <div key={marketplace} className="flex justify-between text-sm">
                      <span className="text-gray-600">{marketplace}</span>
                      <span className="font-semibold text-gray-900">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Quality Checks */}
          {(stats.qualityChecks.badDateRows > 0 ||
            stats.qualityChecks.negativeOrZeroUnits > 0 ||
            stats.qualityChecks.weightAnomalies > 0) && (
            <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-100">
              <p className="text-sm font-semibold text-yellow-900 mb-2">Quality Warnings</p>
              <div className="space-y-1 text-sm">
                {stats.qualityChecks.badDateRows > 0 && (
                  <p className="text-yellow-700">⚠ {stats.qualityChecks.badDateRows} rows with invalid dates</p>
                )}
                {stats.qualityChecks.negativeOrZeroUnits > 0 && (
                  <p className="text-yellow-700">⚠ {stats.qualityChecks.negativeOrZeroUnits} rows with invalid quantities</p>
                )}
                {stats.qualityChecks.weightAnomalies > 0 && (
                  <p className="text-yellow-700">⚠ {stats.qualityChecks.weightAnomalies} rows with weight anomalies</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

