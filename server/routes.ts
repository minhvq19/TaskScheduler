import type { Express } from "express";
import express from "express";
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
  insertMeetingRoomReservationSchema,
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

// Utility function để tạo tên file an toàn - thay dấu cách bằng dấu gạch dưới
function sanitizeFilename(filename: string): string {
  // Tách tên và extension
  const lastDotIndex = filename.lastIndexOf('.');
  const name = lastDotIndex !== -1 ? filename.substring(0, lastDotIndex) : filename;
  const ext = lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
  
  // Sanitize tên file: thay dấu cách bằng _ và loại bỏ ký tự đặc biệt khác
  const sanitizedName = name
    .replace(/\s+/g, '_') // Thay thế khoảng trắng bằng _
    .replace(/[^a-zA-Z0-9._\-]/g, '_') // Thay thế ký tự đặc biệt bằng _
    .replace(/_+/g, '_') // Loại bỏ nhiều dấu _ liên tiếp
    .replace(/^_|_$/g, ''); // Loại bỏ _ ở đầu và cuối
  
  return (sanitizedName + ext).toLowerCase();
}

// Configure multer for file uploads với custom filename handling
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Ensure both directories exist
      const uploadsDir = 'uploads/';
      const publicUploadsDir = path.join(process.cwd(), 'dist', 'public', 'uploads');
      
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      if (!fs.existsSync(publicUploadsDir)) {
        fs.mkdirSync(publicUploadsDir, { recursive: true });
      }
      
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      // Tạo tên file duy nhất với timestamp và random string
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const sanitizedName = sanitizeFilename(file.originalname);
      const filename = `${timestamp}-${randomString}-${sanitizedName}`;
      
      console.log('🔧 MULTER FILE UPLOAD NAMING:', {
        original: file.originalname,
        sanitized: sanitizedName,
        final: filename,
        timestamp: new Date(timestamp).toISOString(),
        willReplace: 'spaces with underscores',
        hasSpaces: file.originalname.includes(' '),
        finalHasSpaces: filename.includes(' ')
      });
      
      cb(null, filename);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (jpg, jpeg, png, gif, webp) are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Static serving for uploaded images - try both paths for compatibility
  app.use('/uploads', express.static(path.join(process.cwd(), 'dist', 'public', 'uploads')));
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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

  // Middleware kiểm tra quyền cho function cụ thể
  const requirePermission = (functionName: string, requiredPermission: 'VIEW' | 'EDIT' = 'VIEW') => {
    return async (req: any, res: any, next: any) => {
      try {
        if (!req.user?.userGroupId) {
          return res.status(403).json({ message: "Access denied - No user group" });
        }

        // Lấy thông tin user group và permissions
        const userGroup = await storage.getUserGroup(req.user.userGroupId);
        if (!userGroup) {
          return res.status(403).json({ message: "Access denied - Invalid user group" });
        }

        // Admin group có tất cả quyền
        if (userGroup.id === 'admin-group') {
          return next();
        }

        // Kiểm tra quyền cụ thể cho function
        const permissions = userGroup.permissions as any;
        const userPermission = permissions[functionName];

        if (!userPermission) {
          return res.status(403).json({ 
            message: `Access denied - No permission for ${functionName}` 
          });
        }

        // Kiểm tra level quyền
        if (requiredPermission === 'EDIT' && userPermission !== 'EDIT') {
          return res.status(403).json({ 
            message: `Access denied - Need EDIT permission for ${functionName}` 
          });
        }

        next();
      } catch (error) {
        console.error("Permission check error:", error);
        res.status(500).json({ message: "Permission check failed" });
      }
    };
  };

  // Routes phòng ban
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

  // Routes nhân viên
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
  app.get('/api/meeting-rooms', requireAuth, requirePermission('rooms', 'VIEW'), async (req, res) => {
    try {
      const rooms = await storage.getMeetingRooms();
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching meeting rooms:", error);
      res.status(500).json({ message: "Failed to fetch meeting rooms" });
    }
  });

  app.post('/api/meeting-rooms', requireAuth, requirePermission('rooms', 'EDIT'), async (req, res) => {
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

  app.put('/api/meeting-rooms/:id', requireAuth, requirePermission('rooms', 'EDIT'), async (req, res) => {
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

  app.delete('/api/meeting-rooms/:id', requireAuth, requirePermission('rooms', 'EDIT'), async (req, res) => {
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
      
      // Kiểm tra quyền xem work schedules cho non-admin users
      const userGroup = await storage.getUserGroup(req.user.userGroupId);
      if (userGroup && userGroup.id !== 'admin-group') {
        const permissions = userGroup.permissions as any;
        if (!permissions['workSchedules'] || permissions['workSchedules'] === 'NONE') {
          return res.status(403).json({ 
            message: "Bạn không có quyền xem lịch công tác" 
          });
        }
        
        // Lấy tất cả staff trong phòng "Ban giám đốc"
        const allStaff = await storage.getStaff();
        const banGiamDocStaff = allStaff.filter(staff => staff.departmentId === '49afe0f4-1eb7-4b2c-9673-3ba79a973c96');
        const banGiamDocStaffIds = banGiamDocStaff.map(staff => staff.id);
        
        // Lấy tất cả lịch của phòng Ban giám đốc
        const allSchedules = await storage.getWorkSchedules(
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined,
          staffId as string
        );
        
        const filteredSchedules = allSchedules.filter(schedule => 
          banGiamDocStaffIds.includes(schedule.staffId)
        );
        
        return res.json(filteredSchedules);
      }
      
      // Admin có thể xem tất cả
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

  app.post('/api/work-schedules', requireAuth, requirePermission('workSchedules', 'EDIT'), async (req, res) => {
    try {
      const validatedData = insertWorkScheduleSchema.parse({
        ...req.body,
        startDateTime: new Date(req.body.startDateTime),
        endDateTime: new Date(req.body.endDateTime),
        createdBy: (req.user as any)?.id || 'admin-user',
      });

      // Kiểm tra quyền tạo lịch cho staff cụ thể (chỉ áp dụng cho non-admin)
      const userGroup = await storage.getUserGroup(req.user.userGroupId);
      if (userGroup && userGroup.id !== 'admin-group') {
        const hasPermissionForStaff = await storage.getSchedulePermissionsByUser(req.user.id);
        const allowedStaffIds = hasPermissionForStaff.map(p => p.staffId);
        
        // Nếu chưa được phân quyền cho staff nào, không cho phép tạo lịch
        if (allowedStaffIds.length === 0) {
          return res.status(403).json({ 
            message: "Bạn chưa được phân quyền tạo lịch công tác cho nhân viên nào" 
          });
        }
        
        if (!allowedStaffIds.includes(validatedData.staffId)) {
          return res.status(403).json({ 
            message: "Bạn không có quyền tạo lịch công tác cho nhân viên này" 
          });
        }
      }

      // Check daily limit (max 4 schedules per staff per day) for the entire date range
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
          message: `Không thể thêm lịch công tác. Ngày ${violatingDateFormatted} đã có ${validation.currentCount} lịch công tác, vượt quá giới hạn 4 lịch cho mỗi ngày.`
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

  app.put('/api/work-schedules/:id', requireAuth, requirePermission('workSchedules', 'EDIT'), async (req, res) => {
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

  app.delete('/api/work-schedules/:id', requireAuth, requirePermission('workSchedules', 'EDIT'), async (req, res) => {
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
      
      // Kiểm tra quyền xem meeting schedules cho non-admin users
      const userGroup = await storage.getUserGroup(req.user.userGroupId);
      if (userGroup && userGroup.id !== 'admin-group') {
        const permissions = userGroup.permissions as any;
        if (!permissions['meetingSchedules'] || permissions['meetingSchedules'] === 'NONE') {
          return res.status(403).json({ 
            message: "Bạn không có quyền xem lịch họp" 
          });
        }
        
        // Nếu không phải admin, kiểm tra quyền tạo meeting schedule
        const hasPermissionForStaff = await storage.getSchedulePermissionsByUser(req.user.id);
        if (hasPermissionForStaff.length === 0) {
          return res.json([]);
        }
      }
      
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

  app.post('/api/meeting-schedules', requireAuth, requirePermission('meetingSchedules', 'EDIT'), async (req, res) => {
    try {
      const validatedData = insertMeetingScheduleSchema.parse(req.body);
      
      // Kiểm tra quyền đặt lịch họp (chỉ áp dụng cho non-admin)
      const userGroup = await storage.getUserGroup(req.user.userGroupId);
      if (userGroup && userGroup.id !== 'admin-group') {
        const hasPermissionForStaff = await storage.getSchedulePermissionsByUser(req.user.id);
        if (hasPermissionForStaff.length === 0) {
          return res.status(403).json({ 
            message: "Bạn chưa được phân quyền tạo lịch họp" 
          });
        }
      }
      
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

  app.put('/api/meeting-schedules/:id', requireAuth, requirePermission('meetingSchedules', 'EDIT'), async (req, res) => {
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

  app.delete('/api/meeting-schedules/:id', requireAuth, requirePermission('meetingSchedules', 'EDIT'), async (req, res) => {
    try {
      await storage.deleteMeetingSchedule(req.params.id);
      res.status(200).json({ message: "Meeting schedule deleted successfully" });
    } catch (error) {
      console.error("Error deleting meeting schedule:", error);
      res.status(500).json({ message: "Failed to delete meeting schedule" });
    }
  });

  // Routes sự kiện khác với upload file
  app.get('/api/other-events', requireAuth, requirePermission('otherEvents', 'VIEW'), async (req, res) => {
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

  app.post('/api/other-events', requireAuth, requirePermission('otherEvents', 'EDIT'), upload.array('images', 4), async (req, res) => {
    try {
      let imageUrl = undefined;
      let imageUrls: string[] = [];
      
      if (req.files && Array.isArray(req.files)) {
        // Xử lý nhiều file với tên đã được sanitize từ multer (dấu cách -> _)
        for (const file of req.files) {
          // file.filename đã được sanitize bởi multer storage configuration
          const publicPath = path.join(process.cwd(), 'dist', 'public', 'uploads', file.filename);
          const backupPath = path.join(process.cwd(), 'uploads', file.filename);
          
          // Ensure both directories exist
          [path.dirname(publicPath), path.dirname(backupPath)].forEach(dir => {
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
          });
          
          // Copy file to BOTH locations for redundancy - ENHANCED ERROR HANDLING
          try {
            if (!fs.existsSync(file.path)) {
              const error = `Source file not found: ${file.path}`;
              console.error('✗ CRITICAL SOURCE ERROR:', error);
              return res.status(500).json({ message: 'File upload failed - source not found' });
            }

            // Copy to public directory (for serving)
            fs.copyFileSync(file.path, publicPath);
            console.log('✓ Copied to PUBLIC:', publicPath);

            // Copy to backup directory (for backup)
            fs.copyFileSync(file.path, backupPath);
            console.log('✓ Copied to BACKUP:', backupPath);

            // Verify both copies exist
            const publicExists = fs.existsSync(publicPath);
            const backupExists = fs.existsSync(backupPath);
            
            if (!publicExists || !backupExists) {
              throw new Error(`Copy verification failed: public=${publicExists}, backup=${backupExists}`);
            }

            console.log('🎉 FILE UPLOAD COMPLETE SUCCESS:', {
              original: file.originalname,
              sanitized: file.filename,
              source: file.path,
              publicPath,
              backupPath,
              publicExists,
              backupExists,
              fileSize: fs.statSync(publicPath).size,
              httpUrl: `http://localhost:5000/uploads/${file.filename}`
            });

          } catch (error) {
            console.error('✗ CRITICAL COPY ERROR:', error);
            return res.status(500).json({ 
              message: 'File upload failed - copy error', 
              error: String(error),
              filename: file.filename 
            });
          }
          
          // Sử dụng tên file đã sanitize (có _ thay vì dấu cách) cho database
          const fileUrl = `/uploads/${file.filename}`;
          imageUrls.push(fileUrl);
        }
        
        // Đặt ảnh đầu tiên làm imageUrl chính để tương thích ngược
        if (imageUrls.length > 0) {
          imageUrl = imageUrls[0];
        }
      }

      const validatedData = insertOtherEventSchema.parse({
        ...req.body,
        imageUrl,
        imageUrls,
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

  app.put('/api/other-events/:id', requireAuth, requirePermission('otherEvents', 'EDIT'), upload.array('images', 4), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Lấy thông tin sự kiện hiện tại để có ảnh cũ
      const existingEvent = await storage.getOtherEvent(id);
      const oldImageUrls = existingEvent?.imageUrls || (existingEvent?.imageUrl ? [existingEvent.imageUrl] : []);
      
      let imageUrl = req.body.imageUrl; // Giữ ảnh hiện có nếu không tải ảnh mới
      let imageUrls = req.body.imageUrls ? JSON.parse(req.body.imageUrls) : [];
      
      // Xóa ảnh cũ không còn được sử dụng
      if (oldImageUrls.length > 0) {
        const imagesToDelete = oldImageUrls.filter((oldUrl: string) => !imageUrls.includes(oldUrl));
        imagesToDelete.forEach((urlToDelete: string) => {
          if (urlToDelete && urlToDelete.startsWith('/uploads/')) {
            const filename = urlToDelete.replace('/uploads/', '');
            const publicPath = path.join(process.cwd(), 'dist', 'public', 'uploads', filename);
            const backupPath = path.join(process.cwd(), 'uploads', filename);
            
            // Xóa file từ cả hai vị trí
            if (fs.existsSync(publicPath)) {
              fs.unlinkSync(publicPath);
            }
            if (fs.existsSync(backupPath)) {
              fs.unlinkSync(backupPath);
            }
          }
        });
      }
      
      if (req.files && Array.isArray(req.files)) {
        // Xử lý các file mới với tên đã được sanitize từ multer (dấu cách -> _)
        const newImageUrls: string[] = [];
        for (const file of req.files) {
          // file.filename đã được sanitize bởi multer storage configuration
          const publicPath = path.join(process.cwd(), 'dist', 'public', 'uploads', file.filename);
          
          // Ensure uploads directory exists
          const uploadsDir = path.dirname(publicPath);
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          
          // Copy file to public uploads directory for serving
          try {
            if (fs.existsSync(file.path)) {
              fs.copyFileSync(file.path, publicPath);
              console.log('File copied to public directory with sanitized name:', publicPath);
            } else {
              console.error('Source file does not exist:', file.path);
            }
          } catch (error) {
            console.error('Error copying file to public directory:', error);
          }
          
          console.log('File update processed with space->underscore replacement:', {
            original: file.originalname,
            sanitizedFilename: file.filename,
            sourcePath: file.path,
            publicPath,
            sourceExists: fs.existsSync(file.path),
            publicExists: fs.existsSync(publicPath),
            databaseUrl: `/uploads/${file.filename}`
          });
          
          const fileUrl = `/uploads/${file.filename}`;
          newImageUrls.push(fileUrl);
        }
        
        // Thêm ảnh mới vào mảng hiện có (tối đa 4 ảnh)
        imageUrls = [...imageUrls, ...newImageUrls].slice(0, 4);
        
        // Đặt ảnh đầu tiên làm imageUrl chính để tương thích ngược
        if (imageUrls.length > 0) {
          imageUrl = imageUrls[0];
        }
      }

      const validatedData = insertOtherEventSchema.partial().parse({
        ...req.body,
        imageUrl,
        imageUrls,
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

  app.delete('/api/other-events/:id', requireAuth, requirePermission('otherEvents', 'EDIT'), async (req, res) => {
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

  // Public meeting rooms endpoint
  app.get('/api/public/meeting-rooms', async (req, res) => {
    try {
      const rooms = await storage.getMeetingRooms();
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching public meeting rooms:", error);
      res.status(500).json({ message: "Failed to fetch meeting rooms" });
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
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      const allWorkSchedules = await storage.getWorkSchedules(thirtyDaysAgo, thirtyDaysFromNow);
      const allMeetingSchedules = await storage.getMeetingSchedules(thirtyDaysAgo, thirtyDaysFromNow);
      const allOtherEvents = await storage.getOtherEvents(thirtyDaysAgo, thirtyDaysFromNow);

      // Filter schedules that are active in the next 7 days
      const startOfToday = new Date(today);
      startOfToday.setHours(0, 0, 0, 0);
      const sevenDaysFromNow = new Date(today);
      sevenDaysFromNow.setDate(today.getDate() + 7);
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

      // Send all events (no filtering by 7-day range for other events as they might be long-running)
      const otherEvents = allOtherEvents;

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
  app.get('/api/holidays', requireAuth, requirePermission('holidays', 'VIEW'), async (req, res) => {
    try {
      const holidays = await storage.getHolidays();
      res.json(holidays);
    } catch (error) {
      console.error("Error fetching holidays:", error);
      res.status(500).json({ message: "Failed to fetch holidays" });
    }
  });

  app.get('/api/holidays/:id', requireAuth, requirePermission('holidays', 'VIEW'), async (req, res) => {
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

  app.post('/api/holidays', requireAuth, requirePermission('holidays', 'EDIT'), async (req, res) => {
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

  app.put('/api/holidays/:id', requireAuth, requirePermission('holidays', 'EDIT'), async (req, res) => {
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

  app.delete('/api/holidays/:id', requireAuth, requirePermission('holidays', 'EDIT'), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteHoliday(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting holiday:", error);
      res.status(500).json({ message: "Failed to delete holiday" });
    }
  });

  // API để frontend biết user có thể edit lịch của staff nào
  app.get('/api/user-edit-permissions', requireAuth, async (req, res) => {
    try {
      // Admin có thể edit tất cả
      const userGroup = await storage.getUserGroup((req.user as any).userGroupId);
      if (userGroup && userGroup.id === 'admin-group') {
        const allStaff = await storage.getStaff();
        const allStaffIds = allStaff.map(staff => staff.id);
        return res.json({ editableStaffIds: allStaffIds });
      }
      
      // Non-admin: chỉ có thể edit staff được phân quyền
      const hasPermissionForStaff = await storage.getSchedulePermissionsByUser((req.user as any).id);
      const allowedStaffIds = hasPermissionForStaff.map(p => p.staffId);
      
      res.json({ editableStaffIds: allowedStaffIds });
    } catch (error) {
      console.error("Error fetching user edit permissions:", error);
      res.status(500).json({ message: "Failed to fetch edit permissions" });
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

  // Meeting Room Reservations Routes
  // Get all reservations with filters and sorting
  app.get("/api/meeting-room-reservations", isAuthenticated, async (req, res) => {
    try {
      const { status, sortBy } = req.query;
      const reservations = await storage.getMeetingRoomReservations({
        status: status as string,
        sortBy: sortBy as string,
      });
      res.json(reservations);
    } catch (error) {
      console.error("Error fetching reservations:", error);
      res.status(500).json({ message: "Không thể tải danh sách đăng ký" });
    }
  });

  // Create new reservation (for Thư ký cấp Phòng only)
  app.post("/api/meeting-room-reservations", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userGroupName = user?.userGroup?.name?.toLowerCase();
      
      // Check if user is "Thư ký cấp Phòng"
      if (!userGroupName?.includes("thư ký cấp phòng")) {
        return res.status(403).json({ 
          message: "Chỉ Thư ký cấp Phòng mới có quyền đăng ký phòng họp" 
        });
      }

      const validatedData = insertMeetingRoomReservationSchema.parse(req.body);
      
      // Check for conflicts with approved reservations
      const hasConflict = await storage.checkReservationConflict(
        validatedData.roomId,
        validatedData.startDateTime,
        validatedData.endDateTime
      );
      
      if (hasConflict) {
        return res.status(409).json({ 
          message: "Phòng họp đã có lịch họp được duyệt trong khoảng thời gian này" 
        });
      }

      const reservation = await storage.createMeetingRoomReservation({
        ...validatedData,
        requestedBy: user.id,
      });
      
      res.status(201).json(reservation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: "Dữ liệu không hợp lệ", 
          errors: error.errors 
        });
      } else {
        console.error("Error creating reservation:", error);
        res.status(500).json({ message: "Không thể tạo đăng ký phòng họp" });
      }
    }
  });

  // Approve/Reject reservation (for Thư ký cấp Chi nhánh only)
  app.patch("/api/meeting-room-reservations/:id/status", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userGroupName = user?.userGroup?.name?.toLowerCase();
      
      // Check if user is "Thư ký cấp Chi nhánh"
      if (!userGroupName?.includes("thư ký cấp chi nhánh")) {
        return res.status(403).json({ 
          message: "Chỉ Thư ký cấp Chi nhánh mới có quyền phê duyệt" 
        });
      }

      const { id } = req.params;
      const { status, rejectionReason } = req.body;
      
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ 
          message: "Trạng thái không hợp lệ" 
        });
      }

      // If approving, check for conflicts again
      if (status === "approved") {
        const reservation = await storage.getMeetingRoomReservationById(id);
        if (!reservation) {
          return res.status(404).json({ message: "Không tìm thấy đăng ký" });
        }

        const hasConflict = await storage.checkReservationConflict(
          reservation.roomId,
          reservation.startDateTime,
          reservation.endDateTime,
          id // exclude current reservation
        );
        
        if (hasConflict) {
          return res.status(409).json({ 
            message: "Không thể duyệt do trùng lịch với các đăng ký đã được duyệt khác" 
          });
        }
      }

      const updatedReservation = await storage.updateReservationStatus(
        id,
        status,
        user.id,
        rejectionReason
      );
      
      res.json(updatedReservation);
    } catch (error) {
      console.error("Error updating reservation status:", error);
      res.status(500).json({ message: "Không thể cập nhật trạng thái đăng ký" });
    }
  });

  // Delete reservation (only pending ones, by requester only)
  app.delete("/api/meeting-room-reservations/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { id } = req.params;
      
      const reservation = await storage.getMeetingRoomReservationById(id);
      if (!reservation) {
        return res.status(404).json({ message: "Không tìm thấy đăng ký" });
      }

      // Only allow deletion by the requester and only if pending
      if (reservation.requestedBy !== user.id) {
        return res.status(403).json({ 
          message: "Bạn chỉ có thể xóa đăng ký do mình tạo" 
        });
      }

      if (reservation.status !== "pending") {
        return res.status(400).json({ 
          message: "Chỉ có thể xóa đăng ký đang chờ duyệt" 
        });
      }

      await storage.deleteMeetingRoomReservation(id);
      res.json({ message: "Đã xóa đăng ký phòng họp" });
    } catch (error) {
      console.error("Error deleting reservation:", error);
      res.status(500).json({ message: "Không thể xóa đăng ký" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
