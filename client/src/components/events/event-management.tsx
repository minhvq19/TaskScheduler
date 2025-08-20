import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Plus, Edit, Trash2, Calendar, Upload, X, Search } from "lucide-react";
import { format, isAfter, isBefore } from "date-fns";
import { vi } from "date-fns/locale";
import { insertOtherEventSchema, type OtherEvent } from "@shared/schema";
import { z } from "zod";

// Schema form với xác thực đầy đủ
const formSchema = insertOtherEventSchema.extend({
  startDateTime: z.string().min(1, "Thời gian bắt đầu là bắt buộc"),
  endDateTime: z.string().min(1, "Thời gian kết thúc là bắt buộc"),
  shortName: z.string().min(1, "Tên sự kiện là bắt buộc").max(100, "Tên sự kiện không được vượt quá 100 ký tự"),
  content: z.string().min(1, "Nội dung chi tiết là bắt buộc"),
  imageUrl: z.string().optional(),
}).omit({ imageUrl: true });

type FormData = z.infer<typeof formSchema>;

// Hàm hỗ trợ phân tích datetime để kiểm tra trạng thái
const parseLocalDateTime = (dateTime: string | Date): Date => {
  if (dateTime instanceof Date) {
    return dateTime;
  }
  
  // Để kiểm tra trạng thái, chúng ta cần đối tượng Date thực tế
  const dateTimeString = dateTime.toString();
  const cleanString = dateTimeString.replace('T', ' ').replace('Z', '').split('.')[0];
  const localDate = new Date(cleanString);
  return localDate;
};

