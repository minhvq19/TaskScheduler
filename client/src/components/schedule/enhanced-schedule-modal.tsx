import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useMediaQuery } from "@/hooks/use-media-query";
import { apiRequest } from "@/lib/queryClient";
import {
  type WorkSchedule,
  type Staff,
  type Department,
  type Holiday,
  type SystemConfigs,
} from "@shared/schema";
import { z } from "zod";
import { format, isSameDay } from "date-fns";

// --- SCHEMA AND CONSTANTS ---
const formSchema = z
  .object({
    staffId: z.string().min(1, "Vui lòng chọn cán bộ"),
    startDate: z.string().min(1, "Vui lòng chọn ngày bắt đầu"),
    endDate: z.string().min(1, "Vui lòng chọn ngày kết thúc"),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    workType: z.string().min(1, "Vui lòng chọn nội dung công tác"),
    customContent: z.string().max(200).optional(),
    isFullDay: z.boolean().default(false),
  })
  .refine(
    (data) => {
      if (!data.isFullDay) {
        return data.startTime && data.endTime;
      }
      return true;
    },
    {
      message: "Vui lòng chọn giờ bắt đầu và kết thúc khi không chọn cả ngày",
      path: ["startTime"],
    },
  );

type FormData = z.infer<typeof formSchema>;

const workTypes = [
  { value: "Nghỉ phép", label: "Nghỉ phép" },
  { value: "Trực lãnh đạo", label: "Trực lãnh đạo" },
  { value: "Đi công tác nước ngoài", label: "Đi công tác NN" },
  { value: "Đi khách hàng", label: "Đi khách hàng" },
  { value: "Khác", label: "Khác" },
];

// --- COMPONENT PROPS ---
interface EnhancedScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule?: WorkSchedule | null;
}

