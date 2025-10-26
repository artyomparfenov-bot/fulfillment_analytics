import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataUpload from "@/components/DataUpload";
import { XlsxUpload } from "@/components/XlsxUpload";
import { Database, RefreshCw, FileSpreadsheet } from "lucide-react";

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

      {/* XLSX Upload Card */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-400" />
            📊 Загрузка Raw XLSX (Orders + Reports)
          </CardTitle>
          <CardDescription>
            Загружайте исходные файлы прямо из системы. Система автоматически объединит их по ID заказа.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <XlsxUpload onSuccess={() => window.location.reload()} />
        </CardContent>
      </Card>

      {/* XLSX Requirements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="text-lg">📋 Orders XLSX должен содержать колонки:</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>• Партнер</p>
            <p>• ID заказа</p>
            <p>• Тип заказа</p>
            <p>• Товаров</p>
            <p>• Общий вес</p>
            <p>• Склад</p>
            <p>• Статус</p>
            <p>• Дата заказа</p>
          </CardContent>
        </Card>

        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader>
            <CardTitle className="text-lg">📊 Reports XLSX должен содержать колонки:</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>• ID заказа</p>
            <p>• Площадка</p>
            <p>• Артикул</p>
            <p>• Вес</p>
            <p>• Кол-во</p>
            <p>• Склад</p>
            <p>• Статус</p>
            <p>• Дата заказа</p>
          </CardContent>
        </Card>
      </div>

      {/* XLSX Features */}
      <Card className="border-purple-500/20 bg-purple-500/5">
        <CardHeader>
          <CardTitle className="text-lg">✨ Возможности системы</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-green-500 font-bold">✓</span>
            <span>Автоматическое обнаружение типа файла (Orders или Reports)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 font-bold">✓</span>
            <span>Интеллектуальная дедупликация по ID заказа (last-wins)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 font-bold">✓</span>
            <span>Полное слияние Orders + Reports с обогащением данных</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 font-bold">✓</span>
            <span>Автоматический расчёт направления (Почта vs Express/FBS)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 font-bold">✓</span>
            <span>Нормализация маркетплейсов (OZON, Wildberries, YandexMarket)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 font-bold">✓</span>
            <span>Валидация данных и проверка качества</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 font-bold">✓</span>
            <span>Пересчёт всех метрик в реальном времени</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 font-bold">✓</span>
            <span>Подробная статистика по обработке файлов</span>
          </div>
        </CardContent>
      </Card>

      {/* Quality Checks */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="text-lg">🔍 Проверки качества данных</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Система автоматически проверяет:</p>
          <div className="space-y-1 ml-4">
            <p>• Наличие обязательных колонок</p>
            <p>• Корректность формата дат</p>
            <p>• Наличие ID заказа (обязательное поле)</p>
            <p>• Отрицательные или нулевые значения количества</p>
            <p>• Аномалии в значениях веса</p>
            <p>• Процент покрытия (сколько заказов имеют данные из Reports)</p>
          </div>
        </CardContent>
      </Card>

      {/* CSV Upload Card (Legacy) */}
      <Card className="border-purple-500/20 bg-purple-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-purple-400" />
            📄 Загрузка Merged CSV (устаревший способ)
          </CardTitle>
          <CardDescription>
            Для загрузки уже объединённых CSV файлов. Рекомендуется использовать XLSX загрузку выше.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataUpload />
        </CardContent>
      </Card>

      {/* Process Description */}
      <Card className="border-indigo-500/20 bg-indigo-500/5">
        <CardHeader>
          <CardTitle className="text-lg">🔄 Процесс обработки данных</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">1</div>
              <div>
                <p className="font-semibold">Парсинг XLSX файлов</p>
                <p className="text-sm text-gray-600">Система обнаруживает тип файла (Orders или Reports) и нормализует колонки</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">2</div>
              <div>
                <p className="font-semibold">Дедупликация</p>
                <p className="text-sm text-gray-600">Удаляются дубликаты по ID заказа (сохраняется последняя версия)</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">3</div>
              <div>
                <p className="font-semibold">Слияние Orders + Reports</p>
                <p className="text-sm text-gray-600">Left join по ID заказа, обогащение данных из Reports</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">4</div>
              <div>
                <p className="font-semibold">Трансформация данных</p>
                <p className="text-sm text-gray-600">Нормализация типов, расчёт направления, маркетплейса, добавление timestamp</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">5</div>
              <div>
                <p className="font-semibold">Обновление системы</p>
                <p className="text-sm text-gray-600">Слияние с существующими данными и пересчёт всех метрик</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

