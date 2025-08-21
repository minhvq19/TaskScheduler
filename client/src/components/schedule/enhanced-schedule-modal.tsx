import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type WorkSchedule, type Staff, type Department, type Holiday, type SystemConfigs } from "@shared/schema";
import { z } from "zod";
import { format, startOfDay, endOfDay, isWeekend, isSameDay, isBefore } from "date-fns";

const formSchema = z.object({
  staffId: z.string().min(1, "Vui lòng chọn cán bộ"),
  startDate: z.string().min(1, "Vui lòng chọn ngày bắt đầu"),
  endDate: z.string().min(1, "Vui lòng chọn ngày kết thúc"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  workType: z.string().min(1, "Vui lòng chọn nội dung công tác"),
  customContent: z.string().max(200).optional(),
// Removed customWorkType field
  isFullDay: z.boolean().default(false),
}).refine((data) => {
  if (!data.isFullDay) {
    return data.startTime && data.endTime;
  }
  return true;
}, {
  message: "Vui lòng chọn giờ bắt đầu và kết thúc khi không chọn cả ngày",
  path: ["startTime"]
});

type FormData = z.infer<typeof formSchema>;

const workTypes = [
  { value: "Nghỉ phép", label: "Nghỉ phép" },
  { value: "Trực lãnh đạo", label: "Trực lãnh đạo" },
  { value: "Đi công tác nước ngoài", label: "Đi công tác NN" },
  { value: "Đi khách hàng", label: "Đi khách hàng" },
  { value: "Khác", label: "Khác" },
];

// Removed customWorkTypes as "Đi khách hàng" is now a main work type

interface EnhancedScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule?: WorkSchedule | null;
}

export default function EnhancedScheduleModal({ isOpen, onClose, schedule }: EnhancedScheduleModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current date in yyyy-MM-dd format for form inputs
  const getCurrentDate = () => {
    const today = new Date();
    return format(today, "yyyy-MM-dd");
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      staffId: "",
      startDate: getCurrentDate(),
      endDate: getCurrentDate(),
      startTime: "",
      endTime: "",
      workType: "",
      customContent: "",
      isFullDay: false,
    },
  });

  const watchedWorkType = form.watch("workType");
