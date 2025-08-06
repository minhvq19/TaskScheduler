import {
  users,
  departments,
  staff,
  meetingRooms,
  eventCategories,
  workSchedules,
  meetingSchedules,
  otherEvents,
  userGroups,
  systemUsers,
  schedulePermissions,
  type User,
  type UpsertUser,
  type Department,
  type InsertDepartment,
  type Staff,
  type InsertStaff,
  type MeetingRoom,
  type InsertMeetingRoom,
  type EventCategory,
  type InsertEventCategory,
  type WorkSchedule,
  type InsertWorkSchedule,
  type MeetingSchedule,
  type InsertMeetingSchedule,
  type OtherEvent,
  type InsertOtherEvent,
  type UserGroup,
  type InsertUserGroup,
  type SystemUser,
  type InsertSystemUser,
  type SchedulePermission,
  type InsertSchedulePermission,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc, count, like } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations (required for auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Department operations
  getDepartments(): Promise<Department[]>;
  getDepartment(id: string): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: string, department: Partial<InsertDepartment>): Promise<Department>;
  deleteDepartment(id: string): Promise<void>;

  // Staff operations
  getStaff(): Promise<Staff[]>;
  getStaffById(id: string): Promise<Staff | undefined>;
  getStaffByDepartment(departmentId: string): Promise<Staff[]>;
  getStaffByEmployeeId(employeeId: string): Promise<Staff | undefined>;
  createStaff(staff: InsertStaff): Promise<Staff>;
  updateStaff(id: string, staff: Partial<InsertStaff>): Promise<Staff>;
  deleteStaff(id: string): Promise<void>;

  // Meeting rooms operations
  getMeetingRooms(): Promise<MeetingRoom[]>;
  getMeetingRoom(id: string): Promise<MeetingRoom | undefined>;
  createMeetingRoom(room: InsertMeetingRoom): Promise<MeetingRoom>;
  updateMeetingRoom(id: string, room: Partial<InsertMeetingRoom>): Promise<MeetingRoom>;
  deleteMeetingRoom(id: string): Promise<void>;

  // Event categories operations
  getEventCategories(): Promise<EventCategory[]>;
  getEventCategory(id: string): Promise<EventCategory | undefined>;
  createEventCategory(event: InsertEventCategory): Promise<EventCategory>;
  updateEventCategory(id: string, event: Partial<InsertEventCategory>): Promise<EventCategory>;
  deleteEventCategory(id: string): Promise<void>;

  // Work schedules operations
  getWorkSchedules(startDate?: Date, endDate?: Date, staffId?: string): Promise<WorkSchedule[]>;
  getWorkSchedule(id: string): Promise<WorkSchedule | undefined>;
  getWorkSchedulesByStaffAndDate(staffId: string, date: Date): Promise<WorkSchedule[]>;
  createWorkSchedule(schedule: InsertWorkSchedule): Promise<WorkSchedule>;
  updateWorkSchedule(id: string, schedule: Partial<InsertWorkSchedule>): Promise<WorkSchedule>;
  deleteWorkSchedule(id: string): Promise<void>;

  // Meeting schedules operations
  getMeetingSchedules(startDate?: Date, endDate?: Date, roomId?: string): Promise<MeetingSchedule[]>;
  getMeetingSchedule(id: string): Promise<MeetingSchedule | undefined>;
  createMeetingSchedule(schedule: InsertMeetingSchedule): Promise<MeetingSchedule>;
  updateMeetingSchedule(id: string, schedule: Partial<InsertMeetingSchedule>): Promise<MeetingSchedule>;
  deleteMeetingSchedule(id: string): Promise<void>;

  // Other events operations
  getOtherEvents(startDate?: Date, endDate?: Date): Promise<OtherEvent[]>;
  getOtherEvent(id: string): Promise<OtherEvent | undefined>;
  createOtherEvent(event: InsertOtherEvent): Promise<OtherEvent>;
  updateOtherEvent(id: string, event: Partial<InsertOtherEvent>): Promise<OtherEvent>;
  deleteOtherEvent(id: string): Promise<void>;

  // User groups operations
  getUserGroups(): Promise<UserGroup[]>;
  getUserGroup(id: string): Promise<UserGroup | undefined>;
  createUserGroup(group: InsertUserGroup): Promise<UserGroup>;
  updateUserGroup(id: string, group: Partial<InsertUserGroup>): Promise<UserGroup>;
  deleteUserGroup(id: string): Promise<void>;

  // System users operations
  getSystemUsers(): Promise<SystemUser[]>;
  getSystemUser(id: string): Promise<SystemUser | undefined>;
  getSystemUserByUsername(username: string): Promise<SystemUser | undefined>;
  authenticateSystemUser(username: string, password: string): Promise<SystemUser | null>;
  createSystemUser(user: InsertSystemUser): Promise<SystemUser>;
  updateSystemUser(id: string, user: Partial<InsertSystemUser>): Promise<SystemUser>;
  deleteSystemUser(id: string): Promise<void>;

  // Schedule permissions operations
  getSchedulePermissions(): Promise<SchedulePermission[]>;
  getSchedulePermissionsByUser(userId: string): Promise<SchedulePermission[]>;
  getSchedulePermissionsByStaff(staffId: string): Promise<SchedulePermission[]>;
  createSchedulePermission(permission: InsertSchedulePermission): Promise<SchedulePermission>;
  deleteSchedulePermission(id: string): Promise<void>;

  // Dashboard analytics operations
  getDashboardStats(): Promise<{
    totalStaff: number;
    totalDepartments: number;
    thisWeekSchedules: number;
    thisMonthSchedules: number;
    scheduleByCategoryData: { name: string; value: number; color: string }[];
    scheduleByWeekData: { week: string; schedules: number }[];
    departmentStaffData: { department: string; staff: number }[];
    upcomingSchedules: {
      id: string;
      staffName: string;
      workType: string;
      startDateTime: string;
      endDateTime: string;
    }[];
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Department operations
  async getDepartments(): Promise<Department[]> {
    return await db.select().from(departments).orderBy(asc(departments.name));
  }

  async getDepartment(id: string): Promise<Department | undefined> {
    const [department] = await db.select().from(departments).where(eq(departments.id, id));
    return department;
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    const [newDepartment] = await db.insert(departments).values(department).returning();
    return newDepartment;
  }

  async updateDepartment(id: string, department: Partial<InsertDepartment>): Promise<Department> {
    const [updatedDepartment] = await db
      .update(departments)
      .set({ ...department, updatedAt: new Date() })
      .where(eq(departments.id, id))
      .returning();
    return updatedDepartment;
  }

  async deleteDepartment(id: string): Promise<void> {
    await db.delete(departments).where(eq(departments.id, id));
  }

  // Staff operations
  async getStaff(): Promise<Staff[]> {
    const result = await db
      .select({
        id: staff.id,
        employeeId: staff.employeeId,
        fullName: staff.fullName,
        position: staff.position,
        positionShort: staff.positionShort,
        departmentId: staff.departmentId,
        displayOrder: staff.displayOrder,
        password: staff.password,
        createdAt: staff.createdAt,
        updatedAt: staff.updatedAt,
        birthDate: staff.birthDate,
        notes: staff.notes,
        department: {
          id: departments.id,
          name: departments.name,
        }
      })
      .from(staff)
      .leftJoin(departments, eq(staff.departmentId, departments.id))
      .orderBy(asc(staff.displayOrder), asc(staff.fullName));
    
    return result as Staff[];
  }

  async getStaffById(id: string): Promise<Staff | undefined> {
    const [staffMember] = await db.select().from(staff).where(eq(staff.id, id));
    return staffMember;
  }

  async getStaffByDepartment(departmentId: string): Promise<Staff[]> {
    return await db
      .select()
      .from(staff)
      .where(eq(staff.departmentId, departmentId))
      .orderBy(asc(staff.displayOrder), asc(staff.fullName));
  }

  async getStaffByEmployeeId(employeeId: string): Promise<Staff | undefined> {
    const [staffMember] = await db.select().from(staff).where(eq(staff.employeeId, employeeId));
    return staffMember;
  }

  async createStaff(staffData: InsertStaff): Promise<Staff> {
    const hashedPassword = await bcrypt.hash(staffData.password, 10);
    const [newStaff] = await db
      .insert(staff)
      .values({ ...staffData, password: hashedPassword })
      .returning();
    return newStaff;
  }

  async updateStaff(id: string, staffData: Partial<InsertStaff>): Promise<Staff> {
    const updateData = { ...staffData };
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }
    const [updatedStaff] = await db
      .update(staff)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(staff.id, id))
      .returning();
    return updatedStaff;
  }

  async deleteStaff(id: string): Promise<void> {
    await db.delete(staff).where(eq(staff.id, id));
  }

  // Meeting rooms operations
  async getMeetingRooms(): Promise<MeetingRoom[]> {
    return await db.select().from(meetingRooms).orderBy(asc(meetingRooms.name));
  }

  async getMeetingRoom(id: string): Promise<MeetingRoom | undefined> {
    const [room] = await db.select().from(meetingRooms).where(eq(meetingRooms.id, id));
    return room;
  }

  async createMeetingRoom(room: InsertMeetingRoom): Promise<MeetingRoom> {
    const [newRoom] = await db.insert(meetingRooms).values(room).returning();
    return newRoom;
  }

  async updateMeetingRoom(id: string, room: Partial<InsertMeetingRoom>): Promise<MeetingRoom> {
    const [updatedRoom] = await db
      .update(meetingRooms)
      .set({ ...room, updatedAt: new Date() })
      .where(eq(meetingRooms.id, id))
      .returning();
    return updatedRoom;
  }

  async deleteMeetingRoom(id: string): Promise<void> {
    await db.delete(meetingRooms).where(eq(meetingRooms.id, id));
  }

  // Event categories operations
  async getEventCategories(): Promise<EventCategory[]> {
    return await db.select().from(eventCategories).orderBy(desc(eventCategories.startDateTime));
  }

  async getEventCategory(id: string): Promise<EventCategory | undefined> {
    const [event] = await db.select().from(eventCategories).where(eq(eventCategories.id, id));
    return event;
  }

  async createEventCategory(event: InsertEventCategory): Promise<EventCategory> {
    const [newEvent] = await db.insert(eventCategories).values(event).returning();
    return newEvent;
  }

  async updateEventCategory(id: string, event: Partial<InsertEventCategory>): Promise<EventCategory> {
    const [updatedEvent] = await db
      .update(eventCategories)
      .set({ ...event, updatedAt: new Date() })
      .where(eq(eventCategories.id, id))
      .returning();
    return updatedEvent;
  }

  async deleteEventCategory(id: string): Promise<void> {
    await db.delete(eventCategories).where(eq(eventCategories.id, id));
  }

  // Work schedules operations
  async getWorkSchedules(startDate?: Date, endDate?: Date, staffId?: string): Promise<WorkSchedule[]> {
    let query = db.select().from(workSchedules);
    
    const conditions = [];
    if (startDate) {
      conditions.push(gte(workSchedules.startDateTime, startDate));
    }
    if (endDate) {
      conditions.push(lte(workSchedules.endDateTime, endDate));
    }
    if (staffId) {
      conditions.push(eq(workSchedules.staffId, staffId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(asc(workSchedules.startDateTime));
  }

  async getWorkSchedule(id: string): Promise<WorkSchedule | undefined> {
    const [schedule] = await db.select().from(workSchedules).where(eq(workSchedules.id, id));
    return schedule;
  }

  async getWorkSchedulesByStaffAndDate(staffId: string, date: Date): Promise<WorkSchedule[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await db
      .select()
      .from(workSchedules)
      .where(
        and(
          eq(workSchedules.staffId, staffId),
          gte(workSchedules.startDateTime, startOfDay),
          lte(workSchedules.startDateTime, endOfDay)
        )
      );
  }

  async createWorkSchedule(schedule: InsertWorkSchedule): Promise<WorkSchedule> {
    const [newSchedule] = await db.insert(workSchedules).values(schedule).returning();
    return newSchedule;
  }

  async updateWorkSchedule(id: string, schedule: Partial<InsertWorkSchedule>): Promise<WorkSchedule> {
    const [updatedSchedule] = await db
      .update(workSchedules)
      .set({ ...schedule, updatedAt: new Date() })
      .where(eq(workSchedules.id, id))
      .returning();
    return updatedSchedule;
  }

  async deleteWorkSchedule(id: string): Promise<void> {
    await db.delete(workSchedules).where(eq(workSchedules.id, id));
  }

  // Meeting schedules operations
  async getMeetingSchedules(startDate?: Date, endDate?: Date, roomId?: string): Promise<MeetingSchedule[]> {
    let query = db.select().from(meetingSchedules);
    
    const conditions = [];
    if (startDate) {
      conditions.push(gte(meetingSchedules.startDateTime, startDate));
    }
    if (endDate) {
      conditions.push(lte(meetingSchedules.endDateTime, endDate));
    }
    if (roomId) {
      conditions.push(eq(meetingSchedules.roomId, roomId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(asc(meetingSchedules.startDateTime));
  }

  async getMeetingSchedule(id: string): Promise<MeetingSchedule | undefined> {
    const [schedule] = await db.select().from(meetingSchedules).where(eq(meetingSchedules.id, id));
    return schedule;
  }

  async createMeetingSchedule(schedule: InsertMeetingSchedule): Promise<MeetingSchedule> {
    const [newSchedule] = await db.insert(meetingSchedules).values(schedule).returning();
    return newSchedule;
  }

  async updateMeetingSchedule(id: string, schedule: Partial<InsertMeetingSchedule>): Promise<MeetingSchedule> {
    const [updatedSchedule] = await db
      .update(meetingSchedules)
      .set({ ...schedule, updatedAt: new Date() })
      .where(eq(meetingSchedules.id, id))
      .returning();
    return updatedSchedule;
  }

  async deleteMeetingSchedule(id: string): Promise<void> {
    await db.delete(meetingSchedules).where(eq(meetingSchedules.id, id));
  }

  // Other events operations
  async getOtherEvents(startDate?: Date, endDate?: Date): Promise<OtherEvent[]> {
    let query = db.select().from(otherEvents);
    
    const conditions = [];
    if (startDate) {
      conditions.push(gte(otherEvents.startDateTime, startDate));
    }
    if (endDate) {
      conditions.push(lte(otherEvents.endDateTime, endDate));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(asc(otherEvents.startDateTime));
  }

  async getOtherEvent(id: string): Promise<OtherEvent | undefined> {
    const [event] = await db.select().from(otherEvents).where(eq(otherEvents.id, id));
    return event;
  }

  async createOtherEvent(event: InsertOtherEvent): Promise<OtherEvent> {
    const [newEvent] = await db.insert(otherEvents).values(event).returning();
    return newEvent;
  }

  async updateOtherEvent(id: string, event: Partial<InsertOtherEvent>): Promise<OtherEvent> {
    const [updatedEvent] = await db
      .update(otherEvents)
      .set({ ...event, updatedAt: new Date() })
      .where(eq(otherEvents.id, id))
      .returning();
    return updatedEvent;
  }

  async deleteOtherEvent(id: string): Promise<void> {
    await db.delete(otherEvents).where(eq(otherEvents.id, id));
  }

  // User groups operations
  async getUserGroups(): Promise<UserGroup[]> {
    return await db.select().from(userGroups).orderBy(asc(userGroups.name));
  }

  async getUserGroup(id: string): Promise<UserGroup | undefined> {
    const [group] = await db.select().from(userGroups).where(eq(userGroups.id, id));
    return group;
  }

  async createUserGroup(group: InsertUserGroup): Promise<UserGroup> {
    const [newGroup] = await db.insert(userGroups).values(group).returning();
    return newGroup;
  }

  async updateUserGroup(id: string, group: Partial<InsertUserGroup>): Promise<UserGroup> {
    const [updatedGroup] = await db
      .update(userGroups)
      .set({ ...group, updatedAt: new Date() })
      .where(eq(userGroups.id, id))
      .returning();
    return updatedGroup;
  }

  async deleteUserGroup(id: string): Promise<void> {
    await db.delete(userGroups).where(eq(userGroups.id, id));
  }

  // System users operations
  async getSystemUsers(): Promise<SystemUser[]> {
    return await db.select().from(systemUsers).orderBy(asc(systemUsers.username));
  }

  async getSystemUser(id: string): Promise<SystemUser | undefined> {
    const [user] = await db.select().from(systemUsers).where(eq(systemUsers.id, id));
    return user;
  }

  async getSystemUserByUsername(username: string): Promise<SystemUser | undefined> {
    const [user] = await db.select().from(systemUsers).where(eq(systemUsers.username, username));
    return user;
  }

  async getSystemUserWithGroup(id: string) {
    const [result] = await db
      .select({
        user: systemUsers,
        userGroup: userGroups,
      })
      .from(systemUsers)
      .leftJoin(userGroups, eq(systemUsers.userGroupId, userGroups.id))
      .where(eq(systemUsers.id, id));
    
    return result;
  }

  async authenticateSystemUser(username: string, password: string): Promise<SystemUser | null> {
    const user = await this.getSystemUserByUsername(username);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  async createSystemUser(user: InsertSystemUser): Promise<SystemUser> {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const [newUser] = await db
      .insert(systemUsers)
      .values({ ...user, password: hashedPassword })
      .returning();
    return newUser;
  }

  async updateSystemUser(id: string, user: Partial<InsertSystemUser>): Promise<SystemUser> {
    const updateData = { ...user };
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }
    const [updatedUser] = await db
      .update(systemUsers)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(systemUsers.id, id))
      .returning();
    return updatedUser;
  }

  async deleteSystemUser(id: string): Promise<void> {
    await db.delete(systemUsers).where(eq(systemUsers.id, id));
  }

  // Schedule permissions operations
  async getSchedulePermissions(): Promise<SchedulePermission[]> {
    return await db.select().from(schedulePermissions).orderBy(asc(schedulePermissions.createdAt));
  }

  async getSchedulePermissionsByUser(userId: string): Promise<SchedulePermission[]> {
    return await db
      .select()
      .from(schedulePermissions)
      .where(eq(schedulePermissions.userId, userId));
  }

  async getSchedulePermissionsByStaff(staffId: string): Promise<SchedulePermission[]> {
    return await db
      .select()
      .from(schedulePermissions)
      .where(eq(schedulePermissions.staffId, staffId));
  }

  async createSchedulePermission(permission: InsertSchedulePermission): Promise<SchedulePermission> {
    const [newPermission] = await db.insert(schedulePermissions).values(permission).returning();
    return newPermission;
  }

  async deleteSchedulePermission(id: string): Promise<void> {
    await db.delete(schedulePermissions).where(eq(schedulePermissions.id, id));
  }

  // Dashboard analytics operations
  async getDashboardStats() {
    const today = new Date();
    const startOfWeekDate = new Date(today);
    startOfWeekDate.setDate(today.getDate() - today.getDay() + 1); // Monday
    startOfWeekDate.setHours(0, 0, 0, 0);
    
    const endOfWeekDate = new Date(startOfWeekDate);
    endOfWeekDate.setDate(startOfWeekDate.getDate() + 6);
    endOfWeekDate.setHours(23, 59, 59, 999);

    const startOfMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    // Get basic counts
    const [totalStaffResult] = await db.select({ count: count() }).from(staff);
    const [totalDepartmentsResult] = await db.select({ count: count() }).from(departments);

    // Get this week schedules
    const thisWeekSchedules = await db
      .select({ count: count() })
      .from(workSchedules)
      .where(
        and(
          gte(workSchedules.startDateTime, startOfWeekDate),
          lte(workSchedules.startDateTime, endOfWeekDate)
        )
      );

    // Get this month schedules
    const thisMonthSchedules = await db
      .select({ count: count() })
      .from(workSchedules)
      .where(
        and(
          gte(workSchedules.startDateTime, startOfMonthDate),
          lte(workSchedules.startDateTime, endOfMonthDate)
        )
      );

    // Get schedule by category data
    const schedulesByCategory = await db
      .select({
        workType: workSchedules.workType,
        count: count()
      })
      .from(workSchedules)
      .groupBy(workSchedules.workType);

    const colors = {
      "Làm việc tại CN": "#4a90a4",
      "Nghỉ phép": "#f59e0b", 
      "Trực lãnh đạo": "#ef4444",
      "Đi công tác trong nước": "#10b981",
      "Đi công tác nước ngoài": "#8b5cf6",
      "Khác": "#6b7280"
    };

    const scheduleByCategoryData = schedulesByCategory.map(item => ({
      name: item.workType,
      value: item.count,
      color: colors[item.workType as keyof typeof colors] || '#6b7280'
    }));

    // Get department staff data
    const departmentStaffData = await db
      .select({
        departmentName: departments.name,
        staffCount: count()
      })
      .from(staff)
      .leftJoin(departments, eq(staff.departmentId, departments.id))
      .groupBy(departments.name)
      .orderBy(departments.name);

    // Get schedule trends by week (last 8 weeks)
    const scheduleByWeekData = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (today.getDay() - 1) - (i * 7)); // Monday of that week
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const [weekSchedules] = await db
        .select({ count: count() })
        .from(workSchedules)
        .where(
          and(
            gte(workSchedules.startDateTime, weekStart),
            lte(workSchedules.startDateTime, weekEnd)
          )
        );

      scheduleByWeekData.push({
        week: `${weekStart.getDate().toString().padStart(2, '0')}/${(weekStart.getMonth() + 1).toString().padStart(2, '0')}`,
        schedules: weekSchedules.count
      });
    }

    // Get upcoming schedules (next 7 days)
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    const upcomingSchedulesData = await db
      .select({
        id: workSchedules.id,
        staffName: staff.fullName,
        workType: workSchedules.workType,
        startDateTime: workSchedules.startDateTime,
        endDateTime: workSchedules.endDateTime
      })
      .from(workSchedules)
      .leftJoin(staff, eq(workSchedules.staffId, staff.id))
      .where(
        and(
          gte(workSchedules.startDateTime, today),
          lte(workSchedules.startDateTime, sevenDaysFromNow)
        )
      )
      .orderBy(workSchedules.startDateTime)
      .limit(10);

    return {
      totalStaff: totalStaffResult.count,
      totalDepartments: totalDepartmentsResult.count,
      thisWeekSchedules: thisWeekSchedules[0].count,
      thisMonthSchedules: thisMonthSchedules[0].count,
      scheduleByCategoryData,
      scheduleByWeekData,
      departmentStaffData: departmentStaffData.map(item => ({
        department: item.departmentName || 'Chưa phân bổ',
        staff: item.staffCount
      })),
      upcomingSchedules: upcomingSchedulesData.map(item => ({
        id: item.id,
        staffName: item.staffName || 'N/A',
        workType: item.workType,
        startDateTime: item.startDateTime.toISOString(),
        endDateTime: item.endDateTime.toISOString()
      }))
    };
  }
}

export const storage = new DatabaseStorage();
