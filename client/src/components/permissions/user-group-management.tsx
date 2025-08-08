import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { z } from "zod";

const userGroupSchema = z.object({
  name: z.string().min(1, "Tên nhóm quyền là bắt buộc"),
  description: z.string().optional(),
  permissions: z.object({
    staff: z.enum(["VIEW", "EDIT", "NONE"]).default("NONE"),
    departments: z.enum(["VIEW", "EDIT", "NONE"]).default("NONE"),
    rooms: z.enum(["VIEW", "EDIT", "NONE"]).default("NONE"),
    categories: z.enum(["VIEW", "EDIT", "NONE"]).default("NONE"),
    workSchedules: z.enum(["VIEW", "EDIT", "NONE"]).default("NONE"),
    meetingSchedules: z.enum(["VIEW", "EDIT", "NONE"]).default("NONE"),
    otherEvents: z.enum(["VIEW", "EDIT", "NONE"]).default("NONE"),
    permissions: z.enum(["VIEW", "EDIT", "NONE"]).default("NONE"),
    systemConfig: z.enum(["VIEW", "EDIT", "NONE"]).default("NONE"),
    holidays: z.enum(["VIEW", "EDIT", "NONE"]).default("NONE"),
  }).default({}),
});

type FormData = z.infer<typeof userGroupSchema>;

