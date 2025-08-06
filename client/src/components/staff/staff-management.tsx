import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import AddStaffModal from "./add-staff-modal";
import type { Staff, Department } from "@shared/schema";

export default function StaffManagement() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch staff
  const { data: staff = [], isLoading: isLoadingStaff } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  // Fetch departments for filter
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  // Delete staff mutation
  const deleteStaffMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/staff/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({
        title: "Thành công",
        description: "Đã xóa cán bộ thành công.",
      });
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa cán bộ.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (staffMember: Staff) => {
    setEditingStaff(staffMember);
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa cán bộ này?")) {
      deleteStaffMutation.mutate(id);
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingStaff(null);
  };

  // Filter staff based on search and department
  const filteredStaff = staff.filter((member) => {
    const matchesSearch = member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = !selectedDepartment || selectedDepartment === 'all' || member.departmentId === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900" data-testid="text-page-title">
          Quản lý cán bộ
        </h2>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-bidv-teal hover:bg-bidv-teal/90 text-white"
          data-testid="button-add-staff"
        >
          <Plus className="w-4 h-4 mr-2" />
          Thêm cán bộ
        </Button>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tìm kiếm
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Tìm theo tên, mã..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phòng ban
              </label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger data-testid="select-department">
                  <SelectValue placeholder="Tất cả phòng ban" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả phòng ban</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                className="bg-bidv-light hover:bg-bidv-light/90 text-white"
                data-testid="button-search"
              >
                <Search className="w-4 h-4 mr-2" />
                Tìm kiếm
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staff Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách cán bộ ({filteredStaff.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingStaff ? (
            <div className="text-center py-8" data-testid="loading-staff">
              Đang tải dữ liệu...
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center py-8 text-gray-500" data-testid="no-staff">
              Không tìm thấy cán bộ nào
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cán bộ</TableHead>
                    <TableHead>Mã ID</TableHead>
                    <TableHead>Chức danh</TableHead>
                    <TableHead>Phòng ban</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((member) => {
                    const department = departments.find(d => d.id === member.departmentId);
                    return (
                      <TableRow key={member.id} data-testid={`staff-row-${member.id}`}>
                        <TableCell>
                          <div className="flex items-center space-x-4">
                            <div className="bg-bidv-teal text-white w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium">
                              {member.fullName.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900" data-testid={`text-staff-name-${member.id}`}>
                                {member.fullName}
                              </div>
                              {member.birthDate && (
                                <div className="text-sm text-gray-500">
                                  {new Date(member.birthDate).toLocaleDateString('vi-VN')}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" data-testid={`text-employee-id-${member.id}`}>
                            {member.employeeId}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm text-gray-900" data-testid={`text-position-${member.id}`}>
                              {member.position}
                            </div>
                            <div className="text-sm text-gray-500">
                              {member.positionShort}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-department-${member.id}`}>
                          {department?.name || "Không xác định"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(member)}
                              className="text-bidv-teal hover:text-bidv-teal/80"
                              data-testid={`button-edit-${member.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(member.id)}
                              className="text-red-600 hover:text-red-700"
                              data-testid={`button-delete-${member.id}`}
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

      {/* Add/Edit Staff Modal */}
      <AddStaffModal
        isOpen={showAddModal}
        onClose={handleCloseModal}
        staff={editingStaff}
      />
    </div>
  );
}