// Removed watchedCustomWorkType
  const watchedIsFullDay = form.watch("isFullDay");
  const watchedStartDate = form.watch("startDate");
  const watchedEndDate = form.watch("endDate");

  // Fetch system configuration for weekend policy
  const { data: systemConfigs = [] } = useQuery<SystemConfigs[]>({
    queryKey: ["/api/system-config"],
    refetchInterval: 300000, // 5 minutes
  });

  const allowWeekendSchedule = systemConfigs.find(c => c.key === 'policies.allow_weekend_schedule')?.value === 'true';

  // Handle date input change to prevent weekend and holiday selection
  const handleDateChange = (field: "startDate" | "endDate", value: string) => {
    console.log(`handleDateChange called for ${field} with value:`, value);
    
    if (value) {
      const selectedDate = new Date(value);
      const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 6 = Saturday
      
      console.log(`Selected date: ${value}, day of week: ${dayOfWeek}`);
      
      // Check weekend restriction based on system config
      if (!allowWeekendSchedule && (dayOfWeek === 0 || dayOfWeek === 6)) {
        console.log("Weekend detected, preventing selection due to policy");
        // Reset the field and show error
        form.setValue(field, "");
        form.setError(field, {
          message: "Không thể chọn ngày cuối tuần (Thứ 7, Chủ nhật) - Bị cấm bởi chính sách hệ thống"
        });
        toast({
          title: "Lỗi",
          description: "Không thể chọn ngày cuối tuần (Thứ 7, Chủ nhật) - Bị cấm bởi chính sách hệ thống",
          variant: "destructive",
        });
        return;
      }
      
      if (isHoliday(value)) {
        console.log("Holiday detected, preventing selection");
        // Reset the field and show error
        form.setValue(field, "");
        form.setError(field, {
          message: "Không thể chọn ngày lễ"
        });
        toast({
          title: "Lỗi",
          description: "Không thể chọn ngày lễ",
          variant: "destructive",
        });
        return;
      }
      
      // If valid weekday and not holiday, clear any previous errors and set value
      form.clearErrors(field);
      form.setValue(field, value);
      
      // Auto-fill endDate when startDate is set and isFullDay is checked
      if (field === "startDate" && watchedIsFullDay) {
        form.setValue("endDate", value);
        form.clearErrors("endDate");
      }
    }
  };

  // Fetch staff (filter for Ban Giám đốc)
  const { data: allStaff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  // Fetch departments to find Ban Giám đốc
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  // Fetch holidays
  const { data: holidays = [] } = useQuery<Holiday[]>({
    queryKey: ["/api/holidays"],
  });

  // Fetch user edit permissions
  const { data: editPermissions } = useQuery<{editableStaffIds: string[]}>({
    queryKey: ["/api/user-edit-permissions"],
  });



  const boardDept = departments.find(d => d.name.toLowerCase().includes("ban giám đốc"));
  // Chỉ hiện staff mà user được phân quyền
  const boardStaff = allStaff
    .filter(s => s.departmentId === boardDept?.id)
    .filter(s => editPermissions?.editableStaffIds.includes(s.id) || false)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  // Get work hours from config
  const workStartTime = systemConfigs.find(c => c.key === 'work_hours.start_time')?.value || '08:00';
  const workEndTime = systemConfigs.find(c => c.key === 'work_hours.end_time')?.value || '17:30';

  // Validation functions
  const isHoliday = (dateString: string) => {
    const date = new Date(dateString);
    return holidays.some(holiday => {
      const holidayDate = new Date(holiday.date);
      
      // Check exact date match
      if (isSameDay(holidayDate, date)) {
        return true;
      }
      
      // Check recurring holiday (same month-day but different year)
      if (holiday.isRecurring) {
        const holidayMonthDay = `${String(holidayDate.getMonth() + 1).padStart(2, '0')}-${String(holidayDate.getDate()).padStart(2, '0')}`;
        const checkMonthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        return holidayMonthDay === checkMonthDay;
      }
      
      return false;
    });
  };

  const isValidWorkDay = (dateString: string) => {
    const date = new Date(dateString);
    return !isWeekend(date) && !isHoliday(dateString);
  };

  const isValidWorkTime = (timeString: string, dateString?: string) => {
    if (!timeString) return true;
    
    // Check if time is within work hours
    if (timeString < workStartTime || timeString > workEndTime) {
      return false;
    }
    
    // Allow past times - removed past time validation
    return true;
  };

  // Set default times when full day is checked
  useEffect(() => {
    if (watchedIsFullDay) {
      form.setValue("startTime", workStartTime);
      form.setValue("endTime", workEndTime);
      
      // Auto-fill endDate with startDate when full day is checked
      if (watchedStartDate) {
        form.setValue("endDate", watchedStartDate);
        form.clearErrors("endDate");
      }
    }
  }, [watchedIsFullDay, workStartTime, workEndTime, form, watchedStartDate]);

  // Monitor form values and prevent weekends
  useEffect(() => {
    const checkAndPreventWeekends = (field: "startDate" | "endDate", value: string) => {
      if (value) {
        const selectedDate = new Date(value);
        const dayOfWeek = selectedDate.getDay();
        
        // Check weekend restriction based on system config
        if (!allowWeekendSchedule && (dayOfWeek === 0 || dayOfWeek === 6)) {
          console.log(`Weekend detected in useEffect for ${field}, clearing value due to policy`);
          form.setValue(field, "");
          form.setError(field, {
            message: "Không thể chọn ngày cuối tuần (Thứ 7, Chủ nhật) - Bị cấm bởi chính sách hệ thống"
          });
          toast({
            title: "Lỗi",
            description: "Không thể chọn ngày cuối tuần (Thứ 7, Chủ nhật) - Bị cấm bởi chính sách hệ thống",
            variant: "destructive",
          });
        }
      }
    };

    if (watchedStartDate) {
      checkAndPreventWeekends("startDate", watchedStartDate);
    }
    if (watchedEndDate) {
      checkAndPreventWeekends("endDate", watchedEndDate);
    }
  }, [watchedStartDate, watchedEndDate, form, toast, allowWeekendSchedule]);


  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const startDateTime = new Date(`${data.startDate}T${data.startTime || workStartTime}:00`);
      const endDateTime = new Date(`${data.endDate}T${data.endTime || workEndTime}:00`);

      const payload = {
        staffId: data.staffId,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        workType: data.workType,
        customContent: data.workType === "Khác" ? data.customContent : undefined,
      };
      await apiRequest("POST", "/api/work-schedules", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-schedules"] });
      toast({
        title: "Thành công",
        description: "Đã thêm lịch công tác thành công.",
      });
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể thêm lịch công tác.",
        variant: "destructive",
      });
    },
  });

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const startDateTime = new Date(`${data.startDate}T${data.startTime || workStartTime}:00`);
      const endDateTime = new Date(`${data.endDate}T${data.endTime || workEndTime}:00`);

      const payload = {
        staffId: data.staffId,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        workType: data.workType,
        customContent: data.workType === "Khác" ? data.customContent : undefined,
      };
      await apiRequest("PUT", `/api/work-schedules/${schedule?.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-schedules"] });
      toast({
        title: "Thành công",
        description: "Đã cập nhật lịch công tác thành công.",
      });
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật lịch công tác.",
        variant: "destructive",
      });
    },
  });

  // Load existing schedule data when editing
  useEffect(() => {
    if (schedule && isOpen) {
      const startDate = new Date(schedule.startDateTime);
      const endDate = new Date(schedule.endDateTime);
      
      const startTimeStr = format(startDate, "HH:mm");
      const endTimeStr = format(endDate, "HH:mm");
      
      // Check if it's a full day (matches work hours)
      const isFullDay = startTimeStr === workStartTime && endTimeStr === workEndTime;

      form.reset({
        staffId: schedule.staffId,
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        startTime: startTimeStr,
        endTime: endTimeStr,
        workType: schedule.workType,
        customContent: schedule.customContent || "",
        isFullDay: isFullDay,
      });
    }
  }, [schedule, isOpen, form, workStartTime, workEndTime]);

  const handleSubmit = (data: FormData) => {
    // Only validate times if not full day and times are provided
    if (!data.isFullDay && data.startTime && !isValidWorkTime(data.startTime, data.startDate)) {
      form.setError("startTime", { message: `Giờ bắt đầu phải trong khoảng ${workStartTime} - ${workEndTime}` });
      return;
    }

    if (!data.isFullDay && data.endTime && !isValidWorkTime(data.endTime, data.endDate)) {
      form.setError("endTime", { message: `Giờ kết thúc phải trong khoảng ${workStartTime} - ${workEndTime}` });
      return;
    }

    if (schedule) {
      updateScheduleMutation.mutate(data);
    } else {
      createScheduleMutation.mutate(data);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const isLoading = createScheduleMutation.isPending || updateScheduleMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg lg:max-w-2xl overflow-hidden flex flex-col max-h-[80vh]" data-testid="dialog-enhanced-schedule">
        <DialogHeader className="pb-3 flex-shrink-0">
          <DialogTitle className="text-lg font-semibold text-center" data-testid="title-schedule">
            {schedule ? "Sửa lịch công tác" : "Thêm lịch công tác"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pb-1 min-h-0">
          <form id="enhanced-schedule-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-2 sm:space-y-4">
          {/* Staff Selection */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="staffId" className="text-sm font-medium">Cán bộ *</Label>
            <Select 
              value={form.watch("staffId")} 
              onValueChange={(value) => form.setValue("staffId", value)}
              data-testid="select-staff"
            >
              <SelectTrigger className="h-11 text-sm sm:h-9 sm:text-base">
                <SelectValue placeholder="Chọn cán bộ" />
              </SelectTrigger>
              <SelectContent>
                {boardStaff.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.positionShort} {staff.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.staffId && (
              <p className="text-sm text-red-500">{form.formState.errors.staffId.message}</p>
            )}
          </div>

          {/* Work Type */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="workType" className="text-sm font-medium">Nội dung công tác *</Label>
            <Select 
              value={form.watch("workType")} 
              onValueChange={(value) => form.setValue("workType", value)}
              data-testid="select-work-type"
            >
              <SelectTrigger className="h-11 text-sm sm:h-9 sm:text-base">
                <SelectValue placeholder="Chọn nội dung công tác" />
              </SelectTrigger>
              <SelectContent>
                {workTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.workType && (
              <p className="text-sm text-red-500">{form.formState.errors.workType.message}</p>
            )}
          </div>

          {/* Full Day Checkbox */}
          <div className="flex items-center space-x-2 py-1">
            <Checkbox
              id="isFullDay"
              checked={watchedIsFullDay}
              onCheckedChange={(checked) => form.setValue("isFullDay", checked as boolean)}
              data-testid="checkbox-full-day"
            />
            <Label htmlFor="isFullDay" className="text-xs sm:text-sm">Cả ngày ({workStartTime} - {workEndTime})</Label>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="startDate" className="text-sm font-medium">Ngày bắt đầu *</Label>
              <Input
                id="startDate"
                type="date"
                value={watchedStartDate || ""}
                onChange={(e) => {
                  console.log("Start date onChange triggered:", e.target.value);
                  handleDateChange("startDate", e.target.value);
                }}
                onBlur={(e) => {
                  console.log("Start date onBlur triggered:", e.target.value);
                  handleDateChange("startDate", e.target.value);
                }}
                className="h-11 text-sm sm:h-9 sm:text-base"
                data-testid="input-start-date"
              />
              {form.formState.errors.startDate && (
                <p className="text-sm text-red-500">{form.formState.errors.startDate.message}</p>
              )}
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="endDate" className="text-sm font-medium">Ngày kết thúc *</Label>
              <Input
                id="endDate"
                type="date"
                value={watchedEndDate || ""}
                onChange={(e) => {
                  console.log("End date onChange triggered:", e.target.value);
                  handleDateChange("endDate", e.target.value);
                }}
                onBlur={(e) => {
                  console.log("End date onBlur triggered:", e.target.value);
                  handleDateChange("endDate", e.target.value);
                }}
                className="h-11 text-sm sm:h-9 sm:text-base"
                data-testid="input-end-date"
              />
              {form.formState.errors.endDate && (
                <p className="text-sm text-red-500">{form.formState.errors.endDate.message}</p>
              )}
            </div>
          </div>

          {/* Time Range (only if not full day) */}
          {!watchedIsFullDay && (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="startTime" className="text-sm font-medium">Giờ bắt đầu *</Label>
                <Input
                  id="startTime"
                  type="time"
                  className="h-11 text-sm sm:h-9 sm:text-base"
                  {...form.register("startTime")}
                  data-testid="input-start-time"
                />
                {form.formState.errors.startTime && (
                  <p className="text-sm text-red-500">{form.formState.errors.startTime.message}</p>
                )}
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="endTime" className="text-sm font-medium">Giờ kết thúc *</Label>
                <Input
                  id="endTime"
                  type="time"
                  className="h-11 text-sm sm:h-9 sm:text-base"
                  {...form.register("endTime")}
                  data-testid="input-end-time"
                />
                {form.formState.errors.endTime && (
                  <p className="text-sm text-red-500">{form.formState.errors.endTime.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Custom Content (only for "Khác") */}
          {watchedWorkType === "Khác" && (
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="customContent" className="text-sm font-medium">Nội dung cụ thể</Label>
              <Textarea
                id="customContent"
                placeholder="Nhập nội dung cụ thể (tối đa 200 ký tự)"
                maxLength={200}
                rows={3}
                className="text-sm resize-none"
                {...form.register("customContent")}
                data-testid="textarea-custom-content"
              />
              {form.formState.errors.customContent && (
                <p className="text-sm text-red-500">{form.formState.errors.customContent.message}</p>
              )}
            </div>
          )}

          {/* Work Hours Info */}
          <div className="bg-blue-50 p-2.5 sm:p-3 rounded-md text-xs text-blue-700">
            <p className="mb-1"><strong>Giờ làm việc:</strong> {workStartTime} - {workEndTime}</p>
            <p className="mb-1"><strong>Lưu ý:</strong> {allowWeekendSchedule ? "Không thể chọn ngày lễ" : "Không thể chọn ngày cuối tuần (T7, CN) hoặc ngày lễ"}</p>
            {watchedWorkType === "Đi khách hàng" && (
              <p><strong>Ghi chú:</strong> Loại "Đi khách hàng" sẽ có chữ trắng trên nền xanh</p>
            )}
          </div>

          </form>
        </div>
        
        <div className="flex-shrink-0 pt-2 mt-1 border-t border-gray-100">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 h-10 text-sm"
              data-testid="button-cancel"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              form="enhanced-schedule-form"
              disabled={isLoading}
              className="flex-1 h-10 text-sm bg-bidv-teal hover:bg-bidv-teal/90 text-white"
              data-testid="button-submit"
            >
              {isLoading ? "Đang xử lý..." : (schedule ? "Cập nhật" : "Thêm")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}