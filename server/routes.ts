import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertDepartmentSchema,
  insertStaffSchema,
  insertMeetingRoomSchema,
  insertEventCategorySchema,
  insertWorkScheduleSchema,
  insertMeetingScheduleSchema,
  insertOtherEventSchema,
  insertUserGroupSchema,
  insertSystemUserSchema,
  insertSchedulePermissionSchema,
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
      const validatedData = insertStaffSchema.partial().parse(req.body);
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
      console.log('User in req:', req.user);
      const validatedData = insertWorkScheduleSchema.parse({
        ...req.body,
        startDateTime: new Date(req.body.startDateTime),
        endDateTime: new Date(req.body.endDateTime),
        createdBy: req.user?.id || 'admin-user',
      });

      // Check daily limit (max 5 schedules per staff per day)
      const startOfDay = new Date(validatedData.startDateTime);
      startOfDay.setHours(0, 0, 0, 0);
      const existingSchedules = await storage.getWorkSchedulesByStaffAndDate(
        validatedData.staffId,
        startOfDay
      );

      if (existingSchedules.length >= 5) {
        return res.status(400).json({ 
          message: "Không thể thêm quá 5 lịch công tác cho một cá nhân trong cùng một ngày" 
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
        updatedBy: req.user.id,
      });
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

  // Public display endpoints (no auth required)
  app.get('/api/public/current-time', (req, res) => {
    res.json({ currentTime: new Date().toISOString() });
  });

  app.get('/api/public/display-data', async (req, res) => {
    try {
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      const workSchedules = await storage.getWorkSchedules(startOfDay, endOfDay);
      const meetingSchedules = await storage.getMeetingSchedules(startOfDay, endOfDay);
      const otherEvents = await storage.getOtherEvents(startOfDay, endOfDay);

      res.json({
        workSchedules,
        meetingSchedules,
        otherEvents,
        currentTime: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error fetching public display data:", error);
      res.status(500).json({ message: "Failed to fetch display data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
