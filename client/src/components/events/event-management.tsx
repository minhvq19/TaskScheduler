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
import { Plus, Edit, Trash2, Calendar, Upload, X } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { insertOtherEventSchema, type OtherEvent } from "@shared/schema";
import { z } from "zod";

// Form schema with proper validation
const formSchema = insertOtherEventSchema.extend({
  startDateTime: z.string().min(1, "Thời gian bắt đầu là bắt buộc"),
  endDateTime: z.string().min(1, "Thời gian kết thúc là bắt buộc"),
  shortName: z.string().min(1, "Tên sự kiện là bắt buộc").max(100, "Tên sự kiện không được vượt quá 100 ký tự"),
  content: z.string().min(1, "Nội dung chi tiết là bắt buộc"),
  imageUrl: z.string().optional(),
}).omit({ imageUrl: true });

type FormData = z.infer<typeof formSchema>;

export default function EventManagement() {
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<OtherEvent | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shortName: "",
      startDateTime: "",
      endDateTime: "",
      content: "",
    },
  });

  // Fetch other events
  const { data: events = [], isLoading } = useQuery<OtherEvent[]>({
    queryKey: ["/api/other-events"],
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const formData = new FormData();
      formData.append("shortName", data.shortName);
      formData.append("startDateTime", data.startDateTime);
      formData.append("endDateTime", data.endDateTime);
      formData.append("content", data.content);
      
      if (selectedFile) {
        formData.append("image", selectedFile);
      }

      const response = await fetch("/api/other-events", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create event");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/other-events"] });
      toast({
        title: "Thành công",
        description: "Đã thêm sự kiện khác thành công.",
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
      const formData = new FormData();
      formData.append("shortName", data.shortName);
      formData.append("startDateTime", data.startDateTime);
      formData.append("endDateTime", data.endDateTime);
      formData.append("content", data.content);
      
      // Keep existing image if no new file selected
      if (editingEvent?.imageUrl && !selectedFile) {
        formData.append("imageUrl", editingEvent.imageUrl);
      } else if (selectedFile) {
        formData.append("image", selectedFile);
      }

      const response = await fetch(`/api/other-events/${editingEvent?.id}`, {
        method: "PUT",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update event");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/other-events"] });
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
      const response = await fetch(`/api/other-events/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete event");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/other-events"] });
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

  const handleEdit = (event: OtherEvent) => {
    setEditingEvent(event);
    form.reset({
      shortName: event.shortName,
      startDateTime: format(new Date(event.startDateTime), "yyyy-MM-dd'T'HH:mm"),
      endDateTime: format(new Date(event.endDateTime), "yyyy-MM-dd'T'HH:mm"),
      content: event.content,
    });
    setSelectedFile(null);
    setPreviewUrl(event.imageUrl || null);
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
    setSelectedFile(null);
    setPreviewUrl(null);
    form.reset();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Lỗi",
        description: "Chỉ chấp nhận file ảnh định dạng: JPG, JPEG, PNG, GIF",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      toast({
        title: "Lỗi",
        description: "Kích thước file không được vượt quá 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(editingEvent?.imageUrl || null);
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

  const isMutating = createEventMutation.isPending || updateEventMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900" data-testid="text-page-title">
          Quản trị sự kiện khác
        </h2>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-bidv-teal hover:bg-bidv-teal/90 text-white"
          data-testid="button-add-event"
        >
          <Plus className="w-4 h-4 mr-2" />
          Thêm sự kiện khác
        </Button>
      </div>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách sự kiện khác ({events.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
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
                    <TableHead>Nội dung chi tiết</TableHead>
                    <TableHead>Hình ảnh</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id} data-testid={`event-row-${event.id}`}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="bg-purple-500 text-white w-10 h-10 rounded-full flex items-center justify-center">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900" data-testid={`text-event-name-${event.id}`}>
                              {event.shortName}
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
                      <TableCell data-testid={`text-event-content-${event.id}`}>
                        <div className="text-sm text-gray-600 max-w-xs">
                          {event.content.length > 100 
                            ? `${event.content.substring(0, 100)}...` 
                            : event.content
                          }
                        </div>
                      </TableCell>
                      <TableCell data-testid={`img-event-${event.id}`}>
                        {event.imageUrl ? (
                          <img 
                            src={event.imageUrl} 
                            alt="Event" 
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        ) : (
                          <span className="text-gray-400 text-sm">Không có hình</span>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-add-event">
          <DialogHeader>
            <DialogTitle data-testid="text-modal-title">
              {editingEvent ? "Chỉnh sửa sự kiện khác" : "Thêm sự kiện khác"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="shortName" className="block text-sm font-medium text-gray-700 mb-2">
                  Tên sự kiện (ngắn gọn) *
                </Label>
                <Input
                  id="shortName"
                  {...form.register("shortName")}
                  placeholder="Nhập tên sự kiện ngắn gọn"
                  className="focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                  data-testid="input-short-name"
                />
                {form.formState.errors.shortName && (
                  <p className="text-red-600 text-sm mt-1">
                    {form.formState.errors.shortName.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                  Nội dung chi tiết *
                </Label>
                <Textarea
                  id="content"
                  {...form.register("content")}
                  rows={4}
                  placeholder="Nhập nội dung chi tiết về sự kiện"
                  className="focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                  data-testid="input-content"
                />
                {form.formState.errors.content && (
                  <p className="text-red-600 text-sm mt-1">
                    {form.formState.errors.content.message}
                  </p>
                )}
              </div>

              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  Hình ảnh (tùy chọn)
                </Label>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif"
                      onChange={handleFileChange}
                      className="focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                      data-testid="input-image"
                    />
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Upload className="w-4 h-4" />
                      <span>JPG, PNG, GIF (tối đa 10MB)</span>
                    </div>
                  </div>
                  
                  {previewUrl && (
                    <div className="relative">
                      <img 
                        src={previewUrl} 
                        alt="Preview" 
                        className="w-32 h-32 object-cover rounded-lg border"
                      />
                      {selectedFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={removeFile}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 h-6 w-6"
                          data-testid="button-remove-image"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
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
                disabled={isMutating}
                data-testid="button-submit"
              >
                {isMutating ? "Đang xử lý..." : (editingEvent ? "Cập nhật" : "Thêm sự kiện")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}