import { useEffect } from "react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useMediaQuery } from "@/hooks/use-media-query";
import { apiRequest } from "@/lib/queryClient";
import { insertWorkScheduleSchema, type WorkSchedule, type Staff, type Department, type SystemConfigs } from "@shared/schema";
import { z } from "zod";
import { format, isBefore, startOfDay, isSameDay, isWeekend } from "date-fns";

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
  path: ["startTime"],
});

type FormData = z.infer<typeof formSchema>;

const workTypes = [
  { value: "Làm việc tại CN", label: "Làm việc tại CN" },
  { value: "Nghỉ phép", label: "Nghỉ phép" },
  { value: "Trực lãnh đạo", label: "Trực lãnh đạo" },
  { value: "Đi công tác nước ngoài", label: "Đi công tác NN" },
  { value: "Khác", label: "Khác" },
];

interface AddScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule?: WorkSchedule | null;
}

export default function AddScheduleModal({ isOpen, onClose, schedule }: AddScheduleModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery("(max-width: 640px)");

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

  // Fetch system configuration and holidays
  const { data: systemConfigs = [] } = useQuery<SystemConfigs[]>({
    queryKey: ["/api/system-config"],
  });
  
  const { data: holidays = [] } = useQuery<any[]>({
    queryKey: ["/api/holidays"],
  });
  
  // Get work hours from config
  const workStartTime = systemConfigs.find(c => c.key === 'work_hours.start_time')?.value || '08:00';
  const workEndTime = systemConfigs.find(c => c.key === 'work_hours.end_time')?.value || '17:30';
  const allowWeekendSchedule = systemConfigs.find(c => c.key === 'policies.allow_weekend_schedule')?.value === 'true';

  // Check if a date is a holiday
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

  // Handle date input change to prevent weekend and holiday selection
  const handleDateChange = (field: "startDate" | "endDate", value: string) => {
    console.log(`handleDateChange called for ${field} with value:`, value);
    
    if (value) {
      const selectedDate = new Date(value);
      const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 6 = Saturday
      
      console.log(`Selected date: ${value}, day of week: ${dayOfWeek}`);
      
      // Check weekend restriction based on system config
      if (!allowWeekendSchedule && (dayOfWeek === 0 || dayOfWeek === 6)) {
        console.log("Weekend detected, preventing selection");
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
  
  const isValidWorkTime = (timeString: string) => {
    if (!timeString) return true;
    // Check if time is within work hours
    return timeString >= workStartTime && timeString <= workEndTime;
  };

  // Fetch staff (filter for Ban Giám đốc)
  const { data: allStaff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  // Fetch departments to find Ban Giám đốc
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const boardDept = departments.find(d => d.name.toLowerCase().includes("ban giám đốc"));
  const boardStaff = allStaff.filter(s => s.departmentId === boardDept?.id).sort((a, b) => 
    (a.displayOrder || 0) - (b.displayOrder || 0)
  );

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

  useEffect(() => {
    if (schedule) {
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
    } else {
      form.reset({
        staffId: "",
        startDate: "",
        endDate: "",
        startTime: "",
        endTime: "",
        workType: "",
        customContent: "",
        isFullDay: false,
      });
    }
  }, [schedule, form, workStartTime, workEndTime]);

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

  const onSubmit = (data: FormData) => {
    // Validate times if not full day
    if (!data.isFullDay && data.startTime && !isValidWorkTime(data.startTime)) {
      form.setError("startTime", { message: `Giờ bắt đầu phải trong khoảng ${workStartTime} - ${workEndTime}` });
      return;
    }

    if (!data.isFullDay && data.endTime && !isValidWorkTime(data.endTime)) {
      form.setError("endTime", { message: `Giờ kết thúc phải trong khoảng ${workStartTime} - ${workEndTime}` });
      return;
    }
    
    const startDateTime = new Date(`${data.startDate}T${data.startTime || workStartTime}:00`);
    const endDateTime = new Date(`${data.endDate}T${data.endTime || workEndTime}:00`);

    // Validate end time is after start time
    if (endDateTime <= startDateTime) {
      toast({
        title: "Lỗi",
        description: "Thời gian kết thúc phải sau thời gian bắt đầu.",
        variant: "destructive",
      });
      return;
    }

    if (schedule) {
      updateScheduleMutation.mutate(data);
    } else {
      createScheduleMutation.mutate(data);
    }
  };

  const isLoading = createScheduleMutation.isPending || updateScheduleMutation.isPending;

  const title = schedule ? "Chỉnh sửa lịch công tác" : "Thêm lịch công tác";
  
  const formContent = (
    <>
      <div className="flex-grow overflow-y-auto pr-2">
          <form id="schedule-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-2 sm:space-y-4">
          <div className="space-y-2 sm:space-y-4">
            <div>
              <Label htmlFor="staffId" className="block text-sm font-medium text-gray-700 mb-2">
                Chọn cán bộ *
              </Label>
              <Select
                value={form.watch("staffId")}
                onValueChange={(value) => form.setValue("staffId", value, { shouldValidate: true })}
              >
                <SelectTrigger className="h-11 text-sm sm:h-9 sm:text-base" data-testid="select-staff">
                  <SelectValue placeholder="Chọn cán bộ Ban Giám đốc" />
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
                <p className="text-red-600 text-sm mt-1">
                  {form.formState.errors.staffId.message}
                </p>
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
              <div>
                <Label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Ngày bắt đầu *
                </Label>
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
                  className="h-11 text-sm sm:h-9 sm:text-base focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                  data-testid="input-start-date"
                />
                {form.formState.errors.startDate && (
                  <p className="text-red-600 text-sm mt-1">
                    {form.formState.errors.startDate.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Ngày kết thúc *
                </Label>
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
                  className="h-11 text-sm sm:h-9 sm:text-base focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                  data-testid="input-end-date"
                />
                {form.formState.errors.endDate && (
                  <p className="text-red-600 text-sm mt-1">
                    {form.formState.errors.endDate.message}
                  </p>
                )}
              </div>
            </div>

            {/* Time Range (only if not full day) */}
            {!watchedIsFullDay && (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-4">
                <div>
                  <Label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-2">
                    Giờ bắt đầu *
                  </Label>
                  <Input
                    id="startTime"
                    type="time"
                    {...form.register("startTime")}
                    className="h-11 text-sm sm:h-9 sm:text-base focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                    data-testid="input-start-time"
                  />
                  {form.formState.errors.startTime && (
                    <p className="text-red-600 text-sm mt-1">
                      {form.formState.errors.startTime.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-2">
                    Giờ kết thúc *
                  </Label>
                  <Input
                    id="endTime"
                    type="time"
                    {...form.register("endTime")}
                    className="h-11 text-sm sm:h-9 sm:text-base focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                    data-testid="input-end-time"
                  />
                  {form.formState.errors.endTime && (
                    <p className="text-red-600 text-sm mt-1">
                      {form.formState.errors.endTime.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="workType" className="block text-sm font-medium text-gray-700 mb-2">
                Nội dung công tác *
              </Label>
              <Select
                value={form.watch("workType")}
                onValueChange={(value) => form.setValue("workType", value, { shouldValidate: true })}
              >
                <SelectTrigger className="h-11 text-sm sm:h-9 sm:text-base" data-testid="select-work-type">
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
                <p className="text-red-600 text-sm mt-1">
                  {form.formState.errors.workType.message}
                </p>
              )}
            </div>

            {watchedWorkType === "Khác" && (
              <div>
                <Label htmlFor="customContent" className="block text-sm font-medium text-gray-700 mb-2">
                  Nội dung chi tiết *
                </Label>
                <Textarea
                  id="customContent"
                  {...form.register("customContent")}
                  rows={3}
                  maxLength={200}
                  placeholder="Nhập nội dung chi tiết (tối đa 200 ký tự)"
                  className="text-sm resize-none focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                  data-testid="input-custom-content"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {form.watch("customContent")?.length || 0}/200 ký tự
                </p>
                {form.formState.errors.customContent && (
                  <p className="text-red-600 text-sm mt-1">
                    {form.formState.errors.customContent.message}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Work Hours Info */}
          <div className="bg-blue-50 p-2.5 sm:p-3 rounded-md text-xs text-blue-700">
            <p className="mb-1"><strong>Giờ làm việc:</strong> {workStartTime} - {workEndTime}</p>
            <p className="mb-1"><strong>Lưu ý:</strong> {allowWeekendSchedule ? "Không thể chọn ngày lễ" : "Không thể chọn ngày cuối tuần (T7, CN) hoặc ngày lễ"}</p>
            <p><strong>Định dạng ngày:</strong> Ngày sẽ hiển thị theo định dạng dd/mm/yyyy</p>
          </div>

          </form>
        </div>
        
        <div className="flex-shrink-0 border-t pt-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-10 text-sm"
              data-testid="button-cancel"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              form="schedule-form"
              className="flex-1 h-10 text-sm bg-bidv-teal hover:bg-bidv-teal/90 text-white"
              disabled={isLoading}
              data-testid="button-submit"
            >
              {isLoading ? "Đang xử lý..." : "Thêm"}
            </Button>
          </div>
        </div>
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[75vh] max-h-[600px] flex flex-col p-4 w-full max-w-full" data-testid="modal-add-schedule">
          <SheetHeader className="pb-2 flex-shrink-0">
            <SheetTitle className="text-lg font-semibold text-center" data-testid="text-modal-title">
              {title}
            </SheetTitle>
          </SheetHeader>
          {formContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl overflow-hidden flex flex-col max-h-[80vh]" data-testid="modal-add-schedule">
        <DialogHeader className="pb-3 flex-shrink-0">
          <DialogTitle className="text-lg font-semibold text-center" data-testid="text-modal-title">
            {title}
          </DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