// --- COMPONENT DEFINITION ---
export default function EnhancedScheduleModal({
  isOpen,
  onClose,
  schedule,
}: EnhancedScheduleModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery("(max-width: 640px)");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      staffId: "",
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(new Date(), "yyyy-MM-dd"),
      startTime: "",
      endTime: "",
      workType: "",
      customContent: "",
      isFullDay: false,
    },
  });

  const { watch, setValue, setError, clearErrors, reset } = form;
  const watchedIsFullDay = watch("isFullDay");
  const watchedStartDate = watch("startDate");
  const watchedWorkType = watch("workType");

  // --- DATA FETCHING ---
  const { data: systemConfigs = [] } = useQuery<SystemConfigs[]>({
    queryKey: ["/api/system-config"],
  });
  const { data: allStaff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });
  const { data: holidays = [] } = useQuery<Holiday[]>({
    queryKey: ["/api/holidays"],
  });
  const { data: editPermissions } = useQuery<{ editableStaffIds: string[] }>({
    queryKey: ["/api/user-edit-permissions"],
  });

  const allowWeekendSchedule =
    systemConfigs.find((c) => c.key === "policies.allow_weekend_schedule")
      ?.value === "true";
  const workStartTime =
    systemConfigs.find((c) => c.key === "work_hours.start_time")?.value ||
    "08:00";
  const workEndTime =
    systemConfigs.find((c) => c.key === "work_hours.end_time")?.value ||
    "17:30";

  const boardDept = departments.find((d) =>
    d.name.toLowerCase().includes("ban giám đốc"),
  );
  const boardStaff = allStaff
    .filter(
      (s) =>
        s.departmentId === boardDept?.id &&
        editPermissions?.editableStaffIds.includes(s.id),
    )
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  // --- HELPER FUNCTIONS ---
  const isHoliday = (dateString: string) => {
    const date = new Date(dateString);
    return holidays.some((holiday) => {
      const holidayDate = new Date(holiday.date);
      if (isSameDay(holidayDate, date)) return true;
      if (holiday.isRecurring) {
        const holidayMonthDay = `${String(holidayDate.getMonth() + 1).padStart(2, "0")}-${String(holidayDate.getDate()).padStart(2, "0")}`;
        const checkMonthDay = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        return holidayMonthDay === checkMonthDay;
      }
      return false;
    });
  };

  const handleDateChange = (field: "startDate" | "endDate", value: string) => {
    if (value) {
      const selectedDate = new Date(value);
      const dayOfWeek = selectedDate.getDay();
      if (!allowWeekendSchedule && (dayOfWeek === 0 || dayOfWeek === 6)) {
        setValue(field, "");
        setError(field, { message: "Không thể chọn ngày cuối tuần." });
        toast({
          title: "Lỗi",
          description: "Không thể chọn ngày cuối tuần.",
          variant: "destructive",
        });
        return;
      }
      if (isHoliday(value)) {
        setValue(field, "");
        setError(field, { message: "Không thể chọn ngày lễ." });
        toast({
          title: "Lỗi",
          description: "Không thể chọn ngày lễ.",
          variant: "destructive",
        });
        return;
      }
      clearErrors(field);
      setValue(field, value);
    }
  };

  // --- MUTATIONS ---
  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-schedules"] });
      toast({
        title: "Thành công",
        description: `Đã ${schedule ? "cập nhật" : "thêm"} lịch công tác.`,
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description:
          error.message || `Không thể ${schedule ? "cập nhật" : "thêm"} lịch.`,
        variant: "destructive",
      });
    },
  };

  const createScheduleMutation = useMutation({
    mutationFn: (payload: any) =>
      apiRequest("POST", "/api/work-schedules", payload),
    ...mutationOptions,
  });

  const updateScheduleMutation = useMutation({
    mutationFn: (payload: any) =>
      apiRequest("PUT", `/api/work-schedules/${schedule?.id}`, payload),
    ...mutationOptions,
  });

  // --- EFFECTS ---
  useEffect(() => {
    if (watchedIsFullDay) {
      setValue("startTime", workStartTime);
      setValue("endTime", workEndTime);
      if (watchedStartDate) {
        setValue("endDate", watchedStartDate);
        clearErrors("endDate");
      }
    }
  }, [
    watchedIsFullDay,
    watchedStartDate,
    workStartTime,
    workEndTime,
    setValue,
    clearErrors,
  ]);

  useEffect(() => {
    if (schedule && isOpen) {
      const startDate = new Date(schedule.startDateTime);
      const endDate = new Date(schedule.endDateTime);
      const startTimeStr = format(startDate, "HH:mm");
      const endTimeStr = format(endDate, "HH:mm");
      const isFullDay =
        startTimeStr === workStartTime && endTimeStr === workEndTime;
      reset({
        staffId: schedule.staffId,
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        startTime: startTimeStr,
        endTime: endTimeStr,
        workType: schedule.workType,
        customContent: schedule.customContent || "",
        isFullDay: isFullDay,
      });
    } else if (!isOpen) {
      reset({
        staffId: "",
        startDate: format(new Date(), "yyyy-MM-dd"),
        endDate: format(new Date(), "yyyy-MM-dd"),
        startTime: "",
        endTime: "",
        workType: "",
        customContent: "",
        isFullDay: false,
      });
    }
  }, [schedule, isOpen, reset, workStartTime, workEndTime]);

  // --- EVENT HANDLERS ---
  const handleSubmit = (data: FormData) => {
    const startDateTime = new Date(
      `${data.startDate}T${data.startTime || workStartTime}:00`,
    );
    const endDateTime = new Date(
      `${data.endDate}T${data.endTime || workEndTime}:00`,
    );

    if (endDateTime <= startDateTime) {
      toast({
        title: "Lỗi",
        description: "Thời gian kết thúc phải sau thời gian bắt đầu.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      staffId: data.staffId,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      workType: data.workType,
      customContent: data.workType === "Khác" ? data.customContent : undefined,
    };
    schedule
      ? updateScheduleMutation.mutate(payload)
      : createScheduleMutation.mutate(payload);
  };

  const isLoading =
    createScheduleMutation.isPending || updateScheduleMutation.isPending;
  const title = schedule ? "Chỉnh sửa lịch công tác" : "Thêm lịch công tác";

  // --- FORM FIELDS JSX ---
  const FormFields = () => (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="staffId">Cán bộ *</Label>
        <Select
          value={watch("staffId")}
          onValueChange={(value) => setValue("staffId", value)}
        >
          <SelectTrigger className="w-full">
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
          <p className="text-sm text-red-500">
            {form.formState.errors.staffId.message}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="workType">Nội dung công tác *</Label>
        <Select
          value={watch("workType")}
          onValueChange={(value) => setValue("workType", value)}
        >
          <SelectTrigger className="w-full">
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
          <p className="text-sm text-red-500">
            {form.formState.errors.workType.message}
          </p>
        )}
      </div>
      <div className="flex items-center space-x-2 py-1">
        <Checkbox
          id="isFullDay"
          checked={watchedIsFullDay}
          onCheckedChange={(checked) =>
            setValue("isFullDay", checked as boolean)
          }
        />
        <Label htmlFor="isFullDay" className="text-sm">
          Cả ngày ({workStartTime} - {workEndTime})
        </Label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="startDate">Ngày bắt đầu *</Label>
          <Input
            id="startDate"
            type="date"
            {...form.register("startDate")}
            onChange={(e) => handleDateChange("startDate", e.target.value)}
            className="w-full"
          />
          {form.formState.errors.startDate && (
            <p className="text-sm text-red-500">
              {form.formState.errors.startDate.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endDate">Ngày kết thúc *</Label>
          <Input
            id="endDate"
            type="date"
            {...form.register("endDate")}
            onChange={(e) => handleDateChange("endDate", e.target.value)}
            className="w-full"
          />
          {form.formState.errors.endDate && (
            <p className="text-sm text-red-500">
              {form.formState.errors.endDate.message}
            </p>
          )}
        </div>
      </div>
      {!watchedIsFullDay && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="startTime">Giờ bắt đầu *</Label>
            <Input
              id="startTime"
              type="time"
              {...form.register("startTime")}
              className="w-full"
            />
            {form.formState.errors.startTime && (
              <p className="text-sm text-red-500">
                {form.formState.errors.startTime.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endTime">Giờ kết thúc *</Label>
            <Input
              id="endTime"
              type="time"
              {...form.register("endTime")}
              className="w-full"
            />
            {form.formState.errors.endTime && (
              <p className="text-sm text-red-500">
                {form.formState.errors.endTime.message}
              </p>
            )}
          </div>
        </div>
      )}
      {watchedWorkType === "Khác" && (
        <div className="space-y-1.5">
          <Label htmlFor="customContent">Nội dung cụ thể</Label>
          <Textarea
            id="customContent"
            placeholder="Nhập nội dung (tối đa 200 ký tự)"
            {...form.register("customContent")}
          />
          {form.formState.errors.customContent && (
            <p className="text-sm text-red-500">
              {form.formState.errors.customContent.message}
            </p>
          )}
        </div>
      )}
    </div>
  );

  // --- RENDER LOGIC ---
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="mobile-sheet-content">
          <div className="mobile-modal-header">
            <SheetTitle className="text-center">{title}</SheetTitle>
          </div>

          <div className="mobile-modal-content">
            <form
              id="enhanced-schedule-form-mobile"
              onSubmit={form.handleSubmit(handleSubmit)}
            >
              <FormFields />
            </form>
          </div>

          <div className="mobile-modal-footer">
            <div className="flex gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                form="enhanced-schedule-form-mobile"
                className="flex-1"
                disabled={isLoading}
              >
                {isLoading ? "Đang xử lý..." : schedule ? "Cập nhật" : "Thêm"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader className="flex-shrink-0 pb-3">
          <DialogTitle className="text-lg font-semibold text-center">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-6">
          <form
            id="enhanced-schedule-form-desktop"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <FormFields />
          </form>
        </div>
        <div className="flex-shrink-0 border-t pt-4">
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button
              type="submit"
              form="enhanced-schedule-form-desktop"
              disabled={isLoading}
            >
              {isLoading ? "Đang xử lý..." : schedule ? "Cập nhật" : "Thêm"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
