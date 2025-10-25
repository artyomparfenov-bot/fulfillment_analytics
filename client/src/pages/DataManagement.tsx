import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataUpload from "@/components/DataUpload";
import { Database, RefreshCw } from "lucide-react";

export default function DataManagement() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Database className="w-8 h-8 text-purple-400" />
          Управление данными
        </h1>
        <p className="text-muted-foreground mt-2">
          Загрузите новые данные заказов для обновления аналитики
        </p>
      </div>

      {/* Upload Card */}
      <Card className="border-purple-500/20 bg-purple-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-purple-400" />
            Загрузка CSV файла
          </CardTitle>
          <CardDescription>
            Выберите файл с новыми заказами для автоматического обновления системы
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataUpload />
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="text-lg">Формат файла</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-semibold">Разделитель:</span> точка с запятой (;)
            </p>
            <p>
              <span className="font-semibold">Кодировка:</span> UTF-8
            </p>
            <p>
              <span className="font-semibold">Расширение:</span> .csv
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader>
            <CardTitle className="text-lg">Обязательные колонки</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>• Партнер</p>
            <p>• Артикул</p>
            <p>• Дата заказа</p>
            <p>• Направление</p>
            <p>• Склад</p>
          </CardContent>
        </Card>
      </div>

      {/* Features Card */}
      <Card className="border-purple-500/20 bg-purple-500/5">
        <CardHeader>
          <CardTitle className="text-lg">Возможности загрузки</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-green-500 font-bold">✓</span>
            <span>Автоматическая дедупликация по ID заказа</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 font-bold">✓</span>
            <span>Валидация структуры файла перед загрузкой</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 font-bold">✓</span>
            <span>Пересчёт всех метрик в реальном времени</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 font-bold">✓</span>
            <span>Поддержка drag-and-drop интерфейса</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 font-bold">✓</span>
            <span>Подробный отчёт о результатах загрузки</span>
          </div>
        </CardContent>
      </Card>

      {/* Example Card */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="text-lg">Пример структуры файла</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="bg-black/30 p-3 rounded font-mono text-xs overflow-x-auto">
            <pre>{`Партнер;Артикул;Дата заказа;Направление;Склад
Партнер1;SKU001;2025-01-15;Express/FBS;Москва
Партнер2;SKU002;2025-01-16;VSROK;Санкт-Петербург
Партнер3;SKU003;2025-01-17;Ярославка;Казань`}</pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

