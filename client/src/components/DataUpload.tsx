import React, { useState, useRef } from "react";
import { Upload, AlertCircle, CheckCircle, Loader } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface UploadResult {
  success: boolean;
  message: string;
  recordsAdded?: number;
  duplicatesRemoved?: number;
  totalRecords?: number;
  errors?: string[];
}

export default function DataUpload({
  onUploadSuccess,
}: {
  onUploadSuccess?: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = trpc.data.uploadCSV.useMutation();

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setResult({
        success: false,
        message: "Please select a CSV file",
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const content = await file.text();
      const response = await uploadMutation.mutateAsync({
        csvContent: content,
      });

      setResult(response);

      if (response.success && onUploadSuccess) {
        // Trigger page refresh after successful upload
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (error) {
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-purple-500 bg-purple-500/10"
            : "border-purple-300 hover:border-purple-400 bg-purple-500/5"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isLoading}
        />

        <div className="flex flex-col items-center gap-3">
          {isLoading ? (
            <Loader className="w-8 h-8 text-purple-400 animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-purple-400" />
          )}
          <div>
            <p className="font-semibold text-foreground">
              {isLoading ? "Загрузка..." : "Перетащите CSV файл сюда"}
            </p>
            <p className="text-sm text-muted-foreground">
              или нажмите для выбора файла
            </p>
          </div>
        </div>
      </div>

      {/* Result Message */}
      {result && (
        <div
          className={`mt-4 p-4 rounded-lg border ${
            result.success
              ? "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400"
              : "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400"
          }`}
        >
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className="font-semibold">{result.message}</p>
              {result.success && (
                <div className="mt-2 text-sm space-y-1">
                  <p>✓ Добавлено записей: {result.recordsAdded}</p>
                  <p>✓ Удалено дубликатов: {result.duplicatesRemoved}</p>
                  <p>✓ Всего записей в системе: {result.totalRecords}</p>
                  <p className="text-xs mt-2 opacity-75">
                    Страница обновится через несколько секунд...
                  </p>
                </div>
              )}
              {result.errors && result.errors.length > 0 && (
                <ul className="mt-2 text-sm space-y-1">
                  {result.errors.map((error, idx) => (
                    <li key={idx}>• {error}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-6 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
        <p className="font-semibold mb-2">Требования к файлу:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Формат: CSV с разделителем &quot;;&quot;</li>
          <li>Обязательные колонки: Партнер, Артикул, Дата заказа, Направление, Склад</li>
          <li>Кодировка: UTF-8</li>
          <li>Автоматическая дедупликация по ID заказа</li>
        </ul>
      </div>
    </div>
  );
}

