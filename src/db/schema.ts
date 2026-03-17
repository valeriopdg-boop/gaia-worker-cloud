import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer
} from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(), // "worker" | "impresa"
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const enterprises = pgTable("enterprises", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(),
  vatCode: text("vat_code").notNull(),
  sector: text("sector"),
  isPublic: boolean("is_public").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const workers = pgTable("workers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  taxCode: text("tax_code"),
  phone: text("phone"),
  digitalIdentityVerified: boolean("digital_identity_verified").notNull().default(false),
  searchableByEnterprises: boolean("searchable_by_enterprises").notNull().default(false),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const workerClouds = pgTable("worker_clouds", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  workerId: uuid("worker_id").references(() => workers.id).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  workerCloudId: uuid("worker_cloud_id").references(() => workerClouds.id),
  title: text("title"),
  docType: text("doc_type"),
  status: text("status").notNull().default("valid"),
  sharedWithEnterprise: boolean("shared_with_enterprise").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const workerArchiveDocuments = pgTable("worker_archive_documents", {
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  workerId: uuid("worker_id").references(() => workers.id).notNull(),
  documentId: uuid("document_id").references(() => documents.id).notNull()
});

export const workerConnections = pgTable("worker_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  workerId: uuid("worker_id").references(() => workers.id).notNull(),
  enterpriseId: uuid("enterprise_id").references(() => enterprises.id).notNull(),
  status: text("status").notNull().default("pending"), // pending | accepted | revoked
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
