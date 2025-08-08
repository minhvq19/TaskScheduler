import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Building } from "lucide-react";
import { insertDepartmentSchema, type Department } from "@shared/schema";
import { z } from "zod";

const formSchema = insertDepartmentSchema;
type FormData = z.infer<typeof formSchema>;

export default function DepartmentManagement() {
  const [showModal, setShowModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canEdit } = usePermissions();
  
  // Check if user can edit departments
  const canEditDepartments = canEdit("departments");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      name: "",
      shortName: "",
      blockName: "",
      notes: "",
    },
  });

  // Fetch departments
  const { data: departments = [], isLoading } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  // Create department mutation
  const createDepartmentMutation = useMutation({
    mutationFn: async (data: FormData) => {
      await apiRequest("POST", "/api/departments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({
        title: "Thành công",
        description: "Đã thêm phòng ban mới thành công.",
      });
      handleCloseModal();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể thêm phòng ban.",
        variant: "destructive",
      });
    },
  });

  // Update department mutation
  const updateDepartmentMutation = useMutation({
    mutationFn: async (data: FormData) => {
      await apiRequest("PUT", `/api/departments/${editingDepartment?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({
        title: "Thành công",
        description: "Đã cập nhật phòng ban thành công.",
      });
      handleCloseModal();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật phòng ban.",
        variant: "destructive",
      });
    },
  });

  // Delete department mutation
  const deleteDepartmentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/departments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({
        title: "Thành công",
        description: "Đã xóa phòng ban thành công.",
      });
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa phòng ban.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    form.reset({
      code: department.code,
      name: department.name,
      shortName: department.shortName || "",
      blockName: department.blockName || "",
      notes: department.notes || "",
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa phòng ban này?")) {
      deleteDepartmentMutation.mutate(id);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDepartment(null);
    form.reset();
  };

  const onSubmit = (data: FormData) => {
    if (editingDepartment) {
      updateDepartmentMutation.mutate(data);
    } else {
      createDepartmentMutation.mutate(data);
    }
  };

  const isMutating = createDepartmentMutation.isPending || updateDepartmentMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900" data-testid="text-page-title">
          Quản lý phòng ban
        </h2>
        {canEditDepartments && (
          <Button
            onClick={() => setShowModal(true)}
            className="bg-bidv-teal hover:bg-bidv-teal/90 text-white"
            data-testid="button-add-department"
          >
            <Plus className="w-4 h-4 mr-2" />
            Thêm phòng ban
          </Button>
        )}
      </div>

      {/* Departments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách phòng ban ({departments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isMutating ? (
            <div className="text-center py-8" data-testid="loading-departments">
              Đang tải dữ liệu...
            </div>
          ) : departments.length === 0 ? (
            <div className="text-center py-8 text-gray-500" data-testid="no-departments">
              Chưa có phòng ban nào
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên phòng ban</TableHead>
                    <TableHead>Mã phòng</TableHead>
                    <TableHead>Tên viết tắt</TableHead>
                    <TableHead>Tên khối</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((department) => (
                    <TableRow key={department.id} data-testid={`department-row-${department.id}`}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="bg-bidv-blue text-white w-10 h-10 rounded-full flex items-center justify-center">
                            <Building className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900" data-testid={`text-department-name-${department.id}`}>
                              {department.name}
                            </div>
                            {department.notes && (
                              <div className="text-sm text-gray-500">{department.notes}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-gray-100 rounded text-sm" data-testid={`text-department-code-${department.id}`}>
                          {department.code}
                        </span>
                      </TableCell>
                      <TableCell data-testid={`text-department-short-${department.id}`}>
                        {department.shortName || "-"}
                      </TableCell>
                      <TableCell data-testid={`text-department-block-${department.id}`}>
                        {department.blockName || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          {canEditDepartments && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(department)}
                                className="text-bidv-teal hover:text-bidv-teal/80"
                                data-testid={`button-edit-${department.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(department.id)}
                                className="text-red-600 hover:text-red-700"
                                data-testid={`button-delete-${department.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {!canEditDepartments && (
                            <span className="text-sm text-gray-500">Chỉ xem</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Department Modal */}
      <Dialog open={showModal} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-lg" data-testid="modal-add-department">
          <DialogHeader>
            <DialogTitle data-testid="text-modal-title">
              {editingDepartment ? "Chỉnh sửa phòng ban" : "Thêm phòng ban mới"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Tên phòng ban *
              </Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Nhập tên phòng ban"
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
              <Label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Mã phòng *
              </Label>
              <Input
                id="code"
                {...form.register("code")}
                placeholder="Nhập mã phòng"
                className="focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                data-testid="input-code"
              />
              {form.formState.errors.code && (
                <p className="text-red-600 text-sm mt-1">
                  {form.formState.errors.code.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="shortName" className="block text-sm font-medium text-gray-700 mb-2">
                Tên viết tắt
              </Label>
              <Input
                id="shortName"
                {...form.register("shortName")}
                placeholder="Nhập tên viết tắt"
                className="focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                data-testid="input-short-name"
              />
            </div>

            <div>
              <Label htmlFor="blockName" className="block text-sm font-medium text-gray-700 mb-2">
                Tên khối
              </Label>
              <Input
                id="blockName"
                {...form.register("blockName")}
                placeholder="Nhập tên khối"
                className="focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                data-testid="input-block-name"
              />
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
                disabled={isLoading}
                data-testid="button-submit"
              >
                {isLoading ? "Đang xử lý..." : (editingDepartment ? "Cập nhật" : "Thêm phòng ban")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
