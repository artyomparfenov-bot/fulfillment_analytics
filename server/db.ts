import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, alerts, benchmarks, InsertAlert, InsertBenchmark } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Alert queries
export async function createAlert(alert: InsertAlert): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create alert: database not available");
    return;
  }

  try {
    await db.insert(alerts).values(alert);
  } catch (error) {
    console.error("[Database] Failed to create alert:", error);
    throw error;
  }
}

export async function getAlertsByPartner(partnerId: string, limit = 50) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get alerts: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(alerts)
      .where(eq(alerts.partnerId, partnerId))
      .orderBy(desc(alerts.createdAt))
      .limit(limit);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get alerts:", error);
    return [];
  }
}

export async function getUnresolvedAlerts(limit = 100) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get alerts: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(alerts)
      .where(eq(alerts.isResolved, 0))
      .orderBy(desc(alerts.createdAt))
      .limit(limit);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get unresolved alerts:", error);
    return [];
  }
}

export async function resolveAlert(alertId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot resolve alert: database not available");
    return;
  }

  try {
    await db
      .update(alerts)
      .set({ isResolved: 1, updatedAt: new Date() })
      .where(eq(alerts.id, alertId));
  } catch (error) {
    console.error("[Database] Failed to resolve alert:", error);
    throw error;
  }
}

// Benchmark queries
export async function upsertBenchmark(benchmark: InsertBenchmark): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert benchmark: database not available");
    return;
  }

  try {
    await db.insert(benchmarks).values(benchmark).onDuplicateKeyUpdate({
      set: {
        value: benchmark.value,
        direction: benchmark.direction,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("[Database] Failed to upsert benchmark:", error);
    throw error;
  }
}

export async function getBenchmarksByPartner(partnerId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get benchmarks: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(benchmarks)
      .where(eq(benchmarks.partnerId, partnerId));
    return result;
  } catch (error) {
    console.error("[Database] Failed to get benchmarks:", error);
    return [];
  }
}

