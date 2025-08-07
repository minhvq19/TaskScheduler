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
import { insertStaffSchema, type Staff, type Department } from "@shared/schema";
import { z } from "zod";

const formSchema = insertStaffSchema.extend({
  birthDate: z.string().optional(),
  password: z.string().optional(), // Override to make password optional for editing
  createUserAccount: z.boolean().optional(), // For creating user account
});

type FormData = z.infer<typeof formSchema>;

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff?: Staff | null;
}

export default function AddStaffModal({ isOpen, onClose, staff }: AddStaffModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      employeeId: "",
      password: "",
      position: "",
      positionShort: "",
      departmentId: "",
      birthDate: "",
      displayOrder: 0,
      notes: "",
      createUserAccount: false,
    },
  });

  // Fetch departments for dropdown
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  // Fetch system users to check if staff has user account
  const { data: systemUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/system-users"],
  });

  // Create staff mutation
  const createStaffMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      };
      await apiRequest("POST", "/api/staff", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({
        title: "Thành công",
        description: "Đã thêm cán bộ mới thành công.",
      });
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể thêm cán bộ.",
        variant: "destructive",
      });
    },
  });

  // Update staff mutation
  const updateStaffMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      };
      await apiRequest("PUT", `/api/staff/${staff?.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({
        title: "Thành công",
        description: "Đã cập nhật thông tin cán bộ thành công.",
      });
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật cán bộ.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (staff) {
      // Check if staff has existing user account
      const hasUserAccount = systemUsers.some((user: any) => user.username === staff.employeeId);
      
      form.reset({
        fullName: staff.fullName,
        employeeId: staff.employeeId,
        password: "", // Don't populate password for security
        position: staff.position,
        positionShort: staff.positionShort,
        departmentId: staff.departmentId,
        birthDate: staff.birthDate ? new Date(staff.birthDate).toISOString().split('T')[0] : "",
        displayOrder: staff.displayOrder || 0,
        notes: staff.notes || "",
        createUserAccount: hasUserAccount,
      });
    } else if (!staff) {
      form.reset({
        fullName: "",
        employeeId: "",
        password: "",
        position: "",
        positionShort: "",
        departmentId: "",
        birthDate: "",
        displayOrder: 0,
        notes: "",
        createUserAccount: false,
      });
    }
  }, [staff, systemUsers]);

  const onSubmit = (data: FormData) => {
    // For new staff, password is required
    if (!staff && (!data.password || data.password.length < 11)) {
      form.setError("password", {
        message: "Mật khẩu phải có ít nhất 11 ký tự cho cán bộ mới"
      });
      return;
    }

    // For editing, if password is provided, validate it
    if (staff && data.password && data.password.length > 0 && data.password.length < 11) {
      form.setError("password", {
        message: "Mật khẩu phải có ít nhất 11 ký tự nếu muốn thay đổi"
      });
      return;
    }

    if (staff) {
      updateStaffMutation.mutate(data);
    } else {
      createStaffMutation.mutate(data);
    }
  };

  const isLoading = createStaffMutation.isPending || updateStaffMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-add-staff">
        <DialogHeader>
          <DialogTitle data-testid="text-modal-title">
            {staff ? "Chỉnh sửa cán bộ" : "Thêm cán bộ mới"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                Họ và tên *
              </Label>
              <Input
                id="fullName"
                {...form.register("fullName")}
                placeholder="Nhập họ và tên"
                className="focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                data-testid="input-fullname"
              />
              {form.formState.errors.fullName && (
                <p className="text-red-600 text-sm mt-1">
                  {form.formState.errors.fullName.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-2">
                Mã định danh *
              </Label>
              <Input
                id="employeeId"
                {...form.register("employeeId")}
                placeholder="Nhập mã định danh"
                className="focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                data-testid="input-employee-id"
              />
              {form.formState.errors.employeeId && (
                <p className="text-red-600 text-sm mt-1">
                  {form.formState.errors.employeeId.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-2">
                Chức danh *
              </Label>
              <Input
                id="position"
                {...form.register("position")}
                placeholder="Nhập chức danh"
                className="focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                data-testid="input-position"
              />
              {form.formState.errors.position && (
                <p className="text-red-600 text-sm mt-1">
                  {form.formState.errors.position.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="positionShort" className="block text-sm font-medium text-gray-700 mb-2">
                Chức danh viết tắt *
              </Label>
              <Input
                id="positionShort"
                {...form.register("positionShort")}
                placeholder="Nhập chức danh viết tắt"
                className="focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                data-testid="input-position-short"
              />
              {form.formState.errors.positionShort && (
                <p className="text-red-600 text-sm mt-1">
                  {form.formState.errors.positionShort.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="departmentId" className="block text-sm font-medium text-gray-700 mb-2">
                Phòng ban *
              </Label>
              <Select
                value={form.watch("departmentId")}
                onValueChange={(value) => form.setValue("departmentId", value)}
              >
                <SelectTrigger data-testid="select-department">
                  <SelectValue placeholder="Chọn phòng ban" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.departmentId && (
                <p className="text-red-600 text-sm mt-1">
                  {form.formState.errors.departmentId.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-2">
                Ngày sinh
              </Label>
              <Input
                id="birthDate"
                type="date"
                {...form.register("birthDate")}
                className="focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                data-testid="input-birth-date"
              />
              {form.formState.errors.birthDate && (
                <p className="text-red-600 text-sm mt-1">
                  {form.formState.errors.birthDate.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mật khẩu {staff ? "(để trống nếu không thay đổi)" : "*"}
              </Label>
              <Input
                id="password"
                type="password"
                {...form.register("password")}
                placeholder="Nhập mật khẩu"
                className="focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                data-testid="input-password"
              />
              <p className="text-xs text-gray-500 mt-1">
                Tối thiểu 11 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt
              </p>
              {form.formState.errors.password && (
                <p className="text-red-600 text-sm mt-1">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="displayOrder" className="block text-sm font-medium text-gray-700 mb-2">
                Thứ tự hiển thị
              </Label>
              <Input
                id="displayOrder"
                type="number"
                {...form.register("displayOrder", { valueAsNumber: true })}
                placeholder="Nhập thứ tự"
                className="focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                data-testid="input-display-order"
              />
              {form.formState.errors.displayOrder && (
                <p className="text-red-600 text-sm mt-1">
                  {form.formState.errors.displayOrder.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Ghi chú
            </Label>
            <Textarea
              id="notes"
              {...form.register("notes")}
              rows={3}
              placeholder="Nhập ghi chú (tùy chọn)"
              className="focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
              data-testid="input-notes"
            />
            {form.formState.errors.notes && (
              <p className="text-red-600 text-sm mt-1">
                {form.formState.errors.notes.message}
              </p>
            )}
          </div>

          {/* User permissions section for staff */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Quyền truy cập hệ thống
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="userAccess" className="block text-sm font-medium text-gray-700 mb-2">
                  Tạo tài khoản đăng nhập
                </Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="userAccess"
                    {...form.register("createUserAccount")}
                    className="rounded border-gray-300 focus:ring-bidv-teal"
                    data-testid="checkbox-user-access"
                  />
                  <span className="text-sm text-gray-600">
                    Tạo tài khoản đăng nhập cho cán bộ này (sử dụng mã cán bộ làm username)
                  </span>
                </div>
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
              {isLoading ? "Đang xử lý..." : (staff ? "Cập nhật" : "Thêm cán bộ")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
