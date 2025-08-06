import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, DoorOpen } from "lucide-react";
import { insertMeetingRoomSchema, type MeetingRoom } from "@shared/schema";
import { z } from "zod";

const formSchema = insertMeetingRoomSchema;
type FormData = z.infer<typeof formSchema>;

export default function RoomManagement() {
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<MeetingRoom | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      location: "",
    },
  });

  // Fetch meeting rooms
  const { data: rooms = [], isLoading } = useQuery<MeetingRoom[]>({
    queryKey: ["/api/meeting-rooms"],
  });

  // Create room mutation
  const createRoomMutation = useMutation({
    mutationFn: async (data: FormData) => {
      await apiRequest("POST", "/api/meeting-rooms", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-rooms"] });
      toast({
        title: "Thành công",
        description: "Đã thêm phòng họp mới thành công.",
      });
      handleCloseModal();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể thêm phòng họp.",
        variant: "destructive",
      });
    },
  });

  // Update room mutation
  const updateRoomMutation = useMutation({
    mutationFn: async (data: FormData) => {
      await apiRequest("PUT", `/api/meeting-rooms/${editingRoom?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-rooms"] });
      toast({
        title: "Thành công",
        description: "Đã cập nhật phòng họp thành công.",
      });
      handleCloseModal();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật phòng họp.",
        variant: "destructive",
      });
    },
  });

  // Delete room mutation
  const deleteRoomMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/meeting-rooms/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-rooms"] });
      toast({
        title: "Thành công",
        description: "Đã xóa phòng họp thành công.",
      });
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa phòng họp.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (room: MeetingRoom) => {
    setEditingRoom(room);
    form.reset({
      name: room.name,
      location: room.location || "",
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa phòng họp này?")) {
      deleteRoomMutation.mutate(id);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRoom(null);
    form.reset();
  };

  const onSubmit = (data: FormData) => {
    if (editingRoom) {
      updateRoomMutation.mutate(data);
    } else {
      createRoomMutation.mutate(data);
    }
  };

  const isMutating = createRoomMutation.isPending || updateRoomMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900" data-testid="text-page-title">
          Quản lý phòng họp
        </h2>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-bidv-teal hover:bg-bidv-teal/90 text-white"
          data-testid="button-add-room"
        >
          <Plus className="w-4 h-4 mr-2" />
          Thêm phòng họp
        </Button>
      </div>

      {/* Rooms Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách phòng họp ({rooms.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isMutating ? (
            <div className="text-center py-8" data-testid="loading-rooms">
              Đang tải dữ liệu...
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8 text-gray-500" data-testid="no-rooms">
              Chưa có phòng họp nào
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên phòng họp</TableHead>
                    <TableHead>Vị trí</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.map((room) => (
                    <TableRow key={room.id} data-testid={`room-row-${room.id}`}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="bg-purple-500 text-white w-10 h-10 rounded-full flex items-center justify-center">
                            <DoorOpen className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900" data-testid={`text-room-name-${room.id}`}>
                              {room.name}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-room-location-${room.id}`}>
                        {room.location || (
                          <span className="text-gray-400">Chưa có thông tin</span>
                        )}
                      </TableCell>
                      <TableCell data-testid={`text-room-created-${room.id}`}>
                        {new Date(room.createdAt).toLocaleDateString('vi-VN')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(room)}
                            className="text-bidv-teal hover:text-bidv-teal/80"
                            data-testid={`button-edit-${room.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(room.id)}
                            className="text-red-600 hover:text-red-700"
                            data-testid={`button-delete-${room.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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

      {/* Add/Edit Room Modal */}
      <Dialog open={showModal} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-md" data-testid="modal-add-room">
          <DialogHeader>
            <DialogTitle data-testid="text-modal-title">
              {editingRoom ? "Chỉnh sửa phòng họp" : "Thêm phòng họp mới"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Tên phòng họp *
              </Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Nhập tên phòng họp"
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
              <Label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Vị trí phòng họp
              </Label>
              <Input
                id="location"
                {...form.register("location")}
                placeholder="Nhập vị trí phòng họp"
                className="focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                data-testid="input-location"
              />
              {form.formState.errors.location && (
                <p className="text-red-600 text-sm mt-1">
                  {form.formState.errors.location.message}
                </p>
              )}
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
                {isLoading ? "Đang xử lý..." : (editingRoom ? "Cập nhật" : "Thêm phòng họp")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
