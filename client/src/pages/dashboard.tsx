import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { CalendarDays, LogOut, Clock } from "lucide-react";
import Sidebar from "@/components/layout/sidebar";
import StaffManagement from "@/components/staff/staff-management";
import DepartmentManagement from "@/components/departments/department-management";
import EventManagement from "@/components/events/event-management";
import RoomManagement from "@/components/rooms/room-management";
import WorkSchedule from "@/components/schedule/work-schedule";
import MeetingSchedule from "@/components/meetings/meeting-schedule";
import UserManagement from "@/components/users/user-management";
import PermissionManagement from "@/components/permissions/permission-management";
import GroupPermissionsManagement from "@/components/permissions/group-permissions-management";
import HolidayManagement from "@/components/holidays/holiday-management";
import SystemConfig from "@/pages/system-config";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

type Section = 
  | "dashboard"
  | "staff-management"
  | "department-management"
  | "event-management"
  | "room-management"
  | "work-schedule"
  | "meeting-schedule"
  | "other-events"
  | "user-management"
  | "permissions"
  | "group-permissions"
  | "holiday-management"
  | "system-config";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      toast({
        title: "Đăng xuất thành công",
        description: "Hẹn gặp lại bạn!",
      });
      window.location.href = "/";
    },
    onError: (error) => {
      toast({
        title: "Lỗi đăng xuất",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const openPublicDisplay = () => {
    window.open("/display", "_blank");
  };

  const renderContent = () => {
    switch (activeSection) {
      case "staff-management":
        return <StaffManagement />;
      case "department-management":
        return <DepartmentManagement />;
      case "event-management":
        return <EventManagement />;
      case "room-management":
        return <RoomManagement />;
      case "work-schedule":
        return <WorkSchedule />;
      case "meeting-schedule":
        return <MeetingSchedule />;
      case "user-management":
        return <UserManagement />;
      case "permissions":
        return <PermissionManagement />;
      case "group-permissions":
        return <GroupPermissionsManagement />;
      case "holiday-management":
        return <HolidayManagement />;
      case "system-config":
        return <SystemConfig />;
      default:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900" data-testid="text-dashboard-title">
                Dashboard
              </h2>
              <div className="text-sm text-bidv-gray flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                <span id="current-time" data-testid="text-current-time">
                  {currentTime.toLocaleString('vi-VN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200" data-testid="card-total-staff">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tổng cán bộ</p>
                    <p className="text-3xl font-bold text-gray-900" data-testid="text-staff-count">0</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <i className="fas fa-users text-bidv-blue text-xl"></i>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200" data-testid="card-today-schedules">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Lịch hôm nay</p>
                    <p className="text-3xl font-bold text-gray-900" data-testid="text-schedule-count">0</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <i className="fas fa-calendar-check text-green-600 text-xl"></i>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200" data-testid="card-meeting-rooms">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Phòng họp</p>
                    <p className="text-3xl font-bold text-gray-900" data-testid="text-room-count">0</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <i className="fas fa-door-open text-purple-600 text-xl"></i>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200" data-testid="card-monthly-events">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Sự kiện tháng</p>
                    <p className="text-3xl font-bold text-gray-900" data-testid="text-event-count">0</p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <i className="fas fa-star text-orange-600 text-xl"></i>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Thao tác nhanh</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => setActiveSection("work-schedule")}
                  className="bg-bidv-teal hover:bg-opacity-90 text-white p-4 h-auto flex flex-col items-center"
                  data-testid="button-work-schedule"
                >
                  <CalendarDays className="w-6 h-6 mb-2" />
                  <span>Quản lý lịch công tác</span>
                </Button>
                
                <Button
                  onClick={() => setActiveSection("meeting-schedule")}
                  className="bg-bidv-blue hover:bg-opacity-90 text-white p-4 h-auto flex flex-col items-center"
                  data-testid="button-meeting-schedule"
                >
                  <i className="fas fa-calendar-plus text-xl mb-2"></i>
                  <span>Lịch phòng họp</span>
                </Button>
                
                <Button
                  onClick={openPublicDisplay}
                  className="bg-orange-500 hover:bg-orange-600 text-white p-4 h-auto flex flex-col items-center"
                  data-testid="button-public-display"
                >
                  <i className="fas fa-tv text-xl mb-2"></i>
                  <span>Màn hình công cộng</span>
                </Button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-bidv-teal rounded-lg flex items-center justify-center">
              <CalendarDays className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900" data-testid="text-system-title">
                Hệ thống Quản lý Lịch Công tác
              </h1>
              <p className="text-sm text-bidv-gray" data-testid="text-organization-name">
                BIDV Chi nhánh Sở giao dịch 1
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900" data-testid="text-user-name">
                {(user as any)?.firstName && (user as any)?.lastName 
                  ? `${(user as any).firstName} ${(user as any).lastName}`
                  : (user as any)?.email || "Người dùng"}
              </p>
              <p className="text-xs text-bidv-gray" data-testid="text-user-role">
                Quản trị viên hệ thống
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="hover:bg-gray-100"
              data-testid="button-logout"
            >
              <LogOut className="text-bidv-gray" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <Sidebar activeSection={activeSection} onSectionChange={(section: string) => setActiveSection(section as Section)} />

        {/* Main Content */}
        <main className="flex-1 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
