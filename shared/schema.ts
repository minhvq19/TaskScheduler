import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Departments table
export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").notNull().unique(),
  name: varchar("name").notNull(),
  shortName: varchar("short_name"),
  blockName: varchar("block_name"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Staff table
export const staff = pgTable("staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().unique(),
  fullName: varchar("full_name").notNull(),
  password: varchar("password").notNull(),
  position: varchar("position").notNull(),
  positionShort: varchar("position_short").notNull(),
  departmentId: varchar("department_id").notNull(),
  birthDate: timestamp("birth_date"),
  displayOrder: integer("display_order").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Meeting rooms table
export const meetingRooms = pgTable("meeting_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  location: varchar("location"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Events (category) table
export const eventCategories = pgTable("event_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  startDateTime: timestamp("start_date_time").notNull(),
  endDateTime: timestamp("end_date_time").notNull(),
  status: varchar("status").notNull().default("upcoming"), // upcoming, ongoing, finished
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Work schedules table
export const workSchedules = pgTable("work_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull(),
  startDateTime: timestamp("start_date_time").notNull(),
  endDateTime: timestamp("end_date_time").notNull(),
  workType: varchar("work_type").notNull(), // Làm việc tại CN, Nghỉ phép, Trực lãnh đạo, Đi công tác trong nước, Đi công tác nước ngoài, Khác
  customContent: text("custom_content"), // max 200 chars when workType is "Khác"
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedBy: varchar("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Meeting schedules table
export const meetingSchedules = pgTable("meeting_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull(),
  contactPerson: varchar("contact_person"), // optional
  startDateTime: timestamp("start_date_time").notNull(),
  endDateTime: timestamp("end_date_time").notNull(),
  meetingContent: text("meeting_content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Other events table
export const otherEvents = pgTable("other_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shortName: varchar("short_name").notNull(),
  startDateTime: timestamp("start_date_time").notNull(),
  endDateTime: timestamp("end_date_time").notNull(),
  content: text("content").notNull(),
  imageUrl: varchar("image_url"), // for uploaded images
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User groups table
export const userGroups = pgTable("user_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  permissions: jsonb("permissions").notNull(), // { functionName: "EDIT" | "VIEW" }
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// System users table (for login)
export const systemUsers = pgTable("system_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").notNull().unique(),
  password: varchar("password").notNull(),
  userGroupId: varchar("user_group_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schedule input permissions table
export const schedulePermissions = pgTable("schedule_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  staffId: varchar("staff_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const departmentRelations = relations(departments, ({ many }) => ({
  staff: many(staff),
}));

export const staffRelations = relations(staff, ({ one, many }) => ({
  department: one(departments, {
    fields: [staff.departmentId],
    references: [departments.id],
  }),
  workSchedules: many(workSchedules),
  schedulePermissions: many(schedulePermissions),
}));

export const meetingRoomRelations = relations(meetingRooms, ({ many }) => ({
  meetingSchedules: many(meetingSchedules),
}));

export const workScheduleRelations = relations(workSchedules, ({ one }) => ({
  staff: one(staff, {
    fields: [workSchedules.staffId],
    references: [staff.id],
  }),
  createdByUser: one(systemUsers, {
    fields: [workSchedules.createdBy],
    references: [systemUsers.id],
  }),
  updatedByUser: one(systemUsers, {
    fields: [workSchedules.updatedBy],
    references: [systemUsers.id],
  }),
}));

export const meetingScheduleRelations = relations(meetingSchedules, ({ one }) => ({
  room: one(meetingRooms, {
    fields: [meetingSchedules.roomId],
    references: [meetingRooms.id],
  }),
}));

export const userGroupRelations = relations(userGroups, ({ many }) => ({
  systemUsers: many(systemUsers),
}));

export const systemUserRelations = relations(systemUsers, ({ one, many }) => ({
  userGroup: one(userGroups, {
    fields: [systemUsers.userGroupId],
    references: [userGroups.id],
  }),
  workSchedulesCreated: many(workSchedules, { relationName: "createdBy" }),
  workSchedulesUpdated: many(workSchedules, { relationName: "updatedBy" }),
  schedulePermissions: many(schedulePermissions),
}));

export const schedulePermissionRelations = relations(schedulePermissions, ({ one }) => ({
  user: one(systemUsers, {
    fields: [schedulePermissions.userId],
    references: [systemUsers.id],
  }),
  staff: one(staff, {
    fields: [schedulePermissions.staffId],
    references: [staff.id],
  }),
}));

// Zod schemas
export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStaffSchema = createInsertSchema(staff).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  password: z.string().min(11).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
});

export const insertMeetingRoomSchema = createInsertSchema(meetingRooms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventCategorySchema = createInsertSchema(eventCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkScheduleSchema = createInsertSchema(workSchedules).omit({
  id: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  updatedBy: true,
}).extend({
  customContent: z.string().max(200).optional(),
});

export const insertMeetingScheduleSchema = createInsertSchema(meetingSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOtherEventSchema = createInsertSchema(otherEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserGroupSchema = createInsertSchema(userGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSystemUserSchema = createInsertSchema(systemUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  password: z.string().min(11).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
});

export const insertSchedulePermissionSchema = createInsertSchema(schedulePermissions).omit({
  id: true,
  createdAt: true,
});

export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Staff = typeof staff.$inferSelect;
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type MeetingRoom = typeof meetingRooms.$inferSelect;
export type InsertMeetingRoom = z.infer<typeof insertMeetingRoomSchema>;
export type EventCategory = typeof eventCategories.$inferSelect;
export type InsertEventCategory = z.infer<typeof insertEventCategorySchema>;
export type WorkSchedule = typeof workSchedules.$inferSelect;
export type InsertWorkSchedule = z.infer<typeof insertWorkScheduleSchema>;
export type MeetingSchedule = typeof meetingSchedules.$inferSelect;
export type InsertMeetingSchedule = z.infer<typeof insertMeetingScheduleSchema>;
export type OtherEvent = typeof otherEvents.$inferSelect;
export type InsertOtherEvent = z.infer<typeof insertOtherEventSchema>;
export type UserGroup = typeof userGroups.$inferSelect;
export type InsertUserGroup = z.infer<typeof insertUserGroupSchema>;
export type SystemUser = typeof systemUsers.$inferSelect;
export type InsertSystemUser = z.infer<typeof insertSystemUserSchema>;
export type SchedulePermission = typeof schedulePermissions.$inferSelect;
export type InsertSchedulePermission = z.infer<typeof insertSchedulePermissionSchema>;
