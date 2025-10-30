import { sql, relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Room status enum
export const roomStatusEnum = pgEnum("room_status", [
  "available",
  "occupied",
  "cooldown",
  "maintenance"
]);

// Booking status enum
export const bookingStatusEnum = pgEnum("booking_status", [
  "confirmed",
  "in_progress", 
  "completed",
  "cancelled",
  "no_show"
]);

// Booking position enum (효소통 내 위치)
export const bookingPositionEnum = pgEnum("booking_position", [
  "shoulder",  // 어깨 위치
  "leg"        // 다리 위치
]);

// Pass type enum
export const passTypeEnum = pgEnum("pass_type", [
  "day_pass",
  "membership"
]);

// Lifecycle stage enum (효소통 생명주기)
export const lifecycleStageEnum = pgEnum("lifecycle_stage", [
  "birth",      // 탄생
  "growth",     // 성장
  "peak",       // 절정
  "decline",    // 노화
  "rebirth"     // 환생
]);

// Alert severity enum
export const alertSeverityEnum = pgEnum("alert_severity", [
  "info",
  "warning",
  "critical"
]);

// Safety checklist category enum
export const safetyChecklistCategoryEnum = pgEnum("safety_checklist_category", [
  "hygiene",      // 위생
  "environment",  // 환경
  "safety",       // 안전
  "emergency"     // 응급
]);

// Knowledge article category enum
export const knowledgeCategoryEnum = pgEnum("knowledge_category", [
  "research",     // 연구 논문 및 과학적 근거
  "benefits",     // 효과 및 이점
  "safety_guide", // 안전 주의사항
  "usage_guide",  // 이용 방법
  "faq"           // 자주 묻는 질문
]);

// Quote status enum
export const quoteStatusEnum = pgEnum("quote_status", ["draft", "sent", "accepted", "rejected", "expired"]);

// Contract status enum
export const contractStatusEnum = pgEnum("contract_status", ["draft", "active", "completed", "cancelled"]);

// Payment status enum
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "completed", "failed", "refunded"]);

