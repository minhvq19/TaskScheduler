import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type Holiday } from "@shared/schema";
import { format } from "date-fns";
import { Plus, Edit, Trash2, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const holidaySchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên ngày lễ"),
  date: z.string().min(1, "Vui lòng chọn ngày"),
});

type HolidayFormData = z.infer<typeof holidaySchema>;

export default function HolidayManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  // Fetch holidays
  const { data: holidays = [], isLoading } = useQuery<Holiday[]>({
    queryKey: ["/api/holidays"],
  });

  const form = useForm<HolidayFormData>({
    resolver: zodResolver(holidaySchema),
    defaultValues: {
      name: "",
      date: "",
    },
  });

  // Create holiday mutation
  const createHolidayMutation = useMutation({
    mutationFn: async (data: HolidayFormData) => {
      const payload = {
        ...data,
        date: new Date(data.date).toISOString(),
      };
      await apiRequest("POST", "/api/holidays", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
      toast({
        title: "Thành công",
        description: "Đã thêm ngày lễ thành công.",
      });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể thêm ngày lễ.",
        variant: "destructive",
      });
    },
  });

  // Update holiday mutation
  const updateHolidayMutation = useMutation({
    mutationFn: async (data: HolidayFormData) => {
      const payload = {
        ...data,
        date: new Date(data.date).toISOString(),
      };
      await apiRequest("PUT", `/api/holidays/${editingHoliday?.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
      toast({
        title: "Thành công",
        description: "Đã cập nhật ngày lễ thành công.",
      });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật ngày lễ.",
        variant: "destructive",
      });
    },
  });

  // Delete holiday mutation
  const deleteHolidayMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/holidays/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
      toast({
        title: "Thành công",
        description: "Đã xóa ngày lễ thành công.",
      });
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa ngày lễ.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: HolidayFormData) => {
    if (editingHoliday) {
      updateHolidayMutation.mutate(data);
    } else {
      createHolidayMutation.mutate(data);
    }
  };

  const handleEdit = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    form.reset({
      name: holiday.name,
      date: format(new Date(holiday.date), "yyyy-MM-dd"),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa ngày lễ này?")) {
      deleteHolidayMutation.mutate(id);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingHoliday(null);
    form.reset();
  };

  const isLoading_mutation = createHolidayMutation.isPending || updateHolidayMutation.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Quản lý ngày lễ
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {
                setEditingHoliday(null);
                form.reset();
              }}
              data-testid="button-add-holiday"
            >
              <Plus className="h-4 w-4 mr-2" />
              Thêm ngày lễ
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-holiday">
            <DialogHeader>
              <DialogTitle data-testid="title-holiday">
                {editingHoliday ? "Sửa ngày lễ" : "Thêm ngày lễ"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên ngày lễ *</Label>
                <Input
                  id="name"
                  placeholder="Ví dụ: Tết Nguyên Đán"
                  {...form.register("name")}
                  data-testid="input-holiday-name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Ngày *</Label>
                <Input
                  id="date"
                  type="date"
                  {...form.register("date")}
                  data-testid="input-holiday-date"
                />
                {form.formState.errors.date && (
                  <p className="text-sm text-red-500">{form.formState.errors.date.message}</p>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  disabled={isLoading_mutation}
                  data-testid="button-cancel"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading_mutation}
                  data-testid="button-submit"
                >
                  {isLoading_mutation ? "Đang xử lý..." : (editingHoliday ? "Cập nhật" : "Thêm")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">Đang tải...</div>
        ) : holidays.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Chưa có ngày lễ nào được thiết lập</p>
          </div>
        ) : (
          <Table data-testid="table-holidays">
            <TableHeader>
              <TableRow>
                <TableHead>Tên ngày lễ</TableHead>
                <TableHead>Ngày</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holidays.map((holiday) => (
                <TableRow key={holiday.id} data-testid={`row-holiday-${holiday.id}`}>
                  <TableCell className="font-medium">{holiday.name}</TableCell>
                  <TableCell>
                    {format(new Date(holiday.date), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>
                    {format(new Date(holiday.createdAt!), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(holiday)}
                        data-testid={`button-edit-holiday-${holiday.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(holiday.id)}
                        disabled={deleteHolidayMutation.isPending}
                        data-testid={`button-delete-holiday-${holiday.id}`}
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
  );
}