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
import { type WorkSchedule, type Staff, type Department } from "@shared/schema";
import { z } from "zod";
import { format, isSameDay } from "date-fns";

// --- SCHEMA AND CONSTANTS ---
const formSchema = z.object({
  staffId: z.string().min(1, "Vui lòng chọn cán bộ"),
  startDateTime: z.string().min(1, "Vui lòng chọn ngày giờ bắt đầu"),
  endDateTime: z.string().min(1, "Vui lòng chọn ngày giờ kết thúc"),
  workType: z.string().min(1, "Vui lòng chọn nội dung công tác"),
  customContent: z.string().max(200).optional(),
});

type FormData = z.infer<typeof formSchema>;

const workTypes = [
  { value: "Nghỉ phép", label: "Nghỉ phép" },
  { value: "Trực lãnh đạo", label: "Trực lãnh đạo" },
  { value: "Đi công tác NN", label: "Đi công tác NN" },
  { value: "Khác", label: "Khác" },
];

// --- COMPONENT PROPS ---
interface AddScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule?: WorkSchedule | null;
}

// --- COMPONENT DEFINITION ---
export default function AddScheduleModal({
  isOpen,
  onClose,
  schedule,
}: AddScheduleModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery("(max-width: 640px)");

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

  // --- DATA FETCHING ---
  const { data: holidays = [] } = useQuery<any[]>({
    queryKey: ["/api/holidays"],
  });
  const { data: allStaff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  // Fetch edit permissions to filter staff based on user's assigned staff permissions
  const { data: editPermissions } = useQuery<{editableStaffIds: string[]}>({
    queryKey: ["/api/user-edit-permissions"],
  });

  const boardDept = departments.find((d) =>
    d.name.toLowerCase().includes("ban giám đốc"),
  );
  
  // Filter board staff based on user's edit permissions
  const boardStaff = allStaff
    .filter((s) => s.departmentId === boardDept?.id)
    .filter((s) => editPermissions?.editableStaffIds?.includes(s.id) || false)
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

  const handleDateTimeChange = (
    field: "startDateTime" | "endDateTime",
    value: string,
  ) => {
    if (value) {
      const selectedDate = new Date(value);
      const dayOfWeek = selectedDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        form.setValue(field, "");
        form.setError(field, {
          message: "Không thể chọn ngày cuối tuần (Thứ 7, Chủ nhật)",
        });
        toast({
          title: "Lỗi",
          description: "Không thể chọn ngày cuối tuần.",
          variant: "destructive",
        });
        return;
      }
      if (isHoliday(value)) {
        form.setValue(field, "");
        form.setError(field, { message: "Không thể chọn ngày lễ" });
        toast({
          title: "Lỗi",
          description: "Không thể chọn ngày lễ.",
          variant: "destructive",
        });
        return;
      }
      form.clearErrors(field);
      form.setValue(field, value);
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
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description:
          error.message || `Không thể ${schedule ? "cập nhật" : "thêm"} lịch.`,
        variant: "destructive",
      });
    },
  };

  const createScheduleMutation = useMutation({
    mutationFn: (data: FormData) =>
      apiRequest("POST", "/api/work-schedules", data),
    ...mutationOptions,
  });

  const updateScheduleMutation = useMutation({
    mutationFn: (data: FormData) =>
      apiRequest("PUT", `/api/work-schedules/${schedule?.id}`, data),
    ...mutationOptions,
  });

  // --- EFFECTS ---
  useEffect(() => {
    if (schedule) {
      // Xác định workType và customContent từ nội dung hiện có
      const standardTypes = ["Nghỉ phép", "Trực lãnh đạo", "Đi công tác NN"];
      const isStandardType = standardTypes.includes(schedule.content || schedule.workType);
      
      form.reset({
        staffId: schedule.staffId,
        startDateTime: format(
          new Date(schedule.startDateTime),
          "yyyy-MM-dd'T'HH:mm",
        ),
        endDateTime: format(
          new Date(schedule.endDateTime),
          "yyyy-MM-dd'T'HH:mm",
        ),
        workType: isStandardType ? (schedule.content || schedule.workType) : "Khác",
        customContent: isStandardType ? "" : (schedule.content || schedule.customContent || ""),
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
  }, [schedule, form, isOpen]);

  // --- EVENT HANDLERS ---
  const onSubmit = (data: FormData) => {
    // Tạo content từ workType và customContent
    const content = data.workType === "Khác" ? data.customContent : data.workType;
    
    const payload = {
      ...data,
      content,
      customContent: data.workType === "Khác" ? data.customContent : undefined,
    };
    
    if (new Date(data.endDateTime) <= new Date(data.startDateTime)) {
      toast({
        title: "Lỗi",
        description: "Thời gian kết thúc phải sau thời gian bắt đầu.",
        variant: "destructive",
      });
      return;
    }
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
      <div>
        <Label htmlFor="staffId">Chọn cán bộ *</Label>
        <Select
          value={form.watch("staffId")}
          onValueChange={(value) =>
            form.setValue("staffId", value, { shouldValidate: true })
          }
        >
          <SelectTrigger className="mt-1 w-full" data-testid="select-staff">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDateTime">Ngày giờ bắt đầu *</Label>
          <Input
            id="startDateTime"
            type="datetime-local"
            {...form.register("startDateTime")}
            onChange={(e) =>
              handleDateTimeChange("startDateTime", e.target.value)
            }
            className="mt-1 w-full"
          />
          {form.formState.errors.startDateTime && (
            <p className="text-red-600 text-sm mt-1">
              {form.formState.errors.startDateTime.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="endDateTime">Ngày giờ kết thúc *</Label>
          <Input
            id="endDateTime"
            type="datetime-local"
            {...form.register("endDateTime")}
            onChange={(e) =>
              handleDateTimeChange("endDateTime", e.target.value)
            }
            className="mt-1 w-full"
          />
          {form.formState.errors.endDateTime && (
            <p className="text-red-600 text-sm mt-1">
              {form.formState.errors.endDateTime.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="workType">Nội dung công tác *</Label>
        <Select
          value={form.watch("workType")}
          onValueChange={(value) =>
            form.setValue("workType", value, { shouldValidate: true })
          }
        >
          <SelectTrigger className="mt-1 w-full" data-testid="select-work-type">
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
          <Label htmlFor="customContent">Nội dung chi tiết *</Label>
          <Textarea
            id="customContent"
            {...form.register("customContent")}
            rows={3}
            maxLength={200}
            placeholder="Nhập nội dung chi tiết (tối đa 200 ký tự)"
            className="mt-1 w-full"
          />
          {form.formState.errors.customContent && (
            <p className="text-red-600 text-sm mt-1">
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
        <SheetContent side="bottom" className="p-0 h-[85vh]">
          <div className="jailbreak-container">
            <div className="jailbreak-header">
              <SheetTitle className="text-center">{title}</SheetTitle>
            </div>
            <div className="jailbreak-content">
              <form
                id="schedule-form-mobile"
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <FormFields />
              </form>
            </div>
            <div className="jailbreak-footer">
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
                  form="schedule-form-mobile"
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? "Đang xử lý..." : schedule ? "Cập nhật" : "Thêm"}
                </Button>
              </div>
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
            id="schedule-form-desktop"
            onSubmit={form.handleSubmit(onSubmit)}
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
              form="schedule-form-desktop"
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