// Rooms table
export const rooms = pgTable("rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  capacity: integer("capacity").notNull().default(2),
  width: integer("width").notNull().default(130), // 가로 (cm)
  length: integer("length").notNull().default(360), // 세로 (cm)
  height: integer("height").notNull().default(72), // 높이 (cm)
  status: roomStatusEnum("status").notNull().default("available"),
  lastUsedAt: timestamp("last_used_at"),
  cooldownUntil: timestamp("cooldown_until"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customers table
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  pin: varchar("pin", { length: 4 }).notNull(), // 초기: 휴대폰 뒷자리 4자리
  carNumber: varchar("car_number", { length: 20 }), // 차량번호
  email: varchar("email"),
  qrCode: varchar("qr_code").unique(),
  nfcCode: varchar("nfc_code").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customer passes table
export const customerPasses = pgTable("customer_passes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  passType: passTypeEnum("pass_type").notNull(),
  totalSessions: integer("total_sessions").notNull(),
  remainingSessions: integer("remaining_sessions").notNull(),
  purchasePrice: integer("purchase_price").notNull(), // in Korean won
  purchasedAt: timestamp("purchased_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bookings table
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  roomId: varchar("room_id").notNull().references(() => rooms.id),
  passId: varchar("pass_id").references(() => customerPasses.id),
  position: bookingPositionEnum("position").notNull().default("shoulder"), // 효소통 내 위치
  status: bookingStatusEnum("status").notNull().default("confirmed"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  price: integer("price").notNull(), // in Korean won
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Usage history table
export const usageHistory = pgTable("usage_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  roomId: varchar("room_id").notNull().references(() => rooms.id),
  bookingId: varchar("booking_id").notNull().references(() => bookings.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  duration: integer("duration").notNull(), // in minutes
  createdAt: timestamp("created_at").defaultNow(),
});

// Sensor readings table (센서 측정 데이터)
export const sensorReadings = pgTable("sensor_readings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => rooms.id),
  temperature: integer("temperature").notNull(), // in celsius * 10 (e.g., 456 = 45.6°C)
  humidity: integer("humidity").notNull(), // in percentage * 10 (e.g., 678 = 67.8%)
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => [
  index("idx_sensor_readings_room_time").on(table.roomId, table.timestamp),
]);

// Room lifecycle tracking (효소통 생명주기 추적)
export const roomLifecycle = pgTable("room_lifecycle", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().unique().references(() => rooms.id),
  currentStage: lifecycleStageEnum("current_stage").notNull().default("birth"),
  stageStartedAt: timestamp("stage_started_at").notNull().defaultNow(),
  estimatedNextStageAt: timestamp("estimated_next_stage_at"),
  cycleCount: integer("cycle_count").notNull().default(0), // 순환 횟수
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sensor alerts table (센서 알림)
export const sensorAlerts = pgTable("sensor_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => rooms.id),
  severity: alertSeverityEnum("severity").notNull(),
  alertType: varchar("alert_type", { length: 50 }).notNull(), // e.g., "high_temperature", "low_humidity"
  message: text("message").notNull(),
  temperature: integer("temperature"), // snapshot at alert time
  humidity: integer("humidity"), // snapshot at alert time
  isDismissed: boolean("is_dismissed").notNull().default(false),
  dismissedAt: timestamp("dismissed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_sensor_alerts_room").on(table.roomId),
  index("idx_sensor_alerts_severity").on(table.severity),
]);

// Safety checklist items table (master list of checklist items)
export const safetyChecklistItems = pgTable("safety_checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: safetyChecklistCategoryEnum("category").notNull(),
  itemName: varchar("item_name", { length: 200 }).notNull(),
  description: text("description"),
  frequency: varchar("frequency", { length: 50 }).notNull(), // e.g., "daily", "weekly", "monthly"
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Safety check records table (actual check records)
export const safetyCheckRecords = pgTable("safety_check_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  checklistItemId: varchar("checklist_item_id").notNull().references(() => safetyChecklistItems.id),
  checkedBy: varchar("checked_by").notNull(), // user name or ID
  checkedAt: timestamp("checked_at").defaultNow(),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).notNull().default("completed"), // "completed", "skipped", "issue_found"
}, (table) => [
  index("idx_safety_records_item").on(table.checklistItemId),
  index("idx_safety_records_date").on(table.checkedAt),
]);

// Customer journals table (효소 일지)
export const customerJournals = pgTable("customer_journals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  date: timestamp("date").notNull().defaultNow(), // 일지 날짜
  title: varchar("title", { length: 200 }), // 제목 (선택)
  content: text("content").notNull(), // 일지 내용
  photos: text("photos").array(), // 사진 URL 배열
  mood: varchar("mood", { length: 50 }), // 기분 (선택: 좋음, 보통, 피곤함 등)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_customer_journals_customer").on(table.customerId),
  index("idx_customer_journals_date").on(table.date),
]);

// Knowledge articles table (효소욕 인사이트 센터)
export const knowledgeArticles = pgTable("knowledge_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: knowledgeCategoryEnum("category").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  content: text("content").notNull(),
  summary: text("summary"), // 짧은 요약
  order: integer("order").notNull().default(0), // 정렬 순서
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_knowledge_category").on(table.category),
  index("idx_knowledge_published").on(table.isPublished),
  index("idx_knowledge_order").on(table.order),
]);

// Quotes table (견적서)
export const quotes = pgTable("quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  quoteNumber: varchar("quote_number", { length: 50 }).notNull().unique(), // 견적서 번호 (예: Q-2025-001)
  title: varchar("title", { length: 200 }).notNull(), // 견적서 제목
  items: text("items").notNull(), // JSON 형태의 견적 항목들 [{name, quantity, unitPrice, amount}]
  subtotal: integer("subtotal").notNull(), // 소계
  taxAmount: integer("tax_amount").notNull().default(0), // 세금
  discountAmount: integer("discount_amount").notNull().default(0), // 할인액
  totalAmount: integer("total_amount").notNull(), // 최종 금액
  status: quoteStatusEnum("status").notNull().default("draft"),
  validUntil: timestamp("valid_until").notNull(), // 유효기한
  notes: text("notes"), // 특이사항
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_quotes_customer").on(table.customerId),
  index("idx_quotes_number").on(table.quoteNumber),
  index("idx_quotes_status").on(table.status),
]);

// Contracts table (계약서)
export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  quoteId: varchar("quote_id").references(() => quotes.id), // 연결된 견적서 (선택)
  contractNumber: varchar("contract_number", { length: 50 }).notNull().unique(), // 계약서 번호 (예: C-2025-001)
  title: varchar("title", { length: 200 }).notNull(), // 계약 제목
  serviceType: varchar("service_type", { length: 100 }).notNull(), // 서비스 종류 (예: 1개월 이용권, 3개월 이용권 등)
  terms: text("terms").notNull(), // 계약 조건 및 약관
  startDate: timestamp("start_date").notNull(), // 계약 시작일
  endDate: timestamp("end_date").notNull(), // 계약 종료일
  amount: integer("amount").notNull(), // 계약 금액
  status: contractStatusEnum("status").notNull().default("draft"),
  signedAt: timestamp("signed_at"), // 서명일 (서명 완료 시)
  notes: text("notes"), // 특이사항
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_contracts_customer").on(table.customerId),
  index("idx_contracts_number").on(table.contractNumber),
  index("idx_contracts_status").on(table.status),
  index("idx_contracts_dates").on(table.startDate, table.endDate),
]);

