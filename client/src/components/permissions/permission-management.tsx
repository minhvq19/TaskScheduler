import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Trash2, Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { SchedulePermission, SystemUser, Staff, Department } from "@shared/schema";

export default function PermissionManagement() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch schedule permissions
  const { data: permissions = [], isLoading: isLoadingPermissions } = useQuery<SchedulePermission[]>({
    queryKey: ["/api/schedule-permissions"],
  });

  // Fetch system users
  const { data: systemUsers = [] } = useQuery<SystemUser[]>({
    queryKey: ["/api/system-users"],
  });

  // Fetch staff (filter for Ban Giám đốc)
  const { data: allStaff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  // Fetch departments to find Ban Giám đốc
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const boardDept = departments.find(d => d.name.includes("Ban giám đốc"));
  const boardStaff = allStaff.filter(s => s.departmentId === boardDept?.id);

  // Create permission mutation
  const createPermissionMutation = useMutation({
    mutationFn: async (data: { userId: string; staffIds: string[] }) => {
      const promises = data.staffIds.map(staffId => 
        apiRequest("POST", "/api/schedule-permissions", {
          userId: data.userId,
          staffId,
        })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule-permissions"] });
      toast({
        title: "Thành công",
        description: "Đã phân quyền thành công.",
      });
      setShowAddModal(false);
      setSelectedUser("");
      setSelectedStaff([]);
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể phân quyền.",
        variant: "destructive",
      });
    },
  });

  // Delete permission mutation
  const deletePermissionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/schedule-permissions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule-permissions"] });
      toast({
        title: "Thành công",
        description: "Đã xóa phân quyền thành công.",
      });
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa phân quyền.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (userId: string) => {
    const userPermissions = groupedPermissions[userId] || [];
    const currentStaffIds = userPermissions.map(p => p.staffId);
    
    setEditingUserId(userId);
    setSelectedUser(userId);
    setSelectedStaff(currentStaffIds);
    setShowEditModal(true);
  };

  const handleDelete = (userId: string) => {
    const user = systemUsers.find(u => u.id === userId);
    const userPermissions = groupedPermissions[userId] || [];
    
    if (window.confirm(`Bạn có chắc chắn muốn xóa tất cả phân quyền của ${user?.username || 'người dùng này'}?`)) {
      // Delete all permissions for this user
      const deletePromises = userPermissions.map(permission => 
        apiRequest("DELETE", `/api/schedule-permissions/${permission.id}`)
      );
      
      Promise.all(deletePromises)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/schedule-permissions"] });
          toast({
            title: "Thành công",
            description: "Đã xóa tất cả phân quyền của người dùng.",
          });
        })
        .catch((error) => {
          toast({
            title: "Lỗi",
            description: error.message || "Không thể xóa phân quyền.",
            variant: "destructive",
          });
        });
    }
  };

  const handleAddPermission = () => {
    if (!selectedUser || selectedStaff.length === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn người dùng và ít nhất một cán bộ.",
        variant: "destructive",
      });
      return;
    }

    createPermissionMutation.mutate({
      userId: selectedUser,
      staffIds: selectedStaff,
    });
  };

  const handleUpdatePermission = () => {
    if (!editingUserId || selectedStaff.length === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn ít nhất một cán bộ.",
        variant: "destructive",
      });
      return;
    }

    const currentPermissions = groupedPermissions[editingUserId] || [];
    const currentStaffIds = currentPermissions.map(p => p.staffId);
    
    // Find permissions to delete (removed staff)
    const toDelete = currentPermissions.filter(p => !selectedStaff.includes(p.staffId));
    
    // Find permissions to add (new staff)
    const toAdd = selectedStaff.filter(staffId => !currentStaffIds.includes(staffId));

    const promises: Promise<any>[] = [];
    
    // Delete removed permissions
    toDelete.forEach(permission => {
      promises.push(apiRequest("DELETE", `/api/schedule-permissions/${permission.id}`));
    });
    
    // Add new permissions
    toAdd.forEach(staffId => {
      promises.push(apiRequest("POST", "/api/schedule-permissions", {
        userId: editingUserId,
        staffId,
      }));
    });

    Promise.all(promises)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/schedule-permissions"] });
        toast({
          title: "Thành công",
          description: "Đã cập nhật phân quyền thành công.",
        });
        setShowEditModal(false);
        setEditingUserId("");
        setSelectedUser("");
        setSelectedStaff([]);
      })
      .catch((error) => {
        toast({
          title: "Lỗi",
          description: error.message || "Không thể cập nhật phân quyền.",
          variant: "destructive",
        });
      });
  };

  const handleStaffToggle = (staffId: string) => {
    setSelectedStaff(prev => 
      prev.includes(staffId) 
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    );
  };

  // Group permissions by user
  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.userId]) {
      acc[permission.userId] = [];
    }
    acc[permission.userId].push(permission);
    return acc;
  }, {} as Record<string, SchedulePermission[]>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900" data-testid="text-page-title">
          Phân quyền nhập lịch công tác
        </h2>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-bidv-teal hover:bg-bidv-teal/90 text-white"
          data-testid="button-add-permission"
        >
          <Plus className="w-4 h-4 mr-2" />
          Phân quyền mới
        </Button>
      </div>

      {/* Permission Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Ma trận phân quyền</CardTitle>
          <p className="text-sm text-gray-500">
            Quản lý quyền nhập lịch công tác cho từng cá nhân
          </p>
        </CardHeader>
        <CardContent>
          {isLoadingPermissions ? (
            <div className="text-center py-8" data-testid="loading-permissions">
              Đang tải dữ liệu phân quyền...
            </div>
          ) : Object.keys(groupedPermissions).length === 0 ? (
            <div className="text-center py-8 text-gray-500" data-testid="no-permissions">
              Chưa có phân quyền nào
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Người được phân quyền</TableHead>
                    <TableHead>Ngày phân quyền</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(groupedPermissions).map(([userId, userPermissions]) => {
                    const user = systemUsers.find(u => u.id === userId);
                    const firstPermission = userPermissions[0];
                    
                    return (
                      <TableRow key={userId} data-testid={`permission-row-${userId}`}>
                        <TableCell>
                          <div className="flex items-center space-x-4">
                            <div className="bg-bidv-teal text-white w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium">
                              {user?.username?.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user?.username || "Người dùng không xác định"}
                              </div>
                              <div className="text-sm text-gray-500">Người dùng hệ thống</div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-sm text-gray-900">
                          {firstPermission.createdAt ? new Date(firstPermission.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800">Hoạt động</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(userId)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                              data-testid={`button-edit-${userId}`}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Sửa
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(userId)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              data-testid={`button-delete-${userId}`}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Xóa
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

      {/* Add Permission Modal */}
      <Dialog 
        open={showAddModal} 
        onOpenChange={(open) => {
          setShowAddModal(open);
          if (!open) {
            setSelectedUser("");
            setSelectedStaff([]);
          }
        }}
      >
        <DialogContent className="max-w-2xl" data-testid="modal-add-permission">
          <DialogHeader>
            <DialogTitle data-testid="text-modal-title">Phân quyền mới</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <Label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-2">
                Chọn người dùng *
              </Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger data-testid="select-user">
                  <SelectValue placeholder="Chọn người dùng" />
                </SelectTrigger>
                <SelectContent>
                  {systemUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Chọn cán bộ có thể nhập lịch *
              </Label>
              <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                {boardStaff.length === 0 ? (
                  <div className="text-center text-gray-500 py-4">
                    Chưa có cán bộ Ban Giám đốc nào
                  </div>
                ) : (
                  <div className="space-y-2">
                    {boardStaff.map((staff) => (
                      <div key={staff.id} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id={`staff-${staff.id}`}
                          checked={selectedStaff.includes(staff.id)}
                          onChange={() => handleStaffToggle(staff.id)}
                          className="h-4 w-4 text-bidv-teal focus:ring-bidv-teal border-gray-300 rounded"
                          data-testid={`checkbox-staff-${staff.id}`}
                        />
                        <label htmlFor={`staff-${staff.id}`} className="text-sm text-gray-900 cursor-pointer">
                          {staff.positionShort} {staff.fullName}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddModal(false)}
                data-testid="button-cancel"
              >
                Hủy
              </Button>
              <Button
                onClick={handleAddPermission}
                className="bg-bidv-teal hover:bg-bidv-teal/90 text-white"
                disabled={createPermissionMutation.isPending}
                data-testid="button-submit"
              >
                {createPermissionMutation.isPending ? "Đang xử lý..." : "Phân quyền"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Permission Modal */}
      <Dialog 
        open={showEditModal} 
        onOpenChange={(open) => {
          setShowEditModal(open);
          if (!open) {
            setEditingUserId("");
            setSelectedUser("");
            setSelectedStaff([]);
          }
        }}
      >
        <DialogContent className="max-w-2xl" data-testid="modal-edit-permission">
          <DialogHeader>
            <DialogTitle data-testid="text-edit-modal-title">
              Chỉnh sửa phân quyền - {systemUsers.find(u => u.id === editingUserId)?.username}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Chọn cán bộ có thể nhập lịch *
              </Label>
              <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                {boardStaff.length === 0 ? (
                  <div className="text-center text-gray-500 py-4">
                    Chưa có cán bộ Ban Giám đốc nào
                  </div>
                ) : (
                  <div className="space-y-2">
                    {boardStaff.map((staff) => (
                      <div key={staff.id} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id={`edit-staff-${staff.id}`}
                          checked={selectedStaff.includes(staff.id)}
                          onChange={() => handleStaffToggle(staff.id)}
                          className="h-4 w-4 text-bidv-teal focus:ring-bidv-teal border-gray-300 rounded"
                          data-testid={`edit-checkbox-staff-${staff.id}`}
                        />
                        <label htmlFor={`edit-staff-${staff.id}`} className="text-sm text-gray-900 cursor-pointer">
                          {staff.positionShort} {staff.fullName}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditModal(false)}
                data-testid="button-edit-cancel"
              >
                Hủy
              </Button>
              <Button
                onClick={handleUpdatePermission}
                className="bg-bidv-teal hover:bg-bidv-teal/90 text-white"
                data-testid="button-edit-submit"
              >
                Cập nhật
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
