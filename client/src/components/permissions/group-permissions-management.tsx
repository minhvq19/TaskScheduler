import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type UserGroup, type MenuPermission } from "@shared/schema";
import { Plus, Edit, Trash2, Shield, Users, Settings } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Định nghĩa các menu có sẵn trong hệ thống
const AVAILABLE_MENUS = [
  { id: "dashboard", name: "Dashboard", category: "Tổng quan" },
  { id: "staff-management", name: "Quản lý cán bộ", category: "Quản lý danh mục" },
  { id: "department-management", name: "Quản lý phòng ban", category: "Quản lý danh mục" },
  { id: "event-management", name: "Quản lý sự kiện", category: "Quản lý danh mục" },
  { id: "room-management", name: "Quản lý phòng họp", category: "Quản lý danh mục" },
  { id: "work-schedule", name: "Lịch công tác", category: "Quản trị lịch" },
  { id: "meeting-schedule", name: "Lịch phòng họp", category: "Quản trị lịch" },
  { id: "other-events", name: "Sự kiện khác", category: "Quản trị lịch" },
  { id: "holiday-management", name: "Quản lý ngày lễ", category: "Quản trị lịch" },
  { id: "user-management", name: "Quản lý người dùng", category: "Hệ thống" },
  { id: "permissions", name: "Phân quyền", category: "Hệ thống" },
  { id: "system-config", name: "Tham số hệ thống", category: "Hệ thống" },
];

const userGroupSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên nhóm quyền"),
  description: z.string().optional(),
});

type UserGroupFormData = z.infer<typeof userGroupSchema>;

interface MenuPermissionForm {
  [menuId: string]: {
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
}

export default function GroupPermissionsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [menuPermissions, setMenuPermissions] = useState<MenuPermissionForm>({});

  // Fetch user groups
  const { data: userGroups = [], isLoading } = useQuery<UserGroup[]>({
    queryKey: ["/api/user-groups"],
    queryFn: () => apiRequest("/api/user-groups"),
  });

  // Fetch menu permissions for selected group
  const { data: groupPermissions = [], isLoading: isLoadingPermissions } = useQuery<MenuPermission[]>({
    queryKey: ["/api/menu-permissions", selectedGroupId],
    queryFn: () => apiRequest(`/api/menu-permissions?groupId=${selectedGroupId}`),
    enabled: !!selectedGroupId,
  });