// Payments table (결제 내역)
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull().references(() => bookings.id),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  amount: integer("amount").notNull(), // 결제 금액 (원)
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 200 }).unique(), // Stripe Payment Intent ID
  status: paymentStatusEnum("status").notNull().default("pending"),
  paidAt: timestamp("paid_at"),
  refundedAt: timestamp("refunded_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_payments_booking").on(table.bookingId),
  index("idx_payments_customer").on(table.customerId),
  index("idx_payments_status").on(table.status),
]);

// Relations
export const customersRelations = relations(customers, ({ many }) => ({
  passes: many(customerPasses),
  bookings: many(bookings),
  usageHistory: many(usageHistory),
  journals: many(customerJournals),
  quotes: many(quotes),
  contracts: many(contracts),
  payments: many(payments),
}));

export const customerPassesRelations = relations(customerPasses, ({ one, many }) => ({
  customer: one(customers, {
    fields: [customerPasses.customerId],
    references: [customers.id],
  }),
  bookings: many(bookings),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  bookings: many(bookings),
  usageHistory: many(usageHistory),
  sensorReadings: many(sensorReadings),
  lifecycle: one(roomLifecycle, {
    fields: [rooms.id],
    references: [roomLifecycle.roomId],
  }),
  alerts: many(sensorAlerts),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  customer: one(customers, {
    fields: [bookings.customerId],
    references: [customers.id],
  }),
  room: one(rooms, {
    fields: [bookings.roomId],
    references: [rooms.id],
  }),
  pass: one(customerPasses, {
    fields: [bookings.passId],
    references: [customerPasses.id],
  }),
  usageHistory: many(usageHistory),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
  }),
  customer: one(customers, {
    fields: [payments.customerId],
    references: [customers.id],
  }),
}));

export const usageHistoryRelations = relations(usageHistory, ({ one }) => ({
  customer: one(customers, {
    fields: [usageHistory.customerId],
    references: [customers.id],
  }),
  room: one(rooms, {
    fields: [usageHistory.roomId],
    references: [rooms.id],
  }),
  booking: one(bookings, {
    fields: [usageHistory.bookingId],
    references: [bookings.id],
  }),
}));

export const sensorReadingsRelations = relations(sensorReadings, ({ one }) => ({
  room: one(rooms, {
    fields: [sensorReadings.roomId],
    references: [rooms.id],
  }),
}));

export const roomLifecycleRelations = relations(roomLifecycle, ({ one }) => ({
  room: one(rooms, {
    fields: [roomLifecycle.roomId],
    references: [rooms.id],
  }),
}));

export const sensorAlertsRelations = relations(sensorAlerts, ({ one }) => ({
  room: one(rooms, {
    fields: [sensorAlerts.roomId],
    references: [rooms.id],
  }),
}));

export const safetyChecklistItemsRelations = relations(safetyChecklistItems, ({ many }) => ({
  checkRecords: many(safetyCheckRecords),
}));

