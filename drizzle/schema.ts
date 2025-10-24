import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Alerts table for storing anomalies and signals detected in partner/SKU data
 */
export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  partnerId: varchar("partnerId", { length: 255 }).notNull(),
  skuId: varchar("skuId", { length: 255 }),
  alertType: mysqlEnum("alertType", [
    "order_decline",
    "churn_risk",
    "volatility_spike",
    "warehouse_anomaly",
    "sku_churn",
    "concentration_risk"
  ]).notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).notNull(),
  timeframe: mysqlEnum("timeframe", ["7d", "30d"]).notNull(),
  message: text("message").notNull(),
  benchmarkValue: varchar("benchmarkValue", { length: 255 }),
  currentValue: varchar("currentValue", { length: 255 }),
  percentageChange: varchar("percentageChange", { length: 50 }),
  direction: varchar("direction", { length: 10 }),
  isResolved: int("isResolved").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

/**
 * Benchmarks table for storing historical metrics used for comparison
 */
export const benchmarks = mysqlTable("benchmarks", {
  id: int("id").autoincrement().primaryKey(),
  partnerId: varchar("partnerId", { length: 255 }).notNull(),
  skuId: varchar("skuId", { length: 255 }),
  metricType: mysqlEnum("metricType", [
    "avg_orders_per_day",
    "order_interval",
    "volatility",
    "warehouse_count",
    "sku_count",
    "orders_per_sku"
  ]).notNull(),
  period: mysqlEnum("period", ["7d", "30d", "90d", "all"]).notNull(),
  value: varchar("value", { length: 255 }).notNull(),
  direction: varchar("direction", { length: 10 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Benchmark = typeof benchmarks.$inferSelect;
export type InsertBenchmark = typeof benchmarks.$inferInsert;

