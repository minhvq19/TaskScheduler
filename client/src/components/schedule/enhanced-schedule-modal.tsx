import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile"; // Import hook để kiểm tra thiết bị

// Schema validation using Zod
const formSchema = z
  .object({
    staffId: z.string().min(1, "Vui lòng chọn cán bộ"),
    workType: z.string().min(1, "Vui lòng chọn nội dung công tác"),
    customContent: z.string().max(200).optional(),
    isAllDay: z.boolean().default(false),
    startDate: z.date({ required_error: "Vui lòng chọn ngày bắt đầu" }),
    endDate: z.date({ required_error: "Vui lòng chọn ngày kết thúc" }),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.workType === "Khác") {
        return data.customContent && data.customContent.trim().length > 0;
      }
      return true;
    },
    {
      message: "Vui lòng nhập nội dung chi tiết khi chọn 'Khác'",
      path: ["customContent"],
    }
  )
  .refine(
    (data) => {
      if (data.isAllDay) return true;
      return data.startTime && data.endTime;
    },
    {
      message: "Vui lòng nhập thời gian bắt đầu và kết thúc",
      path: ["startTime"],
    },
  )
  .refine(
    (data) => {
      if (data.isAllDay) return true;
      return data.startTime && data.endTime;
    },
    {
      message: "Vui lòng nhập thời gian bắt đầu và kết thúc",
      path: ["endTime"],
    },
  );

type FormValues = z.infer<typeof formSchema>;

const workTypes = [
  { value: "Nghỉ phép", label: "Nghỉ phép" },
  { value: "Trực lãnh đạo", label: "Trực lãnh đạo" },
  { value: "Đi công tác NN", label: "Đi công tác NN" },
  { value: "Khác", label: "Khác" },
];

// API client