export const safetyCheckRecordsRelations = relations(safetyCheckRecords, ({ one }) => ({
  checklistItem: one(safetyChecklistItems, {
    fields: [safetyCheckRecords.checklistItemId],
    references: [safetyChecklistItems.id],
  }),
}));

export const customerJournalsRelations = relations(customerJournals, ({ one }) => ({
  customer: one(customers, {
    fields: [customerJournals.customerId],
    references: [customers.id],
  }),
}));

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  customer: one(customers, {
    fields: [quotes.customerId],
    references: [customers.id],
  }),
  contracts: many(contracts),
}));

export const contractsRelations = relations(contracts, ({ one }) => ({
  customer: one(customers, {
    fields: [contracts.customerId],
    references: [customers.id],
  }),
  quote: one(quotes, {
    fields: [contracts.quoteId],
    references: [quotes.id],
  }),
}));

// Zod schemas
export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  qrCode: true,
  nfcCode: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerPassSchema = createInsertSchema(customerPasses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startTime: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  endTime: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  actualStartTime: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ).optional().nullable(),
  actualEndTime: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ).optional().nullable(),
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSensorReadingSchema = createInsertSchema(sensorReadings).omit({
  id: true,
  timestamp: true,
});

export const insertRoomLifecycleSchema = createInsertSchema(roomLifecycle).omit({
  id: true,
  updatedAt: true,
});

export const insertSensorAlertSchema = createInsertSchema(sensorAlerts).omit({
  id: true,
  createdAt: true,
});

export const insertSafetyChecklistItemSchema = createInsertSchema(safetyChecklistItems).omit({
  id: true,
  createdAt: true,
});

export const insertSafetyCheckRecordSchema = createInsertSchema(safetyCheckRecords).omit({
  id: true,
  checkedAt: true,
});

export const insertKnowledgeArticleSchema = createInsertSchema(knowledgeArticles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerJournalSchema = createInsertSchema(customerJournals).omit({
  id: true,
  date: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  validUntil: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ).optional(),
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ).optional(),
  endDate: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ).optional(),
  signedAt: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ).optional().nullable(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export type InsertCustomerPass = z.infer<typeof insertCustomerPassSchema>;
export type CustomerPass = typeof customerPasses.$inferSelect;

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof rooms.$inferSelect;

export type UsageHistory = typeof usageHistory.$inferSelect;

export type InsertSensorReading = z.infer<typeof insertSensorReadingSchema>;
export type SensorReading = typeof sensorReadings.$inferSelect;

export type InsertRoomLifecycle = z.infer<typeof insertRoomLifecycleSchema>;
export type RoomLifecycle = typeof roomLifecycle.$inferSelect;

export type InsertSensorAlert = z.infer<typeof insertSensorAlertSchema>;
export type SensorAlert = typeof sensorAlerts.$inferSelect;

export type InsertSafetyChecklistItem = z.infer<typeof insertSafetyChecklistItemSchema>;
export type SafetyChecklistItem = typeof safetyChecklistItems.$inferSelect;

export type InsertSafetyCheckRecord = z.infer<typeof insertSafetyCheckRecordSchema>;
export type SafetyCheckRecord = typeof safetyCheckRecords.$inferSelect;

export type InsertKnowledgeArticle = z.infer<typeof insertKnowledgeArticleSchema>;
export type KnowledgeArticle = typeof knowledgeArticles.$inferSelect;

export type InsertCustomerJournal = z.infer<typeof insertCustomerJournalSchema>;
export type CustomerJournal = typeof customerJournals.$inferSelect;

export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;

export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Extended types for joins
export type BookingWithDetails = Booking & {
  customer: Customer;
  room: Room;
  pass: CustomerPass | null;
};

export type CustomerWithPasses = Customer & {
  passes: CustomerPass[];
};

export type RoomWithSensorData = Room & {
  sensorReadings: SensorReading[];
  lifecycle: RoomLifecycle | null;
  alerts: SensorAlert[];
};

export type SensorDataPoint = {
  timestamp: Date;
  temperature: number; // actual celsius value (e.g., 45.6)
  humidity: number; // actual percentage (e.g., 67.8)
};
