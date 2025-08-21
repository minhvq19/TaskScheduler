import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertWorkScheduleSchema, type WorkSchedule, type Staff, type Department } from "@shared/schema";
import { z } from "zod";
import { format, isBefore, startOfDay, isSameDay } from "date-fns";

const formSchema = z.object({
  staffId: z.string().min(1, "Vui lòng chọn cán bộ"),
  startDateTime: z.string().min(1, "Vui lòng chọn ngày giờ bắt đầu"),
  endDateTime: z.string().min(1, "Vui lòng chọn ngày giờ kết thúc"),
  workType: z.string().min(1, "Vui lòng chọn nội dung công tác"),
  customContent: z.string().max(200).optional(),
});

type FormData = z.infer<typeof formSchema>;

const workTypes = [
  { value: "Làm việc tại CN", label: "Làm việc tại CN" },
  { value: "Nghỉ phép", label: "Nghỉ phép" },
  { value: "Trực lãnh đạo", label: "Trực lãnh đạo" },
  { value: "Đi công tác trong nước", label: "Đi công tác trong nước" },
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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      staffId: "",
      startDateTime: "",
      endDateTime: "",
      workType: "",
      customContent: "",
    },
  });

  const watchedWorkType = form.watch("workType");
  const watchedStartDateTime = form.watch("startDateTime");
  const watchedEndDateTime = form.watch("endDateTime");

  // Fetch holidays
  const { data: holidays = [] } = useQuery<any[]>({
    queryKey: ["/api/holidays"],
  });

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

  // Handle datetime input change to prevent weekend and holiday selection
  const handleDateTimeChange = (field: "startDateTime" | "endDateTime", value: string) => {
    console.log(`handleDateTimeChange called for ${field} with value:`, value);
    
    if (value) {
      const selectedDate = new Date(value);
      const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 6 = Saturday
      
      console.log(`Selected datetime: ${value}, day of week: ${dayOfWeek}`);
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        console.log("Weekend detected, preventing selection");
        // Reset the field and show error
        form.setValue(field, "");
        form.setError(field, {
          message: "Không thể chọn ngày cuối tuần (Thứ 7, Chủ nhật)"
        });
        toast({
          title: "Lỗi",
          description: "Không thể chọn ngày cuối tuần (Thứ 7, Chủ nhật)",
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

  const boardDept = departments.find(d => d.name.toLowerCase().includes("ban giám đốc"));
  const boardStaff = allStaff.filter(s => s.departmentId === boardDept?.id).sort((a, b) => 
    (a.displayOrder || 0) - (b.displayOrder || 0)
  );

  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
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
      const payload = {
        ...data,
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
      form.reset({
        staffId: schedule.staffId,
        startDateTime: format(new Date(schedule.startDateTime), "yyyy-MM-dd'T'HH:mm"),
        endDateTime: format(new Date(schedule.endDateTime), "yyyy-MM-dd'T'HH:mm"),
        workType: schedule.workType,
        customContent: schedule.customContent || "",
      });
    } else {
      form.reset({
        staffId: "",
        startDateTime: "",
        endDateTime: "",
        workType: "",
        customContent: "",
      });
    }
  }, [schedule, form]);

  // Monitor form values and prevent weekends
  useEffect(() => {
    const checkAndPreventWeekends = (field: "startDateTime" | "endDateTime", value: string) => {
      if (value) {
        const selectedDate = new Date(value);
        const dayOfWeek = selectedDate.getDay();
        
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          console.log(`Weekend detected in useEffect for ${field}, clearing value`);
          form.setValue(field, "");
          form.setError(field, {
            message: "Không thể chọn ngày cuối tuần (Thứ 7, Chủ nhật)"
          });
          toast({
            title: "Lỗi",
            description: "Không thể chọn ngày cuối tuần (Thứ 7, Chủ nhật)",
            variant: "destructive",
          });
        }
      }
    };

    if (watchedStartDateTime) {
      checkAndPreventWeekends("startDateTime", watchedStartDateTime);
    }
    if (watchedEndDateTime) {
      checkAndPreventWeekends("endDateTime", watchedEndDateTime);
    }
  }, [watchedStartDateTime, watchedEndDateTime, form, toast]);

  const onSubmit = (data: FormData) => {
    const startDateTime = new Date(data.startDateTime);
    const endDateTime = new Date(data.endDateTime);
    const now = new Date();
    


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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[350px] sm:max-w-2xl h-[85vh] max-h-[600px] overflow-hidden flex flex-col p-3 sm:p-4" data-testid="modal-add-schedule">
        <DialogHeader className="pb-3 flex-shrink-0">
          <DialogTitle className="text-lg font-semibold text-center" data-testid="text-modal-title">
            {schedule ? "Chỉnh sửa lịch công tác" : "Thêm lịch công tác"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pb-2">
          <form id="schedule-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
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

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-4">
              <div>
                <Label htmlFor="startDateTime" className="block text-sm font-medium text-gray-700 mb-2">
                  Ngày giờ bắt đầu *
                </Label>
                <Input
                  id="startDateTime"
                  type="datetime-local"
                  value={watchedStartDateTime || ""}
                  onChange={(e) => {
                    console.log("Start datetime onChange triggered:", e.target.value);
                    handleDateTimeChange("startDateTime", e.target.value);
                  }}
                  onBlur={(e) => {
                    console.log("Start datetime onBlur triggered:", e.target.value);
                    handleDateTimeChange("startDateTime", e.target.value);
                  }}
                  className="h-11 text-sm sm:h-9 sm:text-base focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                  data-testid="input-start-time"
                />
                {form.formState.errors.startDateTime && (
                  <p className="text-red-600 text-sm mt-1">
                    {form.formState.errors.startDateTime.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="endDateTime" className="block text-sm font-medium text-gray-700 mb-2">
                  Ngày giờ kết thúc *
                </Label>
                <Input
                  id="endDateTime"
                  type="datetime-local"
                  value={watchedEndDateTime || ""}
                  onChange={(e) => {
                    console.log("End datetime onChange triggered:", e.target.value);
                    handleDateTimeChange("endDateTime", e.target.value);
                  }}
                  onBlur={(e) => {
                    console.log("End datetime onBlur triggered:", e.target.value);
                    handleDateTimeChange("endDateTime", e.target.value);
                  }}
                  className="h-11 text-sm sm:h-9 sm:text-base focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                  data-testid="input-end-time"
                />
                {form.formState.errors.endDateTime && (
                  <p className="text-red-600 text-sm mt-1">
                    {form.formState.errors.endDateTime.message}
                  </p>
                )}
              </div>
            </div>

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

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2.5 sm:p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-2 sm:ml-3">
                <h4 className="text-xs font-medium text-yellow-800">Lưu ý quan trọng</h4>
                <p className="text-xs text-yellow-700 mt-0.5 sm:mt-1">
                  • Không thể chọn ngày giờ quá khứ<br/>
                  • Mỗi cá nhân chỉ được phép có tối đa 5 lịch công tác trong cùng một ngày<br/>
                  • Hệ thống sẽ kiểm tra và cảnh báo nếu vượt quá giới hạn
                </p>
              </div>
            </div>
          </div>

          </form>
        </div>
        
        <div className="flex-shrink-0 pt-2 mt-2">
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
      </DialogContent>
    </Dialog>
  );
}
