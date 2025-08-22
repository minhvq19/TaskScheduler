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
    content: z.string().min(1, "Vui lòng nhập nội dung công tác"),
    isAllDay: z.boolean().default(false),
    startDate: z.date({ required_error: "Vui lòng chọn ngày bắt đầu" }),
    endDate: z.date({ required_error: "Vui lòng chọn ngày kết thúc" }),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
  })
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
        name="content"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nội dung công tác *</FormLabel>
            <FormControl>
              <Input placeholder="Nhập nội dung công tác" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

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
  const isMobile = useIsMobile(); // Sử dụng hook
  const queryClient = useQueryClient();

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

  // Lọc chỉ lấy cán bộ thuộc Ban giám đốc
  const boardDept = departments.find((d: any) => d.name.toLowerCase().includes("ban giám đốc"));
  const staffList = allStaff.filter((s: any) => s.departmentId === boardDept?.id).sort((a: any, b: any) => 
    (a.displayOrder || 0) - (b.displayOrder || 0)
  );

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await fetch("/api/work-schedules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        throw new Error("Failed to create schedule");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setIsOpen(false);
      onSuccess?.();
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      staffId: schedule?.staffId.toString() || "",
      content: schedule?.content || "",
      isAllDay: schedule?.isAllDay || false,
      startDate: schedule?.startDate
        ? new Date(schedule.startDate)
        : new Date(),
      endDate: schedule?.endDate ? new Date(schedule.endDate) : new Date(),
      startTime: schedule?.startTime || "",
      endTime: schedule?.endTime || "",
    },
  });

  useEffect(() => {
    form.reset({
      staffId: schedule?.staffId.toString() || "",
      content: schedule?.content || "",
      isAllDay: schedule?.isAllDay || false,
      startDate: schedule?.startDate
        ? new Date(schedule.startDate)
        : new Date(),
      endDate: schedule?.endDate ? new Date(schedule.endDate) : new Date(),
      startTime: schedule?.startTime || "",
      endTime: schedule?.endTime || "",
    });
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
