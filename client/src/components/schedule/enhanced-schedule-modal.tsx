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
  { value: "Làm việc tại CN", label: "Làm việc tại CN" },
  { value: "Nghỉ phép", label: "Nghỉ phép" },
  { value: "Trực lãnh đạo", label: "Trực lãnh đạo" },
  { value: "Đi công tác trong nước", label: "Đi công tác trong nước" },
  { value: "Đi công tác nước ngoài", label: "Đi công tác nước ngoài" },
  { value: "Khác", label: "Khác" },
];

interface EnhancedScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule?: WorkSchedule | null;
}

export default function EnhancedScheduleModal({ isOpen, onClose, schedule }: EnhancedScheduleModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      staffId: "",
      startDate: "",
      endDate: "",
      startTime: "",
      endTime: "",
      workType: "",
      customContent: "",
      isFullDay: false,
    },
  });

  const watchedWorkType = form.watch("workType");
  const watchedIsFullDay = form.watch("isFullDay");
  const watchedStartDate = form.watch("startDate");
  const watchedEndDate = form.watch("endDate");

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

  // Fetch system config for work hours
  const { data: systemConfigs = [] } = useQuery<SystemConfigs[]>({
    queryKey: ["/api/system-config"],
  });

  const boardDept = departments.find(d => d.name.toLowerCase().includes("ban giám đốc"));
  const boardStaff = allStaff.filter(s => s.departmentId === boardDept?.id).sort((a, b) => 
    (a.displayOrder || 0) - (b.displayOrder || 0)
  );

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
    
    // If date is today, check if time is not in the past
    if (dateString) {
      const selectedDate = new Date(dateString);
      const today = new Date();
      
      if (isSameDay(selectedDate, today)) {
        const currentTime = format(new Date(), "HH:mm");
        return timeString >= currentTime;
      }
    }
    
    return true;
  };

  // Set default times when full day is checked
  useEffect(() => {
    if (watchedIsFullDay) {
      form.setValue("startTime", workStartTime);
      form.setValue("endTime", workEndTime);
    }
  }, [watchedIsFullDay, workStartTime, workEndTime, form]);

  // Validate dates when they change (only check weekends and holidays now)
  useEffect(() => {
    if (watchedStartDate) {      
      if (!isValidWorkDay(watchedStartDate)) {
        form.setError("startDate", {
          message: "Không thể chọn ngày cuối tuần hoặc ngày lễ"
        });
      } else {
        form.clearErrors("startDate");
      }
    }

    if (watchedEndDate) {
      if (!isValidWorkDay(watchedEndDate)) {
        form.setError("endDate", {
          message: "Không thể chọn ngày cuối tuần hoặc ngày lễ"
        });
      } else {
        form.clearErrors("endDate");
      }
    }
  }, [watchedStartDate, watchedEndDate, form, holidays]);

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
      const selectedDate = new Date(data.startDate);
      const today = new Date();
      
      if (isSameDay(selectedDate, today)) {
        form.setError("startTime", { message: "Không thể chọn giờ quá khứ" });
      } else {
        form.setError("startTime", { message: `Giờ bắt đầu phải trong khoảng ${workStartTime} - ${workEndTime}` });
      }
      return;
    }

    if (!data.isFullDay && data.endTime && !isValidWorkTime(data.endTime, data.endDate)) {
      const selectedDate = new Date(data.endDate);
      const today = new Date();
      
      if (isSameDay(selectedDate, today)) {
        form.setError("endTime", { message: "Không thể chọn giờ quá khứ" });
      } else {
        form.setError("endTime", { message: `Giờ kết thúc phải trong khoảng ${workStartTime} - ${workEndTime}` });
      }
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
      <DialogContent className="max-w-md" data-testid="dialog-enhanced-schedule">
        <DialogHeader>
          <DialogTitle data-testid="title-schedule">
            {schedule ? "Sửa lịch công tác" : "Thêm lịch công tác"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Staff Selection */}
          <div className="space-y-2">
            <Label htmlFor="staffId">Cán bộ *</Label>
            <Select 
              value={form.watch("staffId")} 
              onValueChange={(value) => form.setValue("staffId", value)}
              data-testid="select-staff"
            >
              <SelectTrigger>
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
          <div className="space-y-2">
            <Label htmlFor="workType">Nội dung công tác *</Label>
            <Select 
              value={form.watch("workType")} 
              onValueChange={(value) => form.setValue("workType", value)}
              data-testid="select-work-type"
            >
              <SelectTrigger>
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
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isFullDay"
              checked={watchedIsFullDay}
              onCheckedChange={(checked) => form.setValue("isFullDay", checked as boolean)}
              data-testid="checkbox-full-day"
            />
            <Label htmlFor="isFullDay">Cả ngày ({workStartTime} - {workEndTime})</Label>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Ngày bắt đầu *</Label>
              <Input
                id="startDate"
                type="date"
                min={format(new Date(), "yyyy-MM-dd")}
                {...form.register("startDate")}
                data-testid="input-start-date"
              />
              {form.formState.errors.startDate && (
                <p className="text-sm text-red-500">{form.formState.errors.startDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Ngày kết thúc *</Label>
              <Input
                id="endDate"
                type="date"
                min={format(new Date(), "yyyy-MM-dd")}
                {...form.register("endDate")}
                data-testid="input-end-date"
              />
              {form.formState.errors.endDate && (
                <p className="text-sm text-red-500">{form.formState.errors.endDate.message}</p>
              )}
            </div>
          </div>

          {/* Time Range (only if not full day) */}
          {!watchedIsFullDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Giờ bắt đầu *</Label>
                <Input
                  id="startTime"
                  type="time"
                  min={isSameDay(new Date(watchedStartDate || new Date()), new Date()) ? format(new Date(), "HH:mm") : workStartTime}
                  max={workEndTime}
                  {...form.register("startTime")}
                  data-testid="input-start-time"
                />
                {form.formState.errors.startTime && (
                  <p className="text-sm text-red-500">{form.formState.errors.startTime.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">Giờ kết thúc *</Label>
                <Input
                  id="endTime"
                  type="time"
                  min={isSameDay(new Date(watchedEndDate || new Date()), new Date()) ? format(new Date(), "HH:mm") : workStartTime}
                  max={workEndTime}
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
            <div className="space-y-2">
              <Label htmlFor="customContent">Nội dung cụ thể</Label>
              <Textarea
                id="customContent"
                placeholder="Nhập nội dung cụ thể (tối đa 200 ký tự)"
                maxLength={200}
                {...form.register("customContent")}
                data-testid="textarea-custom-content"
              />
              {form.formState.errors.customContent && (
                <p className="text-sm text-red-500">{form.formState.errors.customContent.message}</p>
              )}
            </div>
          )}

          {/* Work Hours Info */}
          <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-700">
            <p><strong>Giờ làm việc:</strong> {workStartTime} - {workEndTime}</p>
            <p><strong>Lưu ý:</strong> Không thể chọn ngày/giờ quá khứ, ngày cuối tuần (T7, CN) hoặc ngày lễ</p>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              data-testid="button-cancel"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              data-testid="button-submit"
            >
              {isLoading ? "Đang xử lý..." : (schedule ? "Cập nhật" : "Thêm")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}