  const form = useForm<UserGroupFormData>({
    resolver: zodResolver(userGroupSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Initialize menu permissions form when permissions data changes
  useEffect(() => {
    if (selectedGroupId) {
      if (groupPermissions.length > 0) {
        const permissionsMap: MenuPermissionForm = {};
        groupPermissions.forEach(permission => {
          permissionsMap[permission.menuId] = {
            canView: permission.canView || false,
            canCreate: permission.canCreate || false,
            canEdit: permission.canEdit || false,
            canDelete: permission.canDelete || false,
          };
        });
        
        // Initialize missing menus with empty permissions
        AVAILABLE_MENUS.forEach(menu => {
          if (!permissionsMap[menu.id]) {
            permissionsMap[menu.id] = {
              canView: false,
              canCreate: false,
              canEdit: false,
              canDelete: false,
            };
          }
        });
        
        setMenuPermissions(permissionsMap);
      } else if (!isLoadingPermissions) {
        // Initialize empty permissions for all menus when no permissions exist
        const emptyPermissions: MenuPermissionForm = {};
        AVAILABLE_MENUS.forEach(menu => {
          emptyPermissions[menu.id] = {
            canView: false,
            canCreate: false,
            canEdit: false,
            canDelete: false,
          };
        });
        setMenuPermissions(emptyPermissions);
      }
    }
  }, [groupPermissions, selectedGroupId, isLoadingPermissions]);

  // Create user group mutation
  const createUserGroupMutation = useMutation({
    mutationFn: async (data: UserGroupFormData) => {
      const groupData = {
        ...data,
        permissions: {} // Keep existing permissions field for compatibility
      };
      const result = await apiRequest(`/api/user-groups`, "POST", groupData);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups"] });
      toast({
        title: "Thành công",
        description: "Tạo nhóm quyền thành công",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      console.error("Create user group error:", error);
      toast({
        title: "Lỗi",
        description: error?.message || "Có lỗi xảy ra khi tạo nhóm quyền",
        variant: "destructive",
      });
    },
  });

  // Update user group mutation
  const updateUserGroupMutation = useMutation({
    mutationFn: async (data: UserGroupFormData) => {
      return await apiRequest(`/api/user-groups/${editingGroup!.id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups"] });
      toast({
        title: "Thành công",
        description: "Cập nhật nhóm quyền thành công",
      });
      setIsDialogOpen(false);
      setEditingGroup(null);
      form.reset();
    },
    onError: (error: any) => {
      console.error("Update user group error:", error);
      toast({
        title: "Lỗi",
        description: error?.message || "Có lỗi xảy ra khi cập nhật nhóm quyền",
        variant: "destructive",
      });
    },
  });

  // Save permissions mutation
  const savePermissionsMutation = useMutation({
    mutationFn: async (permissions: MenuPermissionForm) => {
      if (!selectedGroupId) throw new Error("No group selected");
      
      // Delete existing permissions
      await apiRequest(`/api/menu-permissions/group/${selectedGroupId}`, "DELETE");

      // Create new permissions
      const promises = Object.entries(permissions).map(([menuId, perms]) => {
        return apiRequest(`/api/menu-permissions`, "POST", {
          userGroupId: selectedGroupId,
          menuId,
          ...perms,
        });
      });

      return await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-permissions", selectedGroupId] });
      toast({
        title: "Thành công",
        description: "Lưu quyền truy cập thành công",
      });
    },
    onError: (error: any) => {
      console.error("Save permissions error:", error);
      toast({
        title: "Lỗi",
        description: error?.message || "Có lỗi xảy ra khi lưu quyền truy cập",
        variant: "destructive",
      });
    },
  });

  // Delete user group mutation
  const deleteUserGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/user-groups/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups"] });
      toast({
        title: "Thành công",
        description: "Xóa nhóm quyền thành công",
      });
      if (selectedGroupId === editingGroup?.id) {
        setSelectedGroupId(null);
      }
    },
    onError: (error: any) => {
      console.error("Delete user group error:", error);
      toast({
        title: "Lỗi",
        description: error?.message || "Có lỗi xảy ra khi xóa nhóm quyền",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: UserGroupFormData) => {
    console.log("Form data:", data);
    console.log("Form errors:", form.formState.errors);
    
    if (editingGroup) {
      updateUserGroupMutation.mutate(data);
    } else {
      createUserGroupMutation.mutate(data);
    }
  };

  const handleEdit = (group: UserGroup) => {
    setEditingGroup(group);
    form.reset({
      name: group.name,
      description: group.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Bạn có chắc muốn xóa nhóm quyền này?")) {
      deleteUserGroupMutation.mutate(id);
    }
  };

  const handlePermissionChange = (menuId: string, permission: keyof MenuPermissionForm[string], value: boolean) => {
    setMenuPermissions(prev => ({
      ...prev,
      [menuId]: {
        ...prev[menuId],
        [permission]: value,
      },
    }));
  };

  const handleSavePermissions = () => {
    savePermissionsMutation.mutate(menuPermissions);
  };

  // Group menus by category
  const menusByCategory = AVAILABLE_MENUS.reduce((acc, menu) => {
    if (!acc[menu.category]) {
      acc[menu.category] = [];
    }
    acc[menu.category].push(menu);
    return acc;
  }, {} as { [category: string]: typeof AVAILABLE_MENUS });

  if (isLoading) {
    return <div>Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-[#006b68]" />
              <CardTitle>Quản lý nhóm quyền</CardTitle>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-[#006b68] hover:bg-[#005a57] text-white"
                  data-testid="button-add-group"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm nhóm quyền
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingGroup ? "Chỉnh sửa nhóm quyền" : "Thêm nhóm quyền mới"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingGroup 
                      ? "Cập nhật thông tin nhóm quyền đã chọn" 
                      : "Tạo nhóm quyền mới để quản lý phân quyền hệ thống"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Tên nhóm quyền *</Label>
                    <Input
                      id="name"
                      placeholder="Nhập tên nhóm quyền"
                      {...form.register("name")}
                      data-testid="input-group-name"
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Mô tả</Label>
                    <Textarea
                      id="description"
                      placeholder="Mô tả về nhóm quyền này"
                      {...form.register("description")}
                      data-testid="textarea-description"
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setEditingGroup(null);
                        form.reset();
                      }}
                    >
                      Hủy
                    </Button>
                    <Button
                      type="submit"
                      disabled={createUserGroupMutation.isPending || updateUserGroupMutation.isPending}
                      className="bg-[#006b68] hover:bg-[#005a57] text-white"
                      data-testid="button-submit-group"
                    >
                      {editingGroup ? "Cập nhật" : "Tạo mới"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {userGroups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Chưa có nhóm quyền nào được tạo</p>
            </div>
          ) : (
            <Table data-testid="table-user-groups">
              <TableHeader>
                <TableRow>
                  <TableHead>Tên nhóm</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userGroups.map((group) => (
                  <TableRow key={group.id} data-testid={`row-group-${group.id}`}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell>{group.description || "-"}</TableCell>
                    <TableCell>
                      {new Date(group.createdAt!).toLocaleDateString("vi-VN")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedGroupId(group.id)}
                          className="text-blue-600 hover:text-blue-700"
                          data-testid={`button-config-permissions-${group.id}`}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Cấu hình quyền
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(group)}
                          data-testid={`button-edit-group-${group.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(group.id)}
                          disabled={deleteUserGroupMutation.isPending}
                          data-testid={`button-delete-group-${group.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Permissions Configuration */}
      {selectedGroupId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-[#006b68]" />
                <CardTitle>
                  Cấu hình quyền - {userGroups.find(g => g.id === selectedGroupId)?.name}
                </CardTitle>
              </div>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedGroupId(null)}
                >
                  Đóng
                </Button>
                <Button
                  onClick={handleSavePermissions}
                  disabled={savePermissionsMutation.isPending}
                  className="bg-[#006b68] hover:bg-[#005a57] text-white"
                  data-testid="button-save-permissions"
                >
                  Lưu quyền
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingPermissions ? (
              <div>Đang tải quyền truy cập...</div>
            ) : (
              <div className="space-y-6">
                {Object.entries(menusByCategory).map(([category, menus]) => (
                  <div key={category} className="space-y-3">
                    <h4 className="font-semibold text-lg text-[#006b68] border-b border-gray-200 pb-2">
                      {category}
                    </h4>
                    <div className="grid gap-4">
                      {menus.map((menu) => (
                        <Card key={menu.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium">{menu.name}</h5>
                            <div className="flex space-x-4">
                              <label className="flex items-center space-x-2">
                                <Checkbox
                                  checked={menuPermissions[menu.id]?.canView || false}
                                  onCheckedChange={(checked) => 
                                    handlePermissionChange(menu.id, 'canView', checked as boolean)
                                  }
                                  data-testid={`checkbox-${menu.id}-view`}
                                />
                                <span className="text-sm">Xem</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <Checkbox
                                  checked={menuPermissions[menu.id]?.canCreate || false}
                                  onCheckedChange={(checked) => 
                                    handlePermissionChange(menu.id, 'canCreate', checked as boolean)
                                  }
                                  data-testid={`checkbox-${menu.id}-create`}
                                />
                                <span className="text-sm">Tạo</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <Checkbox
                                  checked={menuPermissions[menu.id]?.canEdit || false}
                                  onCheckedChange={(checked) => 
                                    handlePermissionChange(menu.id, 'canEdit', checked as boolean)
                                  }
                                  data-testid={`checkbox-${menu.id}-edit`}
                                />
                                <span className="text-sm">Sửa</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <Checkbox
                                  checked={menuPermissions[menu.id]?.canDelete || false}
                                  onCheckedChange={(checked) => 
                                    handlePermissionChange(menu.id, 'canDelete', checked as boolean)
                                  }
                                  data-testid={`checkbox-${menu.id}-delete`}
                                />
                                <span className="text-sm">Xóa</span>
                              </label>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}