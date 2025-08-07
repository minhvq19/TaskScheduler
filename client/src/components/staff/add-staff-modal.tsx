import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertStaffSchema, type Staff, type Department, type UserGroup } from "@shared/schema";
import { z } from "zod";

const formSchema = insertStaffSchema.extend({
  birthDate: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  userGroupId: z.string().optional(),
  createSystemUser: z.boolean().default(false),
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
      position: "",
      positionShort: "",
      departmentId: "",
      birthDate: "",
      displayOrder: 0,
      notes: "",
      createSystemUser: false,
      username: "",
      password: "",
      userGroupId: "",
    },
  });

  const createSystemUser = form.watch("createSystemUser");

  // Fetch dependencies
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: userGroups = [] } = useQuery<UserGroup[]>({
    queryKey: ["/api/user-groups"],
  });

  // Create staff mutation
  const createStaffMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      };
      console.log("Creating staff with data:", payload);
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
      console.error("Create staff error:", error);
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
      console.log("Updating staff with data:", payload);
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
      console.error("Update staff error:", error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật cán bộ.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (staff) {
      const hasSystemUser = !!(staff as any).systemUser;
      form.reset({
        fullName: staff.fullName,
        employeeId: staff.employeeId,
        position: staff.position,
        positionShort: staff.positionShort,
        departmentId: staff.departmentId,
        birthDate: staff.birthDate ? new Date(staff.birthDate).toISOString().split('T')[0] : "",
        displayOrder: staff.displayOrder || 0,
        notes: staff.notes || "",
        createSystemUser: hasSystemUser,
        username: hasSystemUser ? (staff as any).systemUser?.username || "" : "",
        password: "", // Never populate password for security
        userGroupId: hasSystemUser ? (staff as any).systemUser?.userGroupId || "" : "",
      });
    } else {
      form.reset({
        fullName: "",
        employeeId: "",
        position: "",
        positionShort: "",
        departmentId: "",
        birthDate: "",
        displayOrder: 0,
        notes: "",
        createSystemUser: false,
        username: "",
        password: "",
        userGroupId: "",
      });
    }
  }, [staff, form]);

  const onSubmit = (data: FormData) => {
    console.log("Form data:", data);
    console.log("Form errors:", form.formState.errors);

    if (staff) {
      updateStaffMutation.mutate(data);
    } else {
      createStaffMutation.mutate(data);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="text-modal-title">
            {staff ? "Sửa thông tin cán bộ" : "Thêm cán bộ mới"}
          </DialogTitle>
          <DialogDescription>
            {staff ? "Cập nhật thông tin cán bộ và quyền truy cập hệ thống" : "Nhập thông tin cán bộ mới và thiết lập quyền truy cập"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Thông tin cơ bản</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Họ và tên *</Label>
                <Input
                  id="fullName"
                  {...form.register("fullName")}
                  data-testid="input-full-name"
                />
                {form.formState.errors.fullName && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.fullName.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="employeeId">Mã cán bộ *</Label>
                <Input
                  id="employeeId"
                  {...form.register("employeeId")}
                  data-testid="input-employee-id"
                />
                {form.formState.errors.employeeId && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.employeeId.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="position">Chức vụ *</Label>
                <Input
                  id="position"
                  {...form.register("position")}
                  data-testid="input-position"
                />
                {form.formState.errors.position && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.position.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="positionShort">Chức vụ viết tắt *</Label>
                <Input
                  id="positionShort"
                  {...form.register("positionShort")}
                  data-testid="input-position-short"
                />
                {form.formState.errors.positionShort && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.positionShort.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="departmentId">Phòng ban *</Label>
                <Select onValueChange={(value) => form.setValue("departmentId", value)} 
                        value={form.watch("departmentId")}>
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
                  <p className="text-sm text-red-500">
                    {form.formState.errors.departmentId.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="birthDate">Ngày sinh</Label>
                <Input
                  id="birthDate"
                  type="date"
                  {...form.register("birthDate")}
                  data-testid="input-birth-date"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="displayOrder">Thứ tự hiển thị</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  {...form.register("displayOrder", { valueAsNumber: true })}
                  data-testid="input-display-order"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Ghi chú</Label>
              <Textarea
                id="notes"
                {...form.register("notes")}
                rows={3}
                data-testid="textarea-notes"
              />
            </div>
          </div>

          {/* System User Section */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={createSystemUser}
                onCheckedChange={(checked) => form.setValue("createSystemUser", checked)}
                data-testid="switch-create-system-user"
              />
              <Label htmlFor="createSystemUser">Tạo tài khoản đăng nhập hệ thống</Label>
            </div>

            {createSystemUser && (
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium">Thông tin đăng nhập</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Tên đăng nhập *</Label>
                    <Input
                      id="username"
                      {...form.register("username")}
                      data-testid="input-username"
                    />
                    {form.formState.errors.username && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.username.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="password">Mật khẩu {!staff && "*"}</Label>
                    <Input
                      id="password"
                      type="password"
                      {...form.register("password")}
                      placeholder={staff ? "Để trống nếu không đổi" : "Nhập mật khẩu"}
                      data-testid="input-password"
                    />
                    {form.formState.errors.password && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="userGroupId">Nhóm quyền *</Label>
                  <Select onValueChange={(value) => form.setValue("userGroupId", value)}
                          value={form.watch("userGroupId")}>
                    <SelectTrigger data-testid="select-user-group">
                      <SelectValue placeholder="Chọn nhóm quyền" />
                    </SelectTrigger>
                    <SelectContent>
                      {userGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.userGroupId && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.userGroupId.message}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
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
              disabled={createStaffMutation.isPending || updateStaffMutation.isPending}
              className="bg-bidv-teal hover:bg-bidv-teal/90"
              data-testid="button-submit"
            >
              {createStaffMutation.isPending || updateStaffMutation.isPending
                ? "Đang xử lý..."
                : staff
                ? "Cập nhật"
                : "Thêm mới"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}