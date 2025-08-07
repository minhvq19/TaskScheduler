import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, ChevronLeft, ChevronRight, Edit, Trash2 } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, startOfDay, getDay } from "date-fns";
import { vi } from "date-fns/locale";
import AddScheduleModal from "./add-schedule-modal";
import type { WorkSchedule, Staff, Department } from "@shared/schema";
import { useSystemColors } from "@/hooks/useSystemColors";

export default function WorkSchedule() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | null>(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getWorkScheduleColor } = useSystemColors();

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 }); // Sunday
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Fetch work schedules for current week
  const { data: schedules = [], isLoading: isLoadingSchedules } = useQuery<WorkSchedule[]>({
    queryKey: ["/api/work-schedules", weekStart.toISOString(), weekEnd.toISOString(), selectedStaff || "all", "v2"],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
      });
      if (selectedStaff && selectedStaff !== 'all') {
        params.append('staffId', selectedStaff);
      }
      
      const response = await fetch(`/api/work-schedules?${params}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch schedules: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Loaded schedules with fixed filtering:', data);
      return data;
    },
  });

  // Fetch staff (filter for Ban Giám đốc)
  const { data: allStaff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  // Fetch departments to find Ban Giám đốc
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const boardDept = departments.find(d => d.name.toLowerCase().includes("ban giám đốc"));
  const boardStaff = allStaff.filter(s => s.departmentId === boardDept?.id).sort((a, b) => 
    (a.displayOrder || 0) - (b.displayOrder || 0)
  );

  console.log('Current schedules state:', schedules, 'Loading:', isLoadingSchedules);
  console.log('Week range:', weekStart.toISOString(), 'to', weekEnd.toISOString());
  console.log('Board department:', boardDept);
  console.log('Board staff:', boardStaff);
  
  // Check if we have the schedule for PGĐ Lê Văn Đức specifically
  const ducSchedules = schedules.filter(s => s.staffId === "2e18ec7c-9735-4a76-941d-e945a3e75921");
  console.log('PGĐ Lê Văn Đức schedules:', ducSchedules);
  
  // Also check all schedules with "Nghỉ phép"
  const vacationSchedules = schedules.filter(s => s.workType === "Nghỉ phép");
  console.log('All vacation schedules:', vacationSchedules);

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/work-schedules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-schedules"] });
      toast({
        title: "Thành công",
        description: "Đã xóa lịch công tác thành công.",
      });
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa lịch công tác.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (schedule: WorkSchedule) => {
    setEditingSchedule(schedule);
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa lịch công tác này?")) {
      deleteScheduleMutation.mutate(id);
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingSchedule(null);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
  };

  const getScheduleStyle = (workType: string) => {
    const bgColor = getWorkScheduleColor(workType);
    const isTransparent = workType === "Làm việc tại CN";
    
    return {
      backgroundColor: isTransparent ? "transparent" : bgColor,
      color: isTransparent ? "#374151" : "white", // text-gray-700 or white
      border: isTransparent ? "1px solid #d1d5db" : "none" // gray-300 border for transparent
    };
  };

  const isWeekend = (date: Date) => {
    const day = getDay(date); // 0 = Sunday, 6 = Saturday
    return day === 0 || day === 6; // Sunday or Saturday
  };

  const getSchedulesForStaffAndDay = (staffId: string, day: Date) => {
    return schedules.filter(schedule => {
      const startDate = new Date(schedule.startDateTime);
      const endDate = new Date(schedule.endDateTime);
      const checkDay = new Date(day);
      
      // Check if the day falls within the schedule range (inclusive)
      return schedule.staffId === staffId && 
             checkDay >= startOfDay(startDate) && 
             checkDay <= startOfDay(endDate);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900" data-testid="text-page-title">
          Quản trị lịch công tác
        </h2>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-bidv-teal hover:bg-bidv-teal/90 text-white"
          data-testid="button-add-schedule"
        >
          <Plus className="w-4 h-4 mr-2" />
          Thêm lịch công tác
        </Button>
      </div>

      {/* Calendar Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-gray-900" data-testid="text-week-title">
                Tuần {format(weekStart, "dd/MM", { locale: vi })} - {format(weekEnd, "dd/MM/yyyy", { locale: vi })}
              </h3>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateWeek('prev')}
                  data-testid="button-prev-week"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateWeek('next')}
                  data-testid="button-next-week"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger className="w-64" data-testid="select-staff-filter">
                  <SelectValue placeholder="Tất cả cán bộ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả cán bộ</SelectItem>
                  {boardStaff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.positionShort} {staff.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Weekly Calendar Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-8 gap-1 mb-2">
                {/* Header */}
                <div className="p-3 text-center font-medium text-gray-500 text-sm"></div>
                {weekDays.map((day) => (
                  <div key={day.toISOString()} className="p-3 text-center font-medium text-gray-500 text-sm">
                    {format(day, "EEE dd/MM", { locale: vi })}
                  </div>
                ))}
              </div>

              {/* Staff rows */}
              {isLoadingSchedules ? (
                <div className="text-center py-8" data-testid="loading-schedules">
                  Đang tải lịch công tác...
                </div>
              ) : boardStaff.length === 0 ? (
                <div className="text-center py-8 text-gray-500" data-testid="no-board-staff">
                  Chưa có cán bộ Ban Giám đốc nào
                </div>
              ) : (
                boardStaff.map((staff) => (
                  <div key={staff.id} className="grid grid-cols-8 gap-1 mb-1" data-testid={`staff-row-${staff.id}`}>
                    <div className="p-3 bg-gray-50 text-sm font-medium flex items-center">
                      <div className="truncate">
                        {staff.positionShort} {staff.fullName}
                      </div>
                    </div>
                    {weekDays.map((day) => {
                      const daySchedules = getSchedulesForStaffAndDay(staff.id, day);
                      const isWeekendDay = isWeekend(day);
                      
                      return (
                        <div 
                          key={day.toISOString()} 
                          className={`p-2 border border-gray-200 min-h-20 ${isWeekendDay ? 'bg-gray-200' : 'bg-white'}`}
                        >
                          {!isWeekendDay && daySchedules.map((schedule) => (
                            <div
                              key={schedule.id}
                              className="p-1 rounded text-xs mb-1 relative group cursor-pointer"
                              style={getScheduleStyle(schedule.workType)}
                              data-testid={`schedule-${schedule.id}`}
                            >
                              <div className="font-medium">
                                {format(new Date(schedule.startDateTime), "HH:mm", { locale: vi })}-
                                {format(new Date(schedule.endDateTime), "HH:mm", { locale: vi })}
                              </div>
                              <div className="truncate">
                                {schedule.workType === "Khác" && schedule.customContent 
                                  ? schedule.customContent 
                                  : schedule.workType}
                              </div>
                              
                              {/* Action buttons */}
                              <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex">
                                <button
                                  onClick={() => handleEdit(schedule)}
                                  className="text-blue-600 hover:text-blue-800 p-1"
                                  data-testid={`button-edit-schedule-${schedule.id}`}
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDelete(schedule.id)}
                                  className="text-red-600 hover:text-red-800 p-1"
                                  data-testid={`button-delete-schedule-${schedule.id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border border-gray-300 rounded"></div>
              <span className="text-sm">Làm việc tại CN</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: getWorkScheduleColor("Nghỉ phép") }}></div>
              <span className="text-sm">Nghỉ phép</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: getWorkScheduleColor("Trực lãnh đạo") }}></div>
              <span className="text-sm">Trực lãnh đạo</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: getWorkScheduleColor("Đi công tác trong nước") }}></div>
              <span className="text-sm">Đi công tác trong nước</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: getWorkScheduleColor("Đi công tác nước ngoài") }}></div>
              <span className="text-sm">Đi công tác nước ngoài</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: getWorkScheduleColor("Khác") }}></div>
              <span className="text-sm">Khác</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Schedule List */}
      <Card>
        <CardHeader>
          <CardTitle>Lịch công tác hôm nay</CardTitle>
        </CardHeader>
        <CardContent>
          {schedules.filter(s => isSameDay(new Date(s.startDateTime), new Date())).length === 0 ? (
            <div className="text-center py-8 text-gray-500" data-testid="no-today-schedules">
              Không có lịch công tác nào hôm nay
            </div>
          ) : (
            <div className="space-y-4">
              {schedules
                .filter(s => isSameDay(new Date(s.startDateTime), new Date()))
                .map((schedule) => {
                  const staff = boardStaff.find(s => s.id === schedule.staffId);
                  const now = new Date();
                  const start = new Date(schedule.startDateTime);
                  const end = new Date(schedule.endDateTime);
                  
                  let status = "Sắp diễn ra";
                  let statusColor = "bg-yellow-100 text-yellow-800";
                  
                  if (now >= start && now <= end) {
                    status = "Đang diễn ra";
                    statusColor = "bg-green-100 text-green-800";
                  } else if (now > end) {
                    status = "Đã kết thúc";
                    statusColor = "bg-gray-100 text-gray-800";
                  }

                  return (
                    <div
                      key={schedule.id}
                      className="p-6 hover:bg-gray-50 border rounded-lg"
                      data-testid={`today-schedule-${schedule.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="bg-bidv-teal text-white w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium">
                            {staff?.fullName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {staff?.positionShort} {staff?.fullName}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {format(start, "HH:mm", { locale: vi })} - {format(end, "HH:mm", { locale: vi })}
                            </p>
                            <p className="text-sm text-bidv-teal">
                              {schedule.workType === "Khác" && schedule.customContent
                                ? schedule.customContent
                                : schedule.workType}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 text-sm rounded-full ${statusColor}`}>
                            {status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Schedule Modal */}
      <AddScheduleModal
        isOpen={showAddModal}
        onClose={handleCloseModal}
        schedule={editingSchedule}
      />
    </div>
  );
}
