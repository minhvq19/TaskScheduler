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
  systemConfig,
  holidays,
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
  type SystemConfigs,
  type InsertSystemConfigs,
  type Holiday,
  type InsertHoliday,
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
  validateWorkScheduleLimit(staffId: string, startDate: Date, endDate: Date, excludeScheduleId?: string): Promise<{ isValid: boolean; violatingDate?: string; currentCount?: number }>;
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

  // System configuration operations
  getSystemConfigs(): Promise<SystemConfigs[]>;
  getSystemConfig(key: string): Promise<SystemConfigs | undefined>;
  createSystemConfig(config: InsertSystemConfigs): Promise<SystemConfigs>;
  updateSystemConfig(key: string, config: Partial<InsertSystemConfigs>): Promise<SystemConfigs>;
  deleteSystemConfig(key: string): Promise<void>;

  // Holiday operations
  getHolidays(): Promise<Holiday[]>;
  getHoliday(id: string): Promise<Holiday | undefined>;
  createHoliday(holiday: InsertHoliday): Promise<Holiday>;
  updateHoliday(id: string, holiday: Partial<InsertHoliday>): Promise<Holiday>;
  deleteHoliday(id: string): Promise<void>;
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

  async createStaff(staffData: InsertStaff & { createUserAccount?: boolean; userGroupId?: string }): Promise<Staff> {
    const hashedPassword = await bcrypt.hash(staffData.password, 10);
    const [newStaff] = await db
      .insert(staff)
      .values({ 
        fullName: staffData.fullName,
        employeeId: staffData.employeeId,
        password: hashedPassword,
        position: staffData.position,
        positionShort: staffData.positionShort,
        departmentId: staffData.departmentId,
        birthDate: staffData.birthDate,
        displayOrder: staffData.displayOrder,
        notes: staffData.notes,
      })
      .returning();

    // Create user account if requested
    if (staffData.createUserAccount && staffData.userGroupId) {
      await this.createSystemUser({
        username: staffData.employeeId,
        password: staffData.password,
        userGroupId: staffData.userGroupId,
      });
    }

    return newStaff;
  }

  async updateStaff(id: string, staffData: Partial<InsertStaff> & { createUserAccount?: boolean; userGroupId?: string }): Promise<Staff> {
    const updateData: any = {};
    
    // Copy only staff table fields
    if (staffData.fullName !== undefined) updateData.fullName = staffData.fullName;
    if (staffData.employeeId !== undefined) updateData.employeeId = staffData.employeeId;
    if (staffData.position !== undefined) updateData.position = staffData.position;
    if (staffData.positionShort !== undefined) updateData.positionShort = staffData.positionShort;
    if (staffData.departmentId !== undefined) updateData.departmentId = staffData.departmentId;
    if (staffData.birthDate !== undefined) updateData.birthDate = staffData.birthDate;
    if (staffData.displayOrder !== undefined) updateData.displayOrder = staffData.displayOrder;
    if (staffData.notes !== undefined) updateData.notes = staffData.notes;
    
    if (staffData.password) {
      updateData.password = await bcrypt.hash(staffData.password, 10);
    }

    const [updatedStaff] = await db
      .update(staff)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(staff.id, id))
      .returning();

    // Handle user account creation/update
    if (staffData.createUserAccount !== undefined) {
      const existingUser = await this.getSystemUserByUsername(updatedStaff.employeeId);
      
      if (staffData.createUserAccount && !existingUser && staffData.userGroupId) {
        // Create new user account
        await this.createSystemUser({
          username: updatedStaff.employeeId,
          password: staffData.password || 'TempPassword123!',
          userGroupId: staffData.userGroupId,
        });
      } else if (staffData.createUserAccount && existingUser && staffData.userGroupId) {
        // Update existing user account group
        await this.updateSystemUser(existingUser.id, {
          userGroupId: staffData.userGroupId,
          ...(staffData.password && { password: staffData.password })
        });
      } else if (!staffData.createUserAccount && existingUser) {
        // Delete user account if unchecked
        await this.deleteSystemUser(existingUser.id);
      }
    }

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
    const conditions = [];
    
    // Fix date range logic: find schedules that overlap with the given period
    // A schedule overlaps if: schedule.start <= period.end AND schedule.end >= period.start
    if (startDate && endDate) {
      conditions.push(
        and(
          lte(workSchedules.startDateTime, endDate),   // Schedule starts before or during period
          gte(workSchedules.endDateTime, startDate)    // Schedule ends after or during period
        )
      );
    } else if (startDate) {
      conditions.push(gte(workSchedules.endDateTime, startDate));  // Schedule ends after start
    } else if (endDate) {
      conditions.push(lte(workSchedules.startDateTime, endDate));   // Schedule starts before end
    }
    
    if (staffId) {
      conditions.push(eq(workSchedules.staffId, staffId));
    }

    if (conditions.length > 0) {
      return await db
        .select()
        .from(workSchedules)
        .where(and(...conditions))
        .orderBy(asc(workSchedules.startDateTime));
    }

    return await db
      .select()
      .from(workSchedules)
      .orderBy(asc(workSchedules.startDateTime));
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

    // Find all schedules that overlap with this day (not just those that start on this day)
    return await db
      .select()
      .from(workSchedules)
      .where(
        and(
          eq(workSchedules.staffId, staffId),
          // Schedule starts before or on the day AND ends on or after the day
          lte(workSchedules.startDateTime, endOfDay),
          gte(workSchedules.endDateTime, startOfDay)
        )
      );
  }

  async validateWorkScheduleLimit(staffId: string, startDate: Date, endDate: Date, excludeScheduleId?: string): Promise<{ isValid: boolean; violatingDate?: string; currentCount?: number }> {
    // Check each day in the date range
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      // Skip weekends
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
        const existingSchedules = await this.getWorkSchedulesByStaffAndDate(staffId, currentDate);
        
        // Filter out the schedule being updated if provided
        const relevantSchedules = excludeScheduleId 
          ? existingSchedules.filter(s => s.id !== excludeScheduleId)
          : existingSchedules;
        
        // The getWorkSchedulesByStaffAndDate method now returns all overlapping schedules
        // Adding the new schedule would exceed the limit
        if (relevantSchedules.length >= 4) {
          return {
            isValid: false,
            violatingDate: currentDate.toISOString().split('T')[0], // YYYY-MM-DD format
            currentCount: relevantSchedules.length
          };
        }
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return { isValid: true };
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
    const conditions = [];
    
    // Fix date range logic: find meetings that overlap with the given period
    // A meeting overlaps if: meeting.start <= period.end AND meeting.end >= period.start
    if (startDate && endDate) {
      conditions.push(
        and(
          lte(meetingSchedules.startDateTime, endDate),   // Meeting starts before or during period
          gte(meetingSchedules.endDateTime, startDate)    // Meeting ends after or during period
        )
      );
    } else if (startDate) {
      conditions.push(gte(meetingSchedules.endDateTime, startDate));  // Meeting ends after start
    } else if (endDate) {
      conditions.push(lte(meetingSchedules.startDateTime, endDate));   // Meeting starts before end
    }
    
    if (roomId) {
      conditions.push(eq(meetingSchedules.roomId, roomId));
    }

    if (conditions.length > 0) {
      return await db.select().from(meetingSchedules).where(and(...conditions)).orderBy(asc(meetingSchedules.startDateTime));
    }

    return await db.select().from(meetingSchedules).orderBy(asc(meetingSchedules.startDateTime));
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
    const conditions = [];
    // For overlapping events: search start <= event end AND search end >= event start
    if (startDate) {
      conditions.push(gte(otherEvents.endDateTime, startDate)); // Event ends >= search start
    }
    if (endDate) {
      conditions.push(lte(otherEvents.startDateTime, endDate)); // Event starts <= search end  
    }

    if (conditions.length > 0) {
      return await db.select().from(otherEvents).where(and(...conditions)).orderBy(asc(otherEvents.startDateTime));
    }

    return await db.select().from(otherEvents).orderBy(asc(otherEvents.startDateTime));
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

  // System configuration operations
  async getSystemConfigs(): Promise<SystemConfigs[]> {
    return await db.select().from(systemConfig).orderBy(asc(systemConfig.category), asc(systemConfig.key));
  }

  async getSystemConfig(key: string): Promise<SystemConfigs | undefined> {
    const [config] = await db.select().from(systemConfig).where(eq(systemConfig.key, key));
    return config;
  }

  async createSystemConfig(config: InsertSystemConfigs): Promise<SystemConfigs> {
    const [newConfig] = await db.insert(systemConfig).values(config).returning();
    return newConfig;
  }

  async updateSystemConfig(key: string, config: Partial<InsertSystemConfigs>): Promise<SystemConfigs> {
    const [updatedConfig] = await db
      .update(systemConfig)
      .set({ ...config, updatedAt: new Date() })
      .where(eq(systemConfig.key, key))
      .returning();
    return updatedConfig;
  }

  async deleteSystemConfig(key: string): Promise<void> {
    await db.delete(systemConfig).where(eq(systemConfig.key, key));
  }

  // Holiday operations
  async getHolidays(): Promise<Holiday[]> {
    return await db.select().from(holidays).orderBy(asc(holidays.date));
  }

  async getHoliday(id: string): Promise<Holiday | undefined> {
    const [holiday] = await db.select().from(holidays).where(eq(holidays.id, id));
    return holiday;
  }

  async createHoliday(holiday: InsertHoliday): Promise<Holiday> {
    const [newHoliday] = await db.insert(holidays).values(holiday).returning();
    return newHoliday;
  }

  async updateHoliday(id: string, holiday: Partial<InsertHoliday>): Promise<Holiday> {
    const [updatedHoliday] = await db
      .update(holidays)
      .set({ ...holiday, updatedAt: new Date() })
      .where(eq(holidays.id, id))
      .returning();
    return updatedHoliday;
  }

  async deleteHoliday(id: string): Promise<void> {
    await db.delete(holidays).where(eq(holidays.id, id));
  }

  // User group operations
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
}

export const storage = new DatabaseStorage();
