import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, AlertCircle, CheckCircle, Zap } from "lucide-react";
import type { PartnerEnrichment } from "@/lib/enrichmentMetrics";

interface PartnerEnrichmentCardProps {
  partner: string;
  metrics: PartnerEnrichment;
}

export function PartnerEnrichmentCard({ partner, metrics }: PartnerEnrichmentCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getRiskColor = (risk: number) => {
    if (risk <= 30) return "text-green-500";
    if (risk <= 60) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <Card className="border-purple-500/20 bg-purple-500/5">
      <CardHeader>
        <CardTitle className="text-lg">{partner}</CardTitle>
        <CardDescription>Enriched metrics and performance indicators</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Performance Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-black/20 p-3 rounded">
            <p className="text-xs text-gray-400">Orders</p>
            <p className="text-lg font-bold text-white">{metrics.orderCount}</p>
          </div>
          <div className="bg-black/20 p-3 rounded">
            <p className="text-xs text-gray-400">Avg Items</p>
            <p className="text-lg font-bold text-white">{metrics.avgItemsPerOrder.toFixed(1)}</p>
          </div>
          <div className="bg-black/20 p-3 rounded">
            <p className="text-xs text-gray-400">Unique SKUs</p>
            <p className="text-lg font-bold text-white">{metrics.uniqueSkus}</p>
          </div>
          <div className="bg-black/20 p-3 rounded">
            <p className="text-xs text-gray-400">Avg Weight</p>
            <p className="text-lg font-bold text-white">{metrics.avgWeightPerOrder.toFixed(1)}kg</p>
          </div>
        </div>

        {/* Preference Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded">
            <p className="text-xs text-gray-400">Direction Preference</p>
            <p className="text-sm font-semibold text-blue-400">{metrics.directionPreference || "N/A"}</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 p-3 rounded">
            <p className="text-xs text-gray-400">Marketplace Preference</p>
            <p className="text-sm font-semibold text-green-400">{metrics.marketplacePreference || "N/A"}</p>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded">
            <p className="text-xs text-gray-400">Warehouse Preference</p>
            <p className="text-sm font-semibold text-purple-400">{metrics.warehousePreference || "N/A"}</p>
          </div>
        </div>

        {/* Score Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">Fulfillment Score</p>
              <Zap className={`w-4 h-4 ${getScoreColor(metrics.fulfillmentScore)}`} />
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${metrics.fulfillmentScore}%` }}
              />
            </div>
            <p className={`text-sm font-bold ${getScoreColor(metrics.fulfillmentScore)}`}>
              {metrics.fulfillmentScore}/100
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">Diversification</p>
              <TrendingUp className={`w-4 h-4 ${getScoreColor(metrics.diversificationScore)}`} />
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                style={{ width: `${metrics.diversificationScore}%` }}
              />
            </div>
            <p className={`text-sm font-bold ${getScoreColor(metrics.diversificationScore)}`}>
              {metrics.diversificationScore}/100
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">Concentration Risk</p>
              <AlertCircle className={`w-4 h-4 ${getRiskColor(metrics.concentrationRisk)}`} />
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full transition-all"
                style={{ width: `${metrics.concentrationRisk}%` }}
              />
            </div>
            <p className={`text-sm font-bold ${getRiskColor(metrics.concentrationRisk)}`}>
              {metrics.concentrationRisk}/100
            </p>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-700">
          <div>
            <p className="text-xs text-gray-400">Order Frequency</p>
            <p className="text-sm font-semibold text-white">{metrics.orderFrequency.toFixed(2)} orders/day</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">SKU per Order</p>
            <p className="text-sm font-semibold text-white">{metrics.skuPerOrder.toFixed(2)}</p>
          </div>
        </div>

        {/* Insights */}
        <div className="space-y-2 pt-2 border-t border-gray-700">
          <p className="text-xs font-semibold text-gray-300">Insights:</p>
          <ul className="text-xs text-gray-400 space-y-1">
            {metrics.fulfillmentScore >= 80 && (
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                <span>High fulfillment efficiency</span>
              </li>
            )}
            {metrics.concentrationRisk >= 70 && (
              <li className="flex items-start gap-2">
                <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0 mt-0.5" />
                <span>High concentration risk - consider diversification</span>
              </li>
            )}
            {metrics.orderFrequency > 5 && (
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Very active partner with high order frequency</span>
              </li>
            )}
            {metrics.uniqueSkus > 50 && (
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Wide product range with {metrics.uniqueSkus} unique SKUs</span>
              </li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

