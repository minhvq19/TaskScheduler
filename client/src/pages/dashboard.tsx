import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Users, Building2, TrendingUp, Clock, MapPin } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { vi } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

interface DashboardStats {
  totalStaff: number;
  totalDepartments: number;
  thisWeekSchedules: number;
  thisMonthSchedules: number;
  scheduleByCategoryData: { name: string; value: number; color: string }[];
  scheduleByWeekData: { week: string; schedules: number }[];
  departmentStaffData: { department: string; staff: number }[];
  upcomingSchedules: {
    id: string;
    staffName: string;
    workType: string;
    startDateTime: string;
    endDateTime: string;
  }[];
}

const COLORS = {
  "Làm việc tại CN": "#4a90a4",
  "Nghỉ phép": "#f59e0b", 
  "Trực lãnh đạo": "#ef4444",
  "Đi công tác trong nước": "#10b981",
  "Đi công tác nước ngoài": "#8b5cf6",
  "Khác": "#6b7280"
};

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải dữ liệu thống kê...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Không thể tải dữ liệu thống kê</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="dashboard">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Analytics</h1>
        <p className="text-gray-600">Thống kê và báo cáo tổng quan hệ thống quản lý lịch công tác</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card data-testid="card-total-staff">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng số nhân viên</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStaff}</div>
            <p className="text-xs text-gray-600">Nhân viên đang hoạt động</p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-departments">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Số phòng ban</CardTitle>
            <Building2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDepartments}</div>
            <p className="text-xs text-gray-600">Phòng ban và đơn vị</p>
          </CardContent>
        </Card>

        <Card data-testid="card-week-schedules">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lịch tuần này</CardTitle>
            <CalendarDays className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisWeekSchedules}</div>
            <p className="text-xs text-gray-600">Lịch công tác trong tuần</p>
          </CardContent>
        </Card>

        <Card data-testid="card-month-schedules">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lịch tháng này</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisMonthSchedules}</div>
            <p className="text-xs text-gray-600">Tổng lịch trong tháng</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Schedule by Category Pie Chart */}
        <Card data-testid="chart-schedule-category">
          <CardHeader>
            <CardTitle>Phân bổ theo loại công việc</CardTitle>
            <CardDescription>Thống kê lịch công tác theo từng loại</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.scheduleByCategoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.scheduleByCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department Staff Bar Chart */}
        <Card data-testid="chart-department-staff">
          <CardHeader>
            <CardTitle>Nhân viên theo phòng ban</CardTitle>
            <CardDescription>Phân bổ nhân viên trong các phòng ban</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.departmentStaffData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="department" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="staff" fill="#4a90a4" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Trends */}
      <Card data-testid="chart-schedule-trends">
        <CardHeader>
          <CardTitle>Xu hướng lịch công tác theo tuần</CardTitle>
          <CardDescription>Thống kê số lượng lịch trong 8 tuần gần đây</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.scheduleByWeekData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="schedules" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Upcoming Schedules */}
      <Card data-testid="upcoming-schedules">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Lịch công tác sắp tới
          </CardTitle>
          <CardDescription>10 lịch công tác gần nhất trong 7 ngày tới</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.upcomingSchedules.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Không có lịch công tác nào trong 7 ngày tới</p>
          ) : (
            <div className="space-y-3">
              {stats.upcomingSchedules.map((schedule) => (
                <div key={schedule.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[schedule.workType as keyof typeof COLORS] || '#6b7280' }}
                      ></div>
                    </div>
                    <div>
                      <p className="font-medium">{schedule.staffName}</p>
                      <p className="text-sm text-gray-600">{schedule.workType}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {format(new Date(schedule.startDateTime), "dd/MM", { locale: vi })} - 
                      {format(new Date(schedule.endDateTime), "dd/MM", { locale: vi })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(schedule.startDateTime), "HH:mm", { locale: vi })} - 
                      {format(new Date(schedule.endDateTime), "HH:mm", { locale: vi })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}