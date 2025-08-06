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
import { format } from "date-fns";

const formSchema = insertWorkScheduleSchema.extend({
  startDateTime: z.string(),
  endDateTime: z.string(),
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
    defaultValues: {
      staffId: "",
      startDateTime: "",
      endDateTime: "",
      workType: "",
      customContent: "",
    },
  });

  const watchedWorkType = form.watch("workType");

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
        startDateTime: new Date(data.startDateTime),
        endDateTime: new Date(data.endDateTime),
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
        startDateTime: new Date(data.startDateTime),
        endDateTime: new Date(data.endDateTime),
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

  const onSubmit = (data: FormData) => {
    // Validate end time is after start time
    if (new Date(data.endDateTime) <= new Date(data.startDateTime)) {
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-add-schedule">
        <DialogHeader>
          <DialogTitle data-testid="text-modal-title">
            {schedule ? "Chỉnh sửa lịch công tác" : "Thêm lịch công tác"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="staffId" className="block text-sm font-medium text-gray-700 mb-2">
                Chọn cán bộ *
              </Label>
              <Select
                value={form.watch("staffId")}
                onValueChange={(value) => form.setValue("staffId", value)}
              >
                <SelectTrigger data-testid="select-staff">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDateTime" className="block text-sm font-medium text-gray-700 mb-2">
                  Ngày giờ bắt đầu *
                </Label>
                <Input
                  id="startDateTime"
                  type="datetime-local"
                  {...form.register("startDateTime")}
                  className="focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
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
                  {...form.register("endDateTime")}
                  className="focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
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
                onValueChange={(value) => form.setValue("workType", value)}
              >
                <SelectTrigger data-testid="select-work-type">
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
                  className="focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
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

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-800">Lưu ý quan trọng</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Mỗi cá nhân chỉ được phép có tối đa 5 lịch công tác trong cùng một ngày. 
                  Hệ thống sẽ kiểm tra và cảnh báo nếu vượt quá giới hạn này.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-testid="button-cancel"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              className="bg-bidv-teal hover:bg-bidv-teal/90 text-white"
              disabled={isLoading}
              data-testid="button-submit"
            >
              {isLoading ? "Đang xử lý..." : (schedule ? "Cập nhật" : "Thêm lịch công tác")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