export default function EventManagement() {
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<OtherEvent | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("createdAt-desc");
  const { toast } = useToast();
  const { canEdit } = usePermissions();
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
      
      // Append multiple images
      selectedFiles.forEach((file, index) => {
        formData.append("images", file);
      });

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
      
      // Include existing images that haven't been removed
      formData.append("imageUrls", JSON.stringify(existingImages));
      
      // Keep first existing image as imageUrl for backward compatibility
      if (existingImages.length > 0) {
        formData.append("imageUrl", existingImages[0]);
      }
      
      // Append new images
      selectedFiles.forEach((file, index) => {
        formData.append("images", file);
      });

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
    setSelectedFiles([]);
    setPreviewUrls([]);
    
    // Thiết lập ảnh hiện có từ cả mảng imageUrls và imageUrl đơn lẻ để tương thích ngược
    const images = event.imageUrls && event.imageUrls.length > 0 
      ? event.imageUrls.filter(Boolean) 
      : event.imageUrl ? [event.imageUrl] : [];
    setExistingImages(images);
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
    setSelectedFiles([]);
    setPreviewUrls([]);
    setExistingImages([]);
    form.reset();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Kiểm tra nếu thêm các file này sẽ vượt quá giới hạn
    const totalImages = existingImages.length + selectedFiles.length + files.length;
    if (totalImages > 4) {
      toast({
        title: "Lỗi",
        description: `Chỉ được phép tối đa 4 ảnh. Hiện tại có ${existingImages.length + selectedFiles.length} ảnh, bạn chỉ có thể thêm ${4 - existingImages.length - selectedFiles.length} ảnh nữa.`,
        variant: "destructive",
      });
      return;
    }

    const validFiles: File[] = [];
    const newPreviewUrls: string[] = [];
    
    for (const file of files) {
      // Xác thực loại file
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Lỗi",
          description: `File ${file.name}: Chỉ chấp nhận file ảnh định dạng: JPG, JPEG, PNG, GIF`,
          variant: "destructive",
        });
        continue;
      }

      // Xác thực kích thước file (10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        toast({
          title: "Lỗi",
          description: `File ${file.name}: Kích thước file không được vượt quá 10MB`,
          variant: "destructive",
        });
        continue;
      }

      validFiles.push(file);
      
      // Tạo URL xem trước
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviewUrls.push(e.target?.result as string);
        if (newPreviewUrls.length === validFiles.length) {
          setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
        }
      };
      reader.readAsDataURL(file);
    }
    
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeNewFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
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

  const getEventStatus = (startTime: string | Date, endTime: string | Date) => {
    const now = new Date();
    const start = parseLocalDateTime(startTime);
    const end = parseLocalDateTime(endTime);

    if (isAfter(now, start) && isBefore(now, end)) {
      return { label: "Đang diễn ra", className: "bg-green-100 text-green-800" };
    } else if (isBefore(now, start)) {
      return { label: "Sắp diễn ra", className: "bg-yellow-100 text-yellow-800" };
    } else {
      return { label: "Đã kết thúc", className: "bg-gray-100 text-gray-800" };
    }
  };

  // Lọc và sắp xếp sự kiện dựa trên tiêu chí tìm kiếm và sắp xếp
  const filteredAndSortedEvents = events
    .filter((event) => {
      const matchesSearch = event.shortName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.content.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "startTime-asc":
          return new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime();
        case "startTime-desc":
          return new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime();
        case "endTime-asc":
          return new Date(a.endDateTime).getTime() - new Date(b.endDateTime).getTime();
        case "endTime-desc":
          return new Date(b.endDateTime).getTime() - new Date(a.endDateTime).getTime();
        case "createdAt-asc":
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case "createdAt-desc":
        default:
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
    });

  const isMutating = createEventMutation.isPending || updateEventMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900" data-testid="text-page-title">
          Quản trị sự kiện khác
        </h2>
        {canEdit("otherEvents") && (
          <Button
            onClick={() => setShowModal(true)}
            className="bg-bidv-teal hover:bg-bidv-teal/90 text-white"
            data-testid="button-add-event"
          >
            <Plus className="w-4 h-4 mr-2" />
            Thêm sự kiện khác
          </Button>
        )}
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
                  placeholder="Tìm theo tên sự kiện, nội dung..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sắp xếp theo
              </label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger data-testid="select-sort">
                  <SelectValue placeholder="Chọn cách sắp xếp" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="startTime-asc">Thời gian bắt đầu mới nhất</SelectItem>
                  <SelectItem value="startTime-desc">Thời gian bắt đầu muộn nhất</SelectItem>
                  <SelectItem value="endTime-asc">Thời gian kết thúc mới nhất</SelectItem>
                  <SelectItem value="endTime-desc">Thời gian kết thúc muộn nhất</SelectItem>
                  <SelectItem value="createdAt-desc">Thời gian nhập sự kiện muộn nhất (mặc định)</SelectItem>
                  <SelectItem value="createdAt-asc">Thời gian nhập sự kiện mới nhất</SelectItem>
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

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách sự kiện khác ({filteredAndSortedEvents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8" data-testid="loading-events">
              Đang tải dữ liệu...
            </div>
          ) : filteredAndSortedEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500" data-testid="no-events">
              Không tìm thấy sự kiện nào
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
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedEvents.map((event) => {
                    const status = getEventStatus(event.startDateTime, event.endDateTime);
                    
                    return (
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
                        {(() => {
                          // Get all images - prioritize imageUrls array, fallback to single imageUrl
                          const images = event.imageUrls && event.imageUrls.length > 0 
                            ? event.imageUrls.filter(Boolean) 
                            : event.imageUrl ? [event.imageUrl] : [];
                          
                          if (images.length === 0) {
                            return <span className="text-gray-400 text-sm">Không có hình</span>;
                          }
                          
                          if (images.length === 1) {
                            return (
                              <img 
                                src={images[0].startsWith('/') ? `${window.location.origin}${images[0]}` : images[0]}
                                alt="Event" 
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                            );
                          }
                          
                          // Multiple images - show first image with count indicator
                          return (
                            <div className="relative">
                              <img 
                                src={images[0].startsWith('/') ? `${window.location.origin}${images[0]}` : images[0]}
                                alt="Event" 
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                              <div className="absolute -top-1 -right-1 bg-bidv-teal text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                {images.length}
                              </div>
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell data-testid={`status-event-${event.id}`}>
                        <Badge className={status.className}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          {canEdit("otherEvents") ? (
                            <>
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
                            </>
                          ) : (
                            <span className="text-sm text-gray-500">Chỉ xem</span>
                          )}
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
                  Hình ảnh (tùy chọn, tối đa 4 ảnh)
                </Label>
                <div className="space-y-4">
                  {(existingImages.length + selectedFiles.length) < 4 && (
                    <div className="flex items-center gap-4">
                      <Input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/gif"
                        onChange={handleFileChange}
                        multiple
                        className="focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                        data-testid="input-image"
                      />
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Upload className="w-4 h-4" />
                        <span>JPG, PNG, GIF (tối đa 10MB, còn lại {4 - existingImages.length - selectedFiles.length})</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Existing images */}
                  {existingImages.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Ảnh hiện có:</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {existingImages.map((imageUrl, index) => (
                          <div key={index} className="relative">
                            <img 
                              src={imageUrl.startsWith('/') ? `${window.location.origin}${imageUrl}` : imageUrl} 
                              alt={`Existing ${index + 1}`} 
                              className="w-24 h-24 object-cover rounded-lg border"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeExistingImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 h-5 w-5"
                              data-testid={`button-remove-existing-${index}`}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* New images preview */}
                  {previewUrls.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Ảnh mới sẽ thêm:</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {previewUrls.map((url, index) => (
                          <div key={index} className="relative">
                            <img 
                              src={url} 
                              alt={`Preview ${index + 1}`} 
                              className="w-24 h-24 object-cover rounded-lg border"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeNewFile(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 h-5 w-5"
                              data-testid={`button-remove-new-${index}`}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
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