import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertDepartmentSchema,
  insertStaffSchema,
  updateStaffSchema,
  insertMeetingRoomSchema,
  insertEventCategorySchema,
  insertWorkScheduleSchema,
  insertMeetingScheduleSchema,
  insertOtherEventSchema,
  insertUserGroupSchema,
  insertSystemUserSchema,
  insertSchedulePermissionSchema,
  insertSystemConfigsSchema,
  insertHolidaySchema,
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (jpg, jpeg, png, gif) are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Check for local authentication first
      if (req.session?.user) {
        const localUser = req.session.user;
        const userWithGroup = await storage.getSystemUserWithGroup(localUser.id);
        res.json({
          id: localUser.id,
          username: localUser.username,
          firstName: userWithGroup?.user.firstName,
          lastName: userWithGroup?.user.lastName,
          userGroupId: localUser.userGroupId,
          userGroup: userWithGroup?.userGroup
        });
        return;
      }
      
      // Check for Replit authentication
      if (req.isAuthenticated() && req.user?.claims) {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        res.json(user);
        return;
      }
      
      // No authentication found
      res.status(401).json({ message: "Unauthorized" });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Login route for local authentication
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const user = await storage.authenticateSystemUser(username, password);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Store user in session
      (req.session as any).user = {
        id: user.id,
        username: user.username,
        userGroupId: user.userGroupId,
      };

      res.json({ message: "Login successful", user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  // Local auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session?.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = req.session.user;
    next();
  };

  // Department routes
  app.get('/api/departments', requireAuth, async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  app.post('/api/departments', requireAuth, async (req, res) => {
    try {
      const validatedData = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(validatedData);
      res.status(201).json(department);
    } catch (error) {
      console.error("Error creating department:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create department" });
    }
  });

  app.put('/api/departments/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertDepartmentSchema.partial().parse(req.body);
      const department = await storage.updateDepartment(id, validatedData);
      res.json(department);
    } catch (error) {
      console.error("Error updating department:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update department" });
    }
  });

  app.delete('/api/departments/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteDepartment(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting department:", error);
      res.status(500).json({ message: "Failed to delete department" });
    }
  });

  // Staff routes
  app.get('/api/staff', requireAuth, async (req, res) => {
    try {
      const { departmentId } = req.query;
      const staff = departmentId 
        ? await storage.getStaffByDepartment(departmentId as string)
        : await storage.getStaff();
      res.json(staff);
    } catch (error) {
      console.error("Error fetching staff:", error);
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  app.post('/api/staff', requireAuth, async (req, res) => {
    try {
      const validatedData = insertStaffSchema.parse(req.body);
      const staff = await storage.createStaff(validatedData);
      res.status(201).json(staff);
    } catch (error) {
      console.error("Error creating staff:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create staff" });
    }
  });

  app.put('/api/staff/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = updateStaffSchema.parse(req.body);
      const staff = await storage.updateStaff(id, validatedData);
      res.json(staff);
    } catch (error) {
      console.error("Error updating staff:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update staff" });
    }
  });

  app.delete('/api/staff/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteStaff(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting staff:", error);
      res.status(500).json({ message: "Failed to delete staff" });
    }
  });

  // Meeting rooms routes
  app.get('/api/meeting-rooms', requireAuth, async (req, res) => {
    try {
      const rooms = await storage.getMeetingRooms();
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching meeting rooms:", error);
      res.status(500).json({ message: "Failed to fetch meeting rooms" });
    }
  });

  app.post('/api/meeting-rooms', requireAuth, async (req, res) => {
    try {
      const validatedData = insertMeetingRoomSchema.parse(req.body);
      const room = await storage.createMeetingRoom(validatedData);
      res.status(201).json(room);
    } catch (error) {
      console.error("Error creating meeting room:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create meeting room" });
    }
  });

  app.put('/api/meeting-rooms/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertMeetingRoomSchema.partial().parse(req.body);
      const room = await storage.updateMeetingRoom(id, validatedData);
      res.json(room);
    } catch (error) {
      console.error("Error updating meeting room:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update meeting room" });
    }
  });

  app.delete('/api/meeting-rooms/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteMeetingRoom(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting meeting room:", error);
      res.status(500).json({ message: "Failed to delete meeting room" });
    }
  });

  // Work schedules routes
  app.get('/api/work-schedules', requireAuth, async (req, res) => {
    try {
      const { startDate, endDate, staffId } = req.query;
      const schedules = await storage.getWorkSchedules(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        staffId as string
      );
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching work schedules:", error);
      res.status(500).json({ message: "Failed to fetch work schedules" });
    }
  });

  app.post('/api/work-schedules', requireAuth, async (req, res) => {
    try {
      const validatedData = insertWorkScheduleSchema.parse({
        ...req.body,
        startDateTime: new Date(req.body.startDateTime),
        endDateTime: new Date(req.body.endDateTime),
        createdBy: (req.user as any)?.id || 'admin-user',
      });

      // Check daily limit (max 5 schedules per staff per day) for the entire date range
      const startDate = new Date(validatedData.startDateTime);
      const endDate = new Date(validatedData.endDateTime);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      
      const validation = await storage.validateWorkScheduleLimit(
        validatedData.staffId,
        startDate,
        endDate
      );

      if (!validation.isValid) {
        const violatingDateFormatted = new Date(validation.violatingDate!).toLocaleDateString('vi-VN');
        return res.status(400).json({ 
          message: `Không thể thêm lịch công tác. Ngày ${violatingDateFormatted} đã có ${validation.currentCount} lịch công tác, vượt quá giới hạn 5 lịch cho mỗi ngày.`
        });
      }

      const schedule = await storage.createWorkSchedule(validatedData);
      res.status(201).json(schedule);
    } catch (error) {
      console.error("Error creating work schedule:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create work schedule" });
    }
  });

  app.put('/api/work-schedules/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertWorkScheduleSchema.partial().parse({
        ...req.body,
        startDateTime: req.body.startDateTime ? new Date(req.body.startDateTime) : undefined,
        endDateTime: req.body.endDateTime ? new Date(req.body.endDateTime) : undefined,
        updatedBy: (req.user as any)?.id || 'admin-user',
      });

      // Check daily limit if dates are being updated
      if (validatedData.startDateTime && validatedData.endDateTime && validatedData.staffId) {
        const startDate = new Date(validatedData.startDateTime);
        const endDate = new Date(validatedData.endDateTime);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        
        const validation = await storage.validateWorkScheduleLimit(
          validatedData.staffId,
          startDate,
          endDate,
          id // Exclude current schedule from count
        );

        if (!validation.isValid) {
          const violatingDateFormatted = new Date(validation.violatingDate!).toLocaleDateString('vi-VN');
          return res.status(400).json({ 
            message: `Không thể cập nhật lịch công tác. Ngày ${violatingDateFormatted} đã có ${validation.currentCount} lịch công tác, vượt quá giới hạn 5 lịch cho mỗi ngày.`
          });
        }
      }

      const schedule = await storage.updateWorkSchedule(id, validatedData);
      res.json(schedule);
    } catch (error) {
      console.error("Error updating work schedule:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update work schedule" });
    }
  });

  app.delete('/api/work-schedules/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteWorkSchedule(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting work schedule:", error);
      res.status(500).json({ message: "Failed to delete work schedule" });
    }
  });

  // Meeting schedules routes
  app.get('/api/meeting-schedules', requireAuth, async (req, res) => {
    try {
      const { startDate, endDate, roomId } = req.query;
      const schedules = await storage.getMeetingSchedules(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        roomId as string
      );
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching meeting schedules:", error);
      res.status(500).json({ message: "Failed to fetch meeting schedules" });
    }
  });

  app.post('/api/meeting-schedules', requireAuth, async (req, res) => {
    try {
      const validatedData = insertMeetingScheduleSchema.parse(req.body);
      const schedule = await storage.createMeetingSchedule(validatedData);
      res.status(201).json(schedule);
    } catch (error) {
      console.error("Error creating meeting schedule:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create meeting schedule" });
    }
  });

  app.put('/api/meeting-schedules/:id', requireAuth, async (req, res) => {
    try {
      const validatedData = insertMeetingScheduleSchema.parse(req.body);
      const schedule = await storage.updateMeetingSchedule(req.params.id, validatedData);
      res.json(schedule);
    } catch (error) {
      console.error("Error updating meeting schedule:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update meeting schedule" });
    }
  });

  app.delete('/api/meeting-schedules/:id', requireAuth, async (req, res) => {
    try {
      await storage.deleteMeetingSchedule(req.params.id);
      res.status(200).json({ message: "Meeting schedule deleted successfully" });
    } catch (error) {
      console.error("Error deleting meeting schedule:", error);
      res.status(500).json({ message: "Failed to delete meeting schedule" });
    }
  });

  // Other events routes with file upload
  app.get('/api/other-events', async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const events = await storage.getOtherEvents(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(events);
    } catch (error) {
      console.error("Error fetching other events:", error);
      res.status(500).json({ message: "Failed to fetch other events" });
    }
  });

  app.post('/api/other-events', requireAuth, upload.single('image'), async (req, res) => {
    try {
      let imageUrl = undefined;
      
      if (req.file) {
        // Move file to public directory and generate URL
        const filename = `${Date.now()}-${req.file.originalname}`;
        const publicPath = path.join(process.cwd(), 'dist', 'public', 'uploads', filename);
        
        // Ensure uploads directory exists
        const uploadsDir = path.dirname(publicPath);
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        fs.renameSync(req.file.path, publicPath);
        imageUrl = `/uploads/${filename}`;
      }

      const validatedData = insertOtherEventSchema.parse({
        ...req.body,
        imageUrl,
      });
      
      const event = await storage.createOtherEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating other event:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create other event" });
    }
  });

  app.put('/api/other-events/:id', requireAuth, upload.single('image'), async (req, res) => {
    try {
      const { id } = req.params;
      let imageUrl = req.body.imageUrl; // Keep existing image if no new file uploaded
      
      if (req.file) {
        // Move file to public directory and generate URL
        const filename = `${Date.now()}-${req.file.originalname}`;
        const publicPath = path.join(process.cwd(), 'dist', 'public', 'uploads', filename);
        
        // Ensure uploads directory exists
        const uploadsDir = path.dirname(publicPath);
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        fs.renameSync(req.file.path, publicPath);
        imageUrl = `/uploads/${filename}`;
      }

      const validatedData = insertOtherEventSchema.partial().parse({
        ...req.body,
        imageUrl,
      });
      
      const event = await storage.updateOtherEvent(id, validatedData);
      res.json(event);
    } catch (error) {
      console.error("Error updating other event:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update other event" });
    }
  });

  app.delete('/api/other-events/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteOtherEvent(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting other event:", error);
      res.status(500).json({ message: "Failed to delete other event" });
    }
  });

  // System users routes
  app.get('/api/system-users', requireAuth, async (req, res) => {
    try {
      const users = await storage.getSystemUsers();
      res.json(users.map(user => ({ ...user, password: undefined }))); // Don't expose passwords
    } catch (error) {
      console.error("Error fetching system users:", error);
      res.status(500).json({ message: "Failed to fetch system users" });
    }
  });

  app.post('/api/system-users', requireAuth, async (req, res) => {
    try {
      const validatedData = insertSystemUserSchema.parse(req.body);
      const user = await storage.createSystemUser(validatedData);
      res.status(201).json({ ...user, password: undefined });
    } catch (error) {
      console.error("Error creating system user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create system user" });
    }
  });

  // Schedule permissions routes
  app.get('/api/schedule-permissions', requireAuth, async (req, res) => {
    try {
      const permissions = await storage.getSchedulePermissions();
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching schedule permissions:", error);
      res.status(500).json({ message: "Failed to fetch schedule permissions" });
    }
  });

  app.post('/api/schedule-permissions', requireAuth, async (req, res) => {
    try {
      const validatedData = insertSchedulePermissionSchema.parse(req.body);
      const permission = await storage.createSchedulePermission(validatedData);
      res.status(201).json(permission);
    } catch (error) {
      console.error("Error creating schedule permission:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create schedule permission" });
    }
  });

  app.delete('/api/schedule-permissions/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSchedulePermission(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting schedule permission:", error);
      res.status(500).json({ message: "Failed to delete schedule permission" });
    }
  });

  // User groups routes
  app.get('/api/user-groups', requireAuth, async (req, res) => {
    try {
      const userGroups = await storage.getUserGroups();
      res.json(userGroups);
    } catch (error) {
      console.error("Error fetching user groups:", error);
      res.status(500).json({ message: "Failed to fetch user groups" });
    }
  });

  app.post('/api/user-groups', requireAuth, async (req, res) => {
    try {
      const validatedData = insertUserGroupSchema.parse(req.body);
      const userGroup = await storage.createUserGroup(validatedData);
      res.status(201).json(userGroup);
    } catch (error) {
      console.error("Error creating user group:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user group" });
    }
  });

  app.put('/api/user-groups/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertUserGroupSchema.partial().parse(req.body);
      const userGroup = await storage.updateUserGroup(id, validatedData);
      res.json(userGroup);
    } catch (error) {
      console.error("Error updating user group:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update user group" });
    }
  });

  app.delete('/api/user-groups/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteUserGroup(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user group:", error);
      res.status(500).json({ message: "Failed to delete user group" });
    }
  });

  // Public display endpoints (no auth required)
  app.get('/api/public/current-time', (req, res) => {
    res.json({ currentTime: new Date().toISOString() });
  });

  app.get('/api/public/staff', async (req, res) => {
    try {
      const staff = await storage.getStaff();
      res.json(staff);
    } catch (error) {
      console.error("Error fetching public staff data:", error);
      res.status(500).json({ message: "Failed to fetch staff data" });
    }
  });

  app.get('/api/public/display-data', async (req, res) => {
    try {
      const today = new Date();
      const currentTime = new Date();
      
      // Get schedules for the next 7 days (today + 6 days)
      // Look for schedules that start up to 30 days ago and end up to 30 days from now
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const sevenDaysFromNow = new Date(today);
      sevenDaysFromNow.setDate(today.getDate() + 7);

      const allWorkSchedules = await storage.getWorkSchedules(thirtyDaysAgo, sevenDaysFromNow);
      const allMeetingSchedules = await storage.getMeetingSchedules(thirtyDaysAgo, sevenDaysFromNow);
      const allOtherEvents = await storage.getOtherEvents(thirtyDaysAgo, sevenDaysFromNow);

      // Filter schedules that are active in the next 7 days
      const startOfToday = new Date(today);
      startOfToday.setHours(0, 0, 0, 0);
      const endOfSevenDays = new Date(sevenDaysFromNow);
      endOfSevenDays.setHours(23, 59, 59, 999);

      const workSchedules = allWorkSchedules.filter(schedule => {
        const start = new Date(schedule.startDateTime);
        const end = new Date(schedule.endDateTime);
        // Include if the schedule overlaps with the next 7 days
        return start <= endOfSevenDays && end >= startOfToday;
      });

      const meetingSchedules = allMeetingSchedules.filter(schedule => {
        const start = new Date(schedule.startDateTime);
        const end = new Date(schedule.endDateTime);
        return start <= endOfSevenDays && end >= startOfToday;
      });

      const otherEvents = allOtherEvents.filter(event => {
        const start = new Date(event.startDateTime);
        const end = new Date(event.endDateTime);
        return start <= endOfSevenDays && end >= startOfToday;
      });

      res.json({
        workSchedules,
        meetingSchedules,
        otherEvents,
        currentTime: currentTime.toISOString(),
      });
    } catch (error) {
      console.error("Error fetching public display data:", error);
      res.status(500).json({ message: "Failed to fetch display data" });
    }
  });

  // System Configuration routes
  app.get('/api/system-config', async (req, res) => {
    try {
      const configs = await storage.getSystemConfigs();
      res.json(configs);
    } catch (error) {
      console.error("Error fetching system configs:", error);
      res.status(500).json({ message: "Failed to fetch system configs" });
    }
  });

  app.get('/api/system-config/:key', async (req, res) => {
    try {
      const { key } = req.params;
      const config = await storage.getSystemConfig(key);
      if (!config) {
        return res.status(404).json({ message: "Configuration not found" });
      }
      res.json(config);
    } catch (error) {
      console.error("Error fetching system config:", error);
      res.status(500).json({ message: "Failed to fetch system config" });
    }
  });

  app.post('/api/system-config', async (req, res) => {
    try {
      const configData = insertSystemConfigsSchema.parse(req.body);
      const config = await storage.createSystemConfig(configData);
      res.status(201).json(config);
    } catch (error) {
      console.error("Error creating system config:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create system config" });
    }
  });

  app.put('/api/system-config/:key', async (req, res) => {
    try {
      const { key } = req.params;
      const configData = insertSystemConfigsSchema.partial().parse(req.body);
      const config = await storage.updateSystemConfig(key, configData);
      res.json(config);
    } catch (error) {
      console.error("Error updating system config:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update system config" });
    }
  });

  app.delete('/api/system-config/:key', async (req, res) => {
    try {
      const { key } = req.params;
      await storage.deleteSystemConfig(key);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting system config:", error);
      res.status(500).json({ message: "Failed to delete system config" });
    }
  });

  // Holiday routes
  app.get('/api/holidays', async (req, res) => {
    try {
      const holidays = await storage.getHolidays();
      res.json(holidays);
    } catch (error) {
      console.error("Error fetching holidays:", error);
      res.status(500).json({ message: "Failed to fetch holidays" });
    }
  });

  app.get('/api/holidays/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const holiday = await storage.getHoliday(id);
      if (!holiday) {
        return res.status(404).json({ message: "Holiday not found" });
      }
      res.json(holiday);
    } catch (error) {
      console.error("Error fetching holiday:", error);
      res.status(500).json({ message: "Failed to fetch holiday" });
    }
  });

  app.post('/api/holidays', async (req, res) => {
    try {
      // Convert date string to Date object and extract month-day for recurring holidays
      const date = new Date(req.body.date);
      const monthDay = req.body.isRecurring ? 
        `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : 
        null;

      const requestData = {
        ...req.body,
        date: date,
        monthDay: monthDay
      };
      const holidayData = insertHolidaySchema.parse(requestData);
      const holiday = await storage.createHoliday(holidayData);
      res.status(201).json(holiday);
    } catch (error) {
      console.error("Error creating holiday:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create holiday" });
    }
  });

  app.put('/api/holidays/:id', async (req, res) => {
    try {
      const { id } = req.params;
      // Convert date string to Date object if present and handle month-day for recurring
      let requestData = { ...req.body };
      
      if (req.body.date) {
        const date = new Date(req.body.date);
        requestData.date = date;
        
        if (req.body.isRecurring) {
          requestData.monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        } else {
          requestData.monthDay = null;
        }
      }
      
      const holidayData = insertHolidaySchema.partial().parse(requestData);
      const holiday = await storage.updateHoliday(id, holidayData);
      res.json(holiday);
    } catch (error) {
      console.error("Error updating holiday:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update holiday" });
    }
  });

  app.delete('/api/holidays/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteHoliday(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting holiday:", error);
      res.status(500).json({ message: "Failed to delete holiday" });
    }
  });

  // User Group routes
  app.get('/api/user-groups', async (req, res) => {
    try {
      const userGroups = await storage.getUserGroups();
      res.json(userGroups);
    } catch (error) {
      console.error("Error fetching user groups:", error);
      res.status(500).json({ message: "Failed to fetch user groups" });
    }
  });

  app.get('/api/user-groups/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const userGroup = await storage.getUserGroup(id);
      if (!userGroup) {
        return res.status(404).json({ message: "User group not found" });
      }
      res.json(userGroup);
    } catch (error) {
      console.error("Error fetching user group:", error);
      res.status(500).json({ message: "Failed to fetch user group" });
    }
  });

  app.post('/api/user-groups', async (req, res) => {
    try {
      const groupData = insertUserGroupSchema.parse(req.body);
      const userGroup = await storage.createUserGroup(groupData);
      res.status(201).json(userGroup);
    } catch (error) {
      console.error("Error creating user group:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user group" });
    }
  });

  app.put('/api/user-groups/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const groupData = insertUserGroupSchema.partial().parse(req.body);
      const userGroup = await storage.updateUserGroup(id, groupData);
      res.json(userGroup);
    } catch (error) {
      console.error("Error updating user group:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update user group" });
    }
  });

  app.delete('/api/user-groups/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteUserGroup(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user group:", error);
      res.status(500).json({ message: "Failed to delete user group" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
