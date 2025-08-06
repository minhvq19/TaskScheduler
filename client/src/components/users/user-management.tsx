import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, UserCog, Users, Search } from "lucide-react";
import { insertSystemUserSchema, insertUserGroupSchema, type SystemUser, type UserGroup } from "@shared/schema";
import { z } from "zod";

const userFormSchema = insertSystemUserSchema;
const groupFormSchema = insertUserGroupSchema.extend({
  permissions: z.record(z.enum(["EDIT", "VIEW"])),
});

type UserFormData = z.infer<typeof userFormSchema>;
type GroupFormData = z.infer<typeof groupFormSchema>;

// Available functions for permission management
const availableFunctions = [
  { key: "staff_management", label: "Quản lý cán bộ" },
  { key: "department_management", label: "Quản lý phòng ban" },
  { key: "event_management", label: "Quản lý sự kiện" },
  { key: "room_management", label: "Quản lý phòng họp" },
  { key: "work_schedule", label: "Lịch công tác" },
  { key: "meeting_schedule", label: "Lịch phòng họp" },
  { key: "other_events", label: "Sự kiện khác" },
  { key: "user_management", label: "Quản lý người dùng" },
  { key: "permissions", label: "Phân quyền" },
];

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState("users");
  const [showUserModal, setShowUserModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const userForm = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      password: "",
      userGroupId: "",
    },
  });

  const groupForm = useForm<GroupFormData>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: "",
      permissions: {},
    },
  });

  // Fetch system users
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<SystemUser[]>({
    queryKey: ["/api/system-users"],
  });

  // Fetch user groups
  const { data: groups = [], isLoading: isLoadingGroups } = useQuery<UserGroup[]>({
    queryKey: ["/api/user-groups"],
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      await apiRequest("POST", "/api/system-users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-users"] });
      toast({
        title: "Thành công",
        description: "Đã thêm người dùng mới thành công.",
      });
      handleCloseUserModal();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể thêm người dùng.",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      await apiRequest("PUT", `/api/system-users/${editingUser?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-users"] });
      toast({
        title: "Thành công",
        description: "Đã cập nhật người dùng thành công.",
      });
      handleCloseUserModal();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật người dùng.",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/system-users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-users"] });
      toast({
        title: "Thành công",
        description: "Đã xóa người dùng thành công.",
      });
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa người dùng.",
        variant: "destructive",
      });
    },
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (data: GroupFormData) => {
      await apiRequest("POST", "/api/user-groups", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups"] });
      toast({
        title: "Thành công",
        description: "Đã thêm nhóm quyền mới thành công.",
      });
      handleCloseGroupModal();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể thêm nhóm quyền.",
        variant: "destructive",
      });
    },
  });

  // Update group mutation
  const updateGroupMutation = useMutation({
    mutationFn: async (data: GroupFormData) => {
      await apiRequest("PUT", `/api/user-groups/${editingGroup?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups"] });
      toast({
        title: "Thành công",
        description: "Đã cập nhật nhóm quyền thành công.",
      });
      handleCloseGroupModal();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật nhóm quyền.",
        variant: "destructive",
      });
    },
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/user-groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-groups"] });
      toast({
        title: "Thành công",
        description: "Đã xóa nhóm quyền thành công.",
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

  const handleEditUser = (user: SystemUser) => {
    setEditingUser(user);
    userForm.reset({
      username: user.username,
      password: "", // Don't populate password for security
      userGroupId: user.userGroupId,
    });
    setShowUserModal(true);
  };

  const handleDeleteUser = (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa người dùng này?")) {
      deleteUserMutation.mutate(id);
    }
  };

  const handleCloseUserModal = () => {
    setShowUserModal(false);
    setEditingUser(null);
    userForm.reset();
  };

  const handleEditGroup = (group: UserGroup) => {
    setEditingGroup(group);
    groupForm.reset({
      name: group.name,
      permissions: group.permissions as Record<string, "EDIT" | "VIEW">,
    });
    setShowGroupModal(true);
  };

  const handleDeleteGroup = (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa nhóm quyền này?")) {
      deleteGroupMutation.mutate(id);
    }
  };

  const handleCloseGroupModal = () => {
    setShowGroupModal(false);
    setEditingGroup(null);
    groupForm.reset();
  };

  const onSubmitUser = (data: UserFormData) => {
    if (editingUser) {
      updateUserMutation.mutate(data);
    } else {
      createUserMutation.mutate(data);
    }
  };

  const onSubmitGroup = (data: GroupFormData) => {
    if (editingGroup) {
      updateGroupMutation.mutate(data);
    } else {
      createGroupMutation.mutate(data);
    }
  };

  const handlePermissionChange = (functionKey: string, permission: "EDIT" | "VIEW" | "") => {
    const currentPermissions = groupForm.getValues("permissions");
    const newPermissions = { ...currentPermissions };
    
    if (permission === "") {
      delete newPermissions[functionKey];
    } else {
      newPermissions[functionKey] = permission;
    }
    
    groupForm.setValue("permissions", newPermissions);
  };

  // Filter users based on search
  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter groups based on search  
  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isUserLoading = createUserMutation.isPending || updateUserMutation.isPending;
  const isGroupLoading = createGroupMutation.isPending || updateGroupMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900" data-testid="text-page-title">
          Quản lý người dùng
        </h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" data-testid="tab-users">
            <UserCog className="w-4 h-4 mr-2" />
            Người dùng
          </TabsTrigger>
          <TabsTrigger value="groups" data-testid="tab-groups">
            <Users className="w-4 h-4 mr-2" />
            Nhóm quyền
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Tìm kiếm người dùng..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search-users"
                />
              </div>
            </div>
            <Button
              onClick={() => setShowUserModal(true)}
              className="bg-bidv-teal hover:bg-bidv-teal/90 text-white"
              data-testid="button-add-user"
            >
              <Plus className="w-4 h-4 mr-2" />
              Thêm người dùng
            </Button>
          </div>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Danh sách người dùng ({filteredUsers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="text-center py-8" data-testid="loading-users">
                  Đang tải dữ liệu...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500" data-testid="no-users">
                  Không tìm thấy người dùng nào
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên đăng nhập</TableHead>
                        <TableHead>Nhóm quyền</TableHead>
                        <TableHead>Ngày tạo</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => {
                        const group = groups.find(g => g.id === user.userGroupId);
                        
                        return (
                          <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <div className="bg-bidv-teal text-white w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium">
                                  {user.username.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900" data-testid={`text-username-${user.id}`}>
                                    {user.username}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell data-testid={`text-user-group-${user.id}`}>
                              {group ? (
                                <Badge variant="outline">{group.name}</Badge>
                              ) : (
                                <span className="text-gray-400">Không xác định</span>
                              )}
                            </TableCell>
                            <TableCell data-testid={`text-user-created-${user.id}`}>
                              {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditUser(user)}
                                  className="text-bidv-teal hover:text-bidv-teal/80"
                                  data-testid={`button-edit-user-${user.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="text-red-600 hover:text-red-700"
                                  data-testid={`button-delete-user-${user.id}`}
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
        </TabsContent>

        <TabsContent value="groups" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Tìm kiếm nhóm quyền..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search-groups"
                />
              </div>
            </div>
            <Button
              onClick={() => setShowGroupModal(true)}
              className="bg-bidv-teal hover:bg-bidv-teal/90 text-white"
              data-testid="button-add-group"
            >
              <Plus className="w-4 h-4 mr-2" />
              Thêm nhóm quyền
            </Button>
          </div>

          {/* Groups Table */}
          <Card>
            <CardHeader>
              <CardTitle>Danh sách nhóm quyền ({filteredGroups.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingGroups ? (
                <div className="text-center py-8" data-testid="loading-groups">
                  Đang tải dữ liệu...
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="text-center py-8 text-gray-500" data-testid="no-groups">
                  Không tìm thấy nhóm quyền nào
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên nhóm quyền</TableHead>
                        <TableHead>Số quyền</TableHead>
                        <TableHead>Ngày tạo</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGroups.map((group) => {
                        const permissions = group.permissions as Record<string, string>;
                        const permissionCount = Object.keys(permissions).length;
                        
                        return (
                          <TableRow key={group.id} data-testid={`group-row-${group.id}`}>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <div className="bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center">
                                  <Users className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900" data-testid={`text-group-name-${group.id}`}>
                                    {group.name}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell data-testid={`text-permission-count-${group.id}`}>
                              <Badge variant="secondary">{permissionCount} chức năng</Badge>
                            </TableCell>
                            <TableCell data-testid={`text-group-created-${group.id}`}>
                              {new Date(group.createdAt).toLocaleDateString('vi-VN')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditGroup(group)}
                                  className="text-bidv-teal hover:text-bidv-teal/80"
                                  data-testid={`button-edit-group-${group.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteGroup(group.id)}
                                  className="text-red-600 hover:text-red-700"
                                  data-testid={`button-delete-group-${group.id}`}
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
        </TabsContent>
      </Tabs>

      {/* Add/Edit User Modal */}
      <Dialog open={showUserModal} onOpenChange={handleCloseUserModal}>
        <DialogContent className="max-w-lg" data-testid="modal-add-user">
          <DialogHeader>
            <DialogTitle data-testid="text-user-modal-title">
              {editingUser ? "Chỉnh sửa người dùng" : "Thêm người dùng mới"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={userForm.handleSubmit(onSubmitUser)} className="space-y-4">
            <div>
              <Label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Tên đăng nhập *
              </Label>
              <Input
                id="username"
                {...userForm.register("username")}
                placeholder="Nhập tên đăng nhập"
                className="focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                data-testid="input-username"
              />
              {userForm.formState.errors.username && (
                <p className="text-red-600 text-sm mt-1">
                  {userForm.formState.errors.username.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mật khẩu {editingUser ? "(để trống nếu không thay đổi)" : "*"}
              </Label>
              <Input
                id="password"
                type="password"
                {...userForm.register("password")}
                placeholder="Nhập mật khẩu"
                className="focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                data-testid="input-password"
              />
              <p className="text-xs text-gray-500 mt-1">
                Tối thiểu 11 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt
              </p>
              {userForm.formState.errors.password && (
                <p className="text-red-600 text-sm mt-1">
                  {userForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="userGroupId" className="block text-sm font-medium text-gray-700 mb-2">
                Nhóm quyền *
              </Label>
              <Select
                value={userForm.watch("userGroupId")}
                onValueChange={(value) => userForm.setValue("userGroupId", value)}
              >
                <SelectTrigger data-testid="select-user-group">
                  <SelectValue placeholder="Chọn nhóm quyền" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {userForm.formState.errors.userGroupId && (
                <p className="text-red-600 text-sm mt-1">
                  {userForm.formState.errors.userGroupId.message}
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseUserModal}
                data-testid="button-cancel-user"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                className="bg-bidv-teal hover:bg-bidv-teal/90 text-white"
                disabled={isUserLoading}
                data-testid="button-submit-user"
              >
                {isUserLoading ? "Đang xử lý..." : (editingUser ? "Cập nhật" : "Thêm người dùng")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Group Modal */}
      <Dialog open={showGroupModal} onOpenChange={handleCloseGroupModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-add-group">
          <DialogHeader>
            <DialogTitle data-testid="text-group-modal-title">
              {editingGroup ? "Chỉnh sửa nhóm quyền" : "Thêm nhóm quyền mới"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={groupForm.handleSubmit(onSubmitGroup)} className="space-y-6">
            <div>
              <Label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-2">
                Tên nhóm quyền *
              </Label>
              <Input
                id="groupName"
                {...groupForm.register("name")}
                placeholder="Nhập tên nhóm quyền"
                className="focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                data-testid="input-group-name"
              />
              {groupForm.formState.errors.name && (
                <p className="text-red-600 text-sm mt-1">
                  {groupForm.formState.errors.name.message}
                </p>
              )}
            </div>

            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-4">
                Phân quyền chức năng
              </Label>
              <div className="border rounded-lg p-4 space-y-4 max-h-64 overflow-y-auto">
                {availableFunctions.map((func) => {
                  const currentPermission = groupForm.watch("permissions")[func.key] || "";
                  
                  return (
                    <div key={func.key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{func.label}</span>
                      <Select
                        value={currentPermission}
                        onValueChange={(value) => handlePermissionChange(func.key, value as "EDIT" | "VIEW" | "")}
                      >
                        <SelectTrigger className="w-32" data-testid={`select-permission-${func.key}`}>
                          <SelectValue placeholder="Chọn quyền" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Không có</SelectItem>
                          <SelectItem value="VIEW">Chỉ xem</SelectItem>
                          <SelectItem value="EDIT">Sửa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseGroupModal}
                data-testid="button-cancel-group"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                className="bg-bidv-teal hover:bg-bidv-teal/90 text-white"
                disabled={isGroupLoading}
                data-testid="button-submit-group"
              >
                {isGroupLoading ? "Đang xử lý..." : (editingGroup ? "Cập nhật" : "Thêm nhóm quyền")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