interface UserGroup {
  id: string;
  name: string;
  description?: string;
  permissions: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export default function UserGroupManagement() {
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(userGroupSchema),
    defaultValues: {
      name: "",
      description: "",
      permissions: {
        staff: "NONE",
        departments: "NONE",
        rooms: "NONE",
        categories: "NONE",
        workSchedules: "NONE",
        meetingSchedules: "NONE",
        otherEvents: "NONE",
        permissions: "NONE",
        systemConfig: "NONE",
        holidays: "NONE",
      },
    },
  });

  // Fetch user groups
  const { data: userGroups = [], isLoading } = useQuery<UserGroup[]>({
    queryKey: ["/api/user-groups"],
  });

  // Create/Update user group mutation
  const saveGroupMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (editingGroup) {
        await apiRequest("PUT", `/api/user-groups/${editingGroup.id}`, data);
      } else {
        await apiRequest("POST", "/api/user-groups", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups"] });
      toast({
        title: "Thành công",
        description: editingGroup ? "Đã cập nhật nhóm quyền." : "Đã tạo nhóm quyền mới.",
      });
      handleCloseModal();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể lưu nhóm quyền.",
        variant: "destructive",
      });
    },
  });

  // Delete user group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/user-groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups"] });
      toast({
        title: "Thành công",
        description: "Đã xóa nhóm quyền.",
      });
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa nhóm quyền.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (group: UserGroup) => {
    setEditingGroup(group);
    form.reset({
      name: group.name,
      description: group.description || "",
      permissions: {
        staff: (group.permissions.staff as "VIEW" | "EDIT" | "NONE") || "NONE",
        departments: (group.permissions.departments as "VIEW" | "EDIT" | "NONE") || "NONE",
        rooms: (group.permissions.rooms as "VIEW" | "EDIT" | "NONE") || "NONE",
        categories: (group.permissions.categories as "VIEW" | "EDIT" | "NONE") || "NONE",
        workSchedules: (group.permissions.workSchedules as "VIEW" | "EDIT" | "NONE") || "NONE",
        meetingSchedules: (group.permissions.meetingSchedules as "VIEW" | "EDIT" | "NONE") || "NONE",
        otherEvents: (group.permissions.otherEvents as "VIEW" | "EDIT" | "NONE") || "NONE",
        permissions: (group.permissions.permissions as "VIEW" | "EDIT" | "NONE") || "NONE",
        systemConfig: (group.permissions.systemConfig as "VIEW" | "EDIT" | "NONE") || "NONE",
        holidays: (group.permissions.holidays as "VIEW" | "EDIT" | "NONE") || "NONE",
      },
    });
    setShowModal(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa nhóm quyền "${name}"?`)) {
      deleteGroupMutation.mutate(id);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingGroup(null);
    form.reset();
  };

  const onSubmit = (data: FormData) => {
    saveGroupMutation.mutate(data);
  };

  const getPermissionBadge = (permission: string) => {
    switch (permission) {
      case "EDIT":
        return <Badge className="bg-green-100 text-green-800">Chỉnh sửa</Badge>;
      case "VIEW":
        return <Badge className="bg-blue-100 text-blue-800">Xem</Badge>;
      default:
        return <Badge variant="secondary">Không có</Badge>;
    }
  };

  const permissionLabels = {
    staff: "Quản lý cán bộ",
    departments: "Quản lý phòng ban",
    rooms: "Quản lý phòng họp",
    categories: "Quản lý danh mục sự kiện",
    workSchedules: "Lịch công tác",
    meetingSchedules: "Lịch phòng họp",
    otherEvents: "Sự kiện khác",
    permissions: "Phân quyền",
    systemConfig: "Tham số hệ thống",
    holidays: "Quản lý ngày nghỉ lễ",
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900" data-testid="text-page-title">
          Quản lý nhóm quyền
        </h2>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-bidv-teal hover:bg-bidv-teal/90 text-white"
          data-testid="button-add-group"
        >
          <Plus className="w-4 h-4 mr-2" />
          Thêm nhóm quyền
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách nhóm quyền</CardTitle>
          <p className="text-sm text-gray-500">
            Quản lý các nhóm quyền và phân quyền chi tiết cho từng chức năng
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8" data-testid="loading-groups">
              Đang tải danh sách nhóm quyền...
            </div>
          ) : userGroups.length === 0 ? (
            <div className="text-center py-8 text-gray-500" data-testid="no-groups">
              Chưa có nhóm quyền nào
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên nhóm</TableHead>
                    <TableHead>Mô tả</TableHead>
                    <TableHead>Số quyền được cấp</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userGroups.map((group) => {
                    const activePermissions = Object.values(group.permissions).filter(p => p !== "NONE").length;
                    return (
                      <TableRow key={group.id} data-testid={`group-row-${group.id}`}>
                        <TableCell>
                          <div className="font-medium text-gray-900">{group.name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600">{group.description || "Không có mô tả"}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{activePermissions} chức năng</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-900">
                          {new Date(group.createdAt).toLocaleDateString('vi-VN')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(group)}
                              data-testid={`button-edit-${group.id}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(group.id, group.name)}
                              className="text-red-600 hover:text-red-700"
                              data-testid={`button-delete-${group.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Group Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="modal-group">
          <DialogHeader>
            <DialogTitle data-testid="text-modal-title">
              {editingGroup ? "Chỉnh sửa nhóm quyền" : "Thêm nhóm quyền mới"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Tên nhóm quyền *
                </Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Nhập tên nhóm quyền"
                  className="focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                  data-testid="input-name"
                />
                {form.formState.errors.name && (
                  <p className="text-red-600 text-sm mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Mô tả
                </Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder="Nhập mô tả nhóm quyền"
                  rows={3}
                  className="focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                  data-testid="input-description"
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Phân quyền chi tiết</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(permissionLabels).map(([key, label]) => (
                  <Card key={key} className="p-4">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">{label}</Label>
                      <div className="space-y-2">
                        {["NONE", "VIEW", "EDIT"].map((permission) => (
                          <div key={permission} className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id={`${key}-${permission}`}
                              value={permission}
                              {...form.register(`permissions.${key}` as any)}
                              className="text-bidv-teal focus:ring-bidv-teal border-gray-300"
                            />
                            <label htmlFor={`${key}-${permission}`} className="text-sm text-gray-600">
                              {permission === "NONE" ? "Không có quyền" : 
                               permission === "VIEW" ? "Chỉ xem" : "Chỉnh sửa"}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                data-testid="button-cancel"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                className="bg-bidv-teal hover:bg-bidv-teal/90 text-white"
                disabled={saveGroupMutation.isPending}
                data-testid="button-submit"
              >
                {saveGroupMutation.isPending ? "Đang xử lý..." : (editingGroup ? "Cập nhật" : "Tạo nhóm")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}