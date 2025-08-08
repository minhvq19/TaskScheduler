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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, CalendarPlus, Search } from "lucide-react";
import { format, isAfter, isBefore } from "date-fns";
import { vi } from "date-fns/locale";
import { insertMeetingScheduleSchema, type MeetingSchedule, type MeetingRoom } from "@shared/schema";
import { z } from "zod";

const formSchema = insertMeetingScheduleSchema.extend({
  startDateTime: z.string(),
  endDateTime: z.string(),
});

type FormData = z.infer<typeof formSchema>;

export default function MeetingSchedule() {
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<MeetingSchedule | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      roomId: "",
      contactPerson: "",
      startDateTime: "",
      endDateTime: "",
      meetingContent: "",
    },
  });

  // Fetch meeting schedules
  const { data: schedules = [], isLoading: isLoadingSchedules } = useQuery<MeetingSchedule[]>({
    queryKey: ["/api/meeting-schedules", selectedRoom],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRoom && selectedRoom !== 'all') {
        params.append('roomId', selectedRoom);
      }
      
      const response = await fetch(`/api/meeting-schedules?${params}`);
      if (!response.ok) throw new Error('Failed to fetch meeting schedules');
      return response.json();
    },
  });

  // Fetch meeting rooms
  const { data: rooms = [] } = useQuery<MeetingRoom[]>({
    queryKey: ["/api/meeting-rooms"],
  });

  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        startDateTime: new Date(data.startDateTime),
        endDateTime: new Date(data.endDateTime),
      };
      await apiRequest("POST", "/api/meeting-schedules", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-schedules"] });
      toast({
        title: "Thành công",
        description: "Đã thêm lịch phòng họp thành công.",
      });
      handleCloseModal();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể thêm lịch phòng họp.",
        variant: "destructive",
      });
    },
  });

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        startDateTime: new Date(data.startDateTime),
        endDateTime: new Date(data.endDateTime),
      };
      await apiRequest("PUT", `/api/meeting-schedules/${editingSchedule?.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-schedules"] });
      toast({
        title: "Thành công",
        description: "Đã cập nhật lịch phòng họp thành công.",
      });
      handleCloseModal();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật lịch phòng họp.",
        variant: "destructive",
      });
    },
  });

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/meeting-schedules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-schedules"] });
      toast({
        title: "Thành công",
        description: "Đã xóa lịch phòng họp thành công.",
      });
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa lịch phòng họp.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (schedule: MeetingSchedule) => {
    setEditingSchedule(schedule);
    form.reset({
      roomId: schedule.roomId,
      contactPerson: schedule.contactPerson || "",
      startDateTime: format(new Date(schedule.startDateTime), "yyyy-MM-dd'T'HH:mm"),
      endDateTime: format(new Date(schedule.endDateTime), "yyyy-MM-dd'T'HH:mm"),
      meetingContent: schedule.meetingContent,
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa lịch phòng họp này?")) {
      deleteScheduleMutation.mutate(id);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSchedule(null);
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

    if (editingSchedule) {
      updateScheduleMutation.mutate(data);
    } else {
      createScheduleMutation.mutate(data);
    }
  };

  const getScheduleStatus = (startTime: string | Date, endTime: string | Date) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isAfter(now, start) && isBefore(now, end)) {
      return { label: "Đang sử dụng", className: "bg-red-100 text-red-800" };
    } else if (isBefore(now, start)) {
      return { label: "Sắp diễn ra", className: "bg-yellow-100 text-yellow-800" };
    } else {
      return { label: "Đã kết thúc", className: "bg-gray-100 text-gray-800" };
    }
  };

  // Filter schedules based on search and room
  const filteredSchedules = schedules.filter((schedule) => {
    const room = rooms.find(r => r.id === schedule.roomId);
    const matchesSearch = schedule.meetingContent.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (schedule.contactPerson && schedule.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (room?.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const isLoading = createScheduleMutation.isPending || updateScheduleMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900" data-testid="text-page-title">
          Quản trị lịch phòng họp
        </h2>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-bidv-teal hover:bg-bidv-teal/90 text-white"
          data-testid="button-add-meeting"
        >
          <Plus className="w-4 h-4 mr-2" />
          Thêm lịch phòng họp
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
                  placeholder="Tìm theo nội dung, người đầu mối..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phòng họp
              </label>
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger data-testid="select-room">
                  <SelectValue placeholder="Tất cả phòng họp" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả phòng họp</SelectItem>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
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

      {/* Meeting Schedules Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lịch phòng họp ({filteredSchedules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingSchedules ? (
            <div className="text-center py-8" data-testid="loading-schedules">
              Đang tải dữ liệu...
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div className="text-center py-8 text-gray-500" data-testid="no-schedules">
              Không tìm thấy lịch phòng họp nào
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phòng họp</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Nội dung cuộc họp</TableHead>
                    <TableHead>Người đầu mối</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchedules.map((schedule) => {
                    const room = rooms.find(r => r.id === schedule.roomId);
                    const status = getScheduleStatus(schedule.startDateTime, schedule.endDateTime);
                    
                    return (
                      <TableRow key={schedule.id} data-testid={`meeting-row-${schedule.id}`}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="bg-purple-500 text-white w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium">
                              <CalendarPlus className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900" data-testid={`text-room-name-${schedule.id}`}>
                                {room?.name || "Phòng không xác định"}
                              </div>
                              {room?.location && (
                                <div className="text-sm text-gray-500">{room.location}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div data-testid={`text-meeting-start-${schedule.id}`}>
                              {format(new Date(schedule.startDateTime), "dd/MM/yyyy HH:mm", { locale: vi })}
                            </div>
                            <div data-testid={`text-meeting-end-${schedule.id}`}>
                              {format(new Date(schedule.endDateTime), "dd/MM/yyyy HH:mm", { locale: vi })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-900" data-testid={`text-meeting-content-${schedule.id}`}>
                            {schedule.meetingContent}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-contact-person-${schedule.id}`}>
                          {schedule.contactPerson || (
                            <span className="text-gray-400">Chưa có thông tin</span>
                          )}
                        </TableCell>
                        <TableCell data-testid={`status-meeting-${schedule.id}`}>
                          <Badge className={status.className}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(schedule)}
                              className="text-bidv-teal hover:text-bidv-teal/80"
                              data-testid={`button-edit-${schedule.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(schedule.id)}
                              className="text-red-600 hover:text-red-700"
                              data-testid={`button-delete-${schedule.id}`}
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

      {/* Add/Edit Meeting Schedule Modal */}
      <Dialog open={showModal} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-add-meeting">
          <DialogHeader>
            <DialogTitle data-testid="text-modal-title">
              {editingSchedule ? "Chỉnh sửa lịch phòng họp" : "Thêm lịch phòng họp"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="roomId" className="block text-sm font-medium text-gray-700 mb-2">
                  Chọn phòng họp *
                </Label>
                <Select
                  value={form.watch("roomId")}
                  onValueChange={(value) => form.setValue("roomId", value)}
                >
                  <SelectTrigger data-testid="select-meeting-room">
                    <SelectValue placeholder="Chọn phòng họp" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name} {room.location && `- ${room.location}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.roomId && (
                  <p className="text-red-600 text-sm mt-1">
                    {form.formState.errors.roomId.message}
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
                <Label htmlFor="meetingContent" className="block text-sm font-medium text-gray-700 mb-2">
                  Nội dung cuộc họp *
                </Label>
                <Textarea
                  id="meetingContent"
                  {...form.register("meetingContent")}
                  rows={3}
                  placeholder="Nhập nội dung cuộc họp"
                  className="focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                  data-testid="input-meeting-content"
                />
                {form.formState.errors.meetingContent && (
                  <p className="text-red-600 text-sm mt-1">
                    {form.formState.errors.meetingContent.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700 mb-2">
                  Thông tin cá nhân/bộ phận đầu mối
                </Label>
                <Input
                  id="contactPerson"
                  {...form.register("contactPerson")}
                  placeholder="Nhập thông tin người đầu mối (tùy chọn)"
                  className="focus:ring-2 focus:ring-bidv-teal focus:border-transparent"
                  data-testid="input-contact-person"
                />
                {form.formState.errors.contactPerson && (
                  <p className="text-red-600 text-sm mt-1">
                    {form.formState.errors.contactPerson.message}
                  </p>
                )}
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
                disabled={isLoading}
                data-testid="button-submit"
              >
                {isLoading ? "Đang xử lý..." : (editingSchedule ? "Cập nhật" : "Thêm lịch phòng họp")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
