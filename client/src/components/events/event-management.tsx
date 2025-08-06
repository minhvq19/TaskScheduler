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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Star } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { insertEventCategorySchema, type EventCategory } from "@shared/schema";
import { z } from "zod";

const formSchema = insertEventCategorySchema.extend({
  startDateTime: z.string(),
  endDateTime: z.string(),
});

type FormData = z.infer<typeof formSchema>;

export default function EventManagement() {
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventCategory | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      startDateTime: "",
      endDateTime: "",
      status: "upcoming",
      notes: "",
    },
  });

  // Fetch event categories
  const { data: events = [], isLoading } = useQuery<EventCategory[]>({
    queryKey: ["/api/event-categories"],
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        startDateTime: new Date(data.startDateTime),
        endDateTime: new Date(data.endDateTime),
      };
      await apiRequest("POST", "/api/event-categories", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/event-categories"] });
      toast({
        title: "Thành công",
        description: "Đã thêm sự kiện mới thành công.",
      });
      handleCloseModal();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể thêm sự kiện.",
        variant: "destructive",
      });
    },
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        startDateTime: new Date(data.startDateTime),
        endDateTime: new Date(data.endDateTime),
      };
      await apiRequest("PUT", `/api/event-categories/${editingEvent?.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/event-categories"] });
      toast({
        title: "Thành công",
        description: "Đã cập nhật sự kiện thành công.",
      });
      handleCloseModal();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật sự kiện.",
        variant: "destructive",
      });
    },
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/event-categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/event-categories"] });
      toast({
        title: "Thành công",
        description: "Đã xóa sự kiện thành công.",
      });
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa sự kiện.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (event: EventCategory) => {
    setEditingEvent(event);
    form.reset({
      name: event.name,
      startDateTime: format(new Date(event.startDateTime), "yyyy-MM-dd'T'HH:mm"),
      endDateTime: format(new Date(event.endDateTime), "yyyy-MM-dd'T'HH:mm"),
      status: event.status,
      notes: event.notes || "",
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa sự kiện này?")) {
      deleteEventMutation.mutate(id);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEvent(null);
    form.reset();
  };

  const onSubmit = (data: FormData) => {
    // Validate end time is after start time
    if (new Date(data.endDateTime) <= new Date(data.startDateTime)) {
      toast({
        title: "Lỗi",
        description: "Thời gian kết thúc phải sau thời gian bắt đầu.",
        variant: "destructive",
      });
      return;
    }

    if (editingEvent) {
      updateEventMutation.mutate(data);
    } else {
      createEventMutation.mutate(data);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      upcoming: { label: "Chưa bắt đầu", className: "bg-yellow-100 text-yellow-800" },
      ongoing: { label: "Đang bắt đầu", className: "bg-green-100 text-green-800" },
      finished: { label: "Đã kết thúc", className: "bg-gray-100 text-gray-800" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.upcoming;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const isMutating = createEventMutation.isPending || updateEventMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900" data-testid="text-page-title">
          Quản lý sự kiện
        </h2>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-bidv-teal hover:bg-bidv-teal/90 text-white"
          data-testid="button-add-event"
        >
          <Plus className="w-4 h-4 mr-2" />
          Thêm sự kiện
        </Button>
      </div>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách sự kiện ({events.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isMutating ? (
            <div className="text-center py-8" data-testid="loading-events">
              Đang tải dữ liệu...
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-gray-500" data-testid="no-events">
              Chưa có sự kiện nào
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên sự kiện</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ghi chú</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id} data-testid={`event-row-${event.id}`}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="bg-orange-500 text-white w-10 h-10 rounded-full flex items-center justify-center">
                            <Star className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900" data-testid={`text-event-name-${event.id}`}>
                              {event.name}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div data-testid={`text-event-start-${event.id}`}>
                            Bắt đầu: {format(new Date(event.startDateTime), "dd/MM/yyyy HH:mm", { locale: vi })}
                          </div>
                          <div data-testid={`text-event-end-${event.id}`}>
                            Kết thúc: {format(new Date(event.endDateTime), "dd/MM/yyyy HH:mm", { locale: vi })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`status-event-${event.id}`}>
                        {getStatusBadge(event.status)}
                      </TableCell>
                      <TableCell data-testid={`text-event-notes-${event.id}`}>
                        {event.notes ? (
                          <span className="text-sm text-gray-600">{event.notes}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(event)}
                            className="text-bidv-teal hover:text-bidv-teal/80"
                            data-testid={`button-edit-${event.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(event.id)}
                            className="text-red-600 hover:text-red-700"
                            data-testid={`button-delete-${event.id}`}
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

      {/* Add/Edit Event Modal */}
      <Dialog open={showModal} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-lg" data-testid="modal-add-event">
          <DialogHeader>
            <DialogTitle data-testid="text-modal-title">
              {editingEvent ? "Chỉnh sửa sự kiện" : "Thêm sự kiện mới"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Tên sự kiện *
              </Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Nhập tên sự kiện"
                className="focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                data-testid="input-name"
              />
              {form.formState.errors.name && (
                <p className="text-red-600 text-sm mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDateTime" className="block text-sm font-medium text-gray-700 mb-2">
                  Thời gian bắt đầu *
                </Label>
                <Input
                  id="startDateTime"
                  type="datetime-local"
                  {...form.register("startDateTime")}
                  className="focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                  data-testid="input-start-time"
                />
                {form.formState.errors.startDateTime && (
                  <p className="text-red-600 text-sm mt-1">
                    {form.formState.errors.startDateTime.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="endDateTime" className="block text-sm font-medium text-gray-700 mb-2">
                  Thời gian kết thúc *
                </Label>
                <Input
                  id="endDateTime"
                  type="datetime-local"
                  {...form.register("endDateTime")}
                  className="focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                  data-testid="input-end-time"
                />
                {form.formState.errors.endDateTime && (
                  <p className="text-red-600 text-sm mt-1">
                    {form.formState.errors.endDateTime.message}
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
                placeholder="Nhập ghi chú về sự kiện (tùy chọn)"
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
                {isLoading ? "Đang xử lý..." : (editingEvent ? "Cập nhật" : "Thêm sự kiện")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