// --- Component Form Nội dung ---
// Tách riêng nội dung form để tái sử dụng trong cả Dialog và Drawer
const ScheduleFormContent = ({
  form,
  onSubmit,
  staffList,
  isSubmitting,
}: {
  form: any;
  onSubmit: (values: FormValues) => void;
  staffList: any[];
  isSubmitting: boolean;
}) => (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        control={form.control}
        name="staffId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Cán bộ *</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn cán bộ" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {staffList?.map((staff: any) => (
                  <SelectItem key={staff.id} value={staff.id.toString()}>
                    {staff.positionShort} {staff.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="workType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nội dung công tác *</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn nội dung công tác" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {workTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {form.watch("workType") === "Khác" && (
        <FormField
          control={form.control}
          name="customContent"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nội dung chi tiết *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Nhập nội dung chi tiết (tối đa 200 ký tự)" 
                  maxLength={200}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="isAllDay"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Cả ngày (08:00 - 17:30)</FormLabel>
            </div>
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Ngày bắt đầu *</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? (
                        format(field.value, "dd/MM/yyyy")
                      ) : (
                        <span>Chọn ngày</span>
                      )}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="endDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Ngày kết thúc *</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? (
                        format(field.value, "dd/MM/yyyy")
                      ) : (
                        <span>Chọn ngày</span>
                      )}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {!form.watch("isAllDay") && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Giờ bắt đầu *</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Giờ kết thúc *</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
      {/* Các nút sẽ được đặt ở Footer của Dialog/Drawer */}
    </form>
  </Form>
);

// --- Component Chính ---
export default function EnhancedScheduleModal({
  children,
  schedule,
  onSuccess,
}: {
  children: React.ReactNode;
  schedule?: any;
  onSuccess?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasClosedSuccessfully, setHasClosedSuccessfully] = useState(false);
  const [lastScheduleId, setLastScheduleId] = useState<string | null>(null);
  const isMobile = useIsMobile(); // Sử dụng hook
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      staffId: "",
      workType: "",
      customContent: "",
      isAllDay: false,
      startDate: new Date(),
      endDate: new Date(),
      startTime: "",
      endTime: "",
    },
  });

  // Mở modal khi có schedule để edit, nhưng không mở lại sau khi đã lưu thành công
  useEffect(() => {
    console.log('useEffect auto-open:', { 
      schedule: schedule?.id, 
      hasClosedSuccessfully, 
      willOpen: schedule && !hasClosedSuccessfully 
    });
    if (schedule && !hasClosedSuccessfully) {
      setIsOpen(true);
    }
  }, [schedule, hasClosedSuccessfully]);

  // Reset flag khi có schedule mới (khác ID)
  useEffect(() => {
    if (schedule && schedule.id !== lastScheduleId) {
      setHasClosedSuccessfully(false);
      setLastScheduleId(schedule.id);
    }
  }, [schedule, lastScheduleId]);

  // Reset form chỉ khi cần thiết cho thêm mới
  useEffect(() => {
    // Chỉ reset khi modal đóng hoàn toàn và đang ở chế độ thêm mới
    if (!isOpen && !schedule) {
      const timeoutId = setTimeout(() => {
        form.reset({
          staffId: "",
          workType: "",
          customContent: "",
          isAllDay: false,
          startDate: new Date(),
          endDate: new Date(),
          startTime: "",
          endTime: "",
        });
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, schedule, form]);

  // Fetch staff và departments
  const { data: allStaff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const res = await fetch("/api/staff");
      return await res.json();
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await fetch("/api/departments");
      return await res.json();
    },
  });

  // Fetch edit permissions to filter staff based on user's assigned staff permissions
  const { data: editPermissions } = useQuery<{editableStaffIds: string[]}>({
    queryKey: ["/api/user-edit-permissions"],
  });

  // Lọc chỉ lấy cán bộ thuộc Ban giám đốc và có quyền chỉnh sửa
  const boardDept = departments.find((d: any) => d.name.toLowerCase().includes("ban giám đốc"));
  const staffList = allStaff
    .filter((s: any) => s.departmentId === boardDept?.id)
    .filter((s: any) => editPermissions?.editableStaffIds?.includes(s.id) || false)
    .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Convert form data to API format
      let startDateTime: Date;
      let endDateTime: Date;
      
      if (values.isAllDay) {
        // Cả ngày: 8:00 - 17:30
        startDateTime = new Date(values.startDate);
        startDateTime.setHours(8, 0, 0, 0);
        
        endDateTime = new Date(values.endDate);
        endDateTime.setHours(17, 30, 0, 0);
      } else {
        // Theo giờ cụ thể
        const [startHour, startMinute] = (values.startTime || "08:00").split(':');
        startDateTime = new Date(values.startDate);
        startDateTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
        
        const [endHour, endMinute] = (values.endTime || "17:30").split(':');
        endDateTime = new Date(values.endDate);
        endDateTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);
      }
      
      const payload = {
        staffId: values.staffId,
        workType: values.workType,
        customContent: values.workType === "Khác" ? values.customContent : undefined,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
      };
      
      const url = schedule ? `/api/work-schedules/${schedule.id}` : "/api/work-schedules";
      const method = schedule ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(schedule ? "Failed to update schedule" : "Failed to create schedule");
      }
      return res.json();
    },
    onSuccess: () => {
      console.log('Mutation onSuccess - before actions:', { scheduleId: schedule?.id });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-schedules"] });
      
      // Đánh dấu đã đóng thành công để ngăn tự mở lại
      setHasClosedSuccessfully(true);
      setIsOpen(false);
      console.log('Mutation onSuccess - set hasClosedSuccessfully=true, isOpen=false');
      
      // Delay callback để đảm bảo modal đã đóng hoàn toàn
      setTimeout(() => {
        console.log('Mutation onSuccess - calling parent onSuccess');
        onSuccess?.();
      }, 50);
    },
  });

  useEffect(() => {
    if (schedule) {
      const startDate = new Date(schedule.startDateTime);
      const endDate = new Date(schedule.endDateTime);
      
      // Kiểm tra xem có phải "cả ngày" không (8:00-17:30)
      const isAllDay = startDate.getHours() === 8 && startDate.getMinutes() === 0 && 
                       endDate.getHours() === 17 && endDate.getMinutes() === 30;
      
      form.reset({
        staffId: schedule.staffId.toString(),
        workType: schedule.workType,
        customContent: schedule.customContent || "",
        isAllDay: isAllDay,
        startDate: startDate,
        endDate: endDate,
        startTime: isAllDay ? "" : format(startDate, "HH:mm"),
        endTime: isAllDay ? "" : format(endDate, "HH:mm"),
      });
    }
    // Không reset form khi schedule thành null - đó là kết quả của việc lưu thành công
  }, [schedule, form]);

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  const title = schedule ? "Chỉnh sửa lịch công tác" : "Thêm lịch công tác";

  // Render Drawer cho Mobile
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger asChild>{children}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          {/* Thêm padding và cho phép cuộn nội dung */}
          <div className="p-4 overflow-y-auto">
            <ScheduleFormContent
              form={form}
              onSubmit={onSubmit}
              staffList={staffList || []}
              isSubmitting={mutation.isPending}
            />
          </div>
          <DrawerFooter className="pt-2">
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Đang lưu..." : "Lưu"}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Hủy</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  // Render Dialog cho Desktop
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {/* Cho phép cuộn nội dung nếu dài */}
        <div className="max-h-[70vh] overflow-y-auto p-1 pr-4">
          <ScheduleFormContent
            form={form}
            onSubmit={onSubmit}
            staffList={staffList || []}
            isSubmitting={mutation.isPending}
          />
        </div>
        <DialogFooter>
          <Button onClick={() => setIsOpen(false)} variant="outline">
            Hủy
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
