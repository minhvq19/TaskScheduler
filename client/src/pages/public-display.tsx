import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, startOfDay, eachDayOfInterval } from "date-fns";
import { vi } from "date-fns/locale";

interface DisplayData {
  workSchedules: any[];
  meetingSchedules: any[];
  otherEvents: any[];
  currentTime: string;
}

interface Staff {
  id: string;
  employeeId: string;
  fullName: string;
  position: string;
  department: {
    name: string;
  };
}

export default function PublicDisplay() {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Get 7 days starting from today
  const today = new Date();
  const days = eachDayOfInterval({
    start: today,
    end: addDays(today, 6)
  });

  // Fetch display data every 30 seconds
  const { data: displayData, isLoading } = useQuery<DisplayData>({
    queryKey: ["/api/public/display-data"],
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  });

  // Fetch staff data
  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
    refetchInterval: 60000,
  });

  const getWorkScheduleColor = (workType: string) => {
    const colors = {
      "Làm việc tại CN": "#4a90a4", // Teal blue like in image
      "Nghỉ phép": "#f59e0b", // Yellow/orange
      "Trực lãnh đạo": "#ef4444", // Red
      "Đi công tác trong nước": "#10b981", // Green
      "Đi công tác nước ngoài": "#8b5cf6", // Purple
      "Khác": "#6b7280" // Gray
    };
    return colors[workType as keyof typeof colors] || "#4a90a4";
  };

  // Function to get schedules for a specific staff and day
  const getSchedulesForStaffAndDay = (staffId: string, day: Date) => {
    if (!displayData?.workSchedules) return [];
    
    return displayData.workSchedules.filter(schedule => {
      if (schedule.staffId !== staffId) return false;
      
      const scheduleStart = startOfDay(new Date(schedule.startDateTime));
      const scheduleEnd = startOfDay(new Date(schedule.endDateTime));
      const checkDay = startOfDay(day);
      
      // Check if the day falls within the schedule range (inclusive)
      return checkDay >= scheduleStart && checkDay <= scheduleEnd;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-teal-900 flex items-center justify-center">
        <div className="text-white text-2xl">Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-teal-900" data-testid="public-display">
      {/* Header */}
      <div className="bg-teal-900 text-center py-4">
        <div className="text-yellow-400 text-lg font-bold">
          BIDV 🟡 NGÂN HÀNG TMCP ĐẦU TƯ VÀ PHÁT TRIỂN VIỆT NAM
        </div>
        <div className="text-white text-base">
          Chi nhánh Sở giao dịch 1
        </div>
        <div className="text-yellow-400 text-xl font-bold mt-2">
          KẾ HOẠCH CÔNG TÁC
        </div>
      </div>

      {/* Schedule Table */}
      <div className="p-4">
        <div className="bg-white rounded-lg overflow-hidden shadow-lg">
          {/* Table Header */}
          <div className="grid grid-cols-8 bg-orange-500">
            <div className="p-3 text-white font-bold text-center border-r border-orange-600">
              Lãnh đạo/ Ngày
            </div>
            {days.map((day, index) => (
              <div key={index} className="p-3 text-white font-bold text-center border-r border-orange-600">
                <div>T{index + 2}</div>
                <div className="text-sm">{format(day, "dd/MM", { locale: vi })}</div>
              </div>
            ))}
          </div>

          {/* Table Body */}
          {staff
            .filter(s => s.department.name === "Ban Giám đốc")
            .map((staffMember, rowIndex) => (
            <div key={staffMember.id} className="grid grid-cols-8 border-b border-gray-300">
              {/* Staff Name Column */}
              <div className="p-4 bg-teal-700 text-white font-bold border-r border-gray-300 flex items-center">
                <div>
                  <div className="text-sm">PGD. {staffMember.fullName}</div>
                </div>
              </div>
              
              {/* Schedule Columns for each day */}
              {days.map((day, dayIndex) => {
                const schedules = getSchedulesForStaffAndDay(staffMember.id, day);
                
                return (
                  <div key={dayIndex} className="p-2 border-r border-gray-300 min-h-[100px] relative">
                    {schedules.length > 0 ? (
                      schedules.map((schedule) => (
                        <div
                          key={schedule.id}
                          className="text-xs mb-1 p-2 rounded text-white font-medium"
                          style={{
                            backgroundColor: getWorkScheduleColor(schedule.workType),
                            fontSize: "10px",
                            lineHeight: "1.2"
                          }}
                        >
                          <div className="font-bold">{schedule.workType}</div>
                          {schedule.customContent && (
                            <div className="mt-1 opacity-90">{schedule.customContent}</div>
                          )}
                          <div className="mt-1 opacity-75">
                            {format(new Date(schedule.startDateTime), "HH:mm", { locale: vi })} - 
                            {format(new Date(schedule.endDateTime), "HH:mm", { locale: vi })}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-400 text-xs p-2">
                        {/* Default content for empty cells */}
                        {dayIndex === 0 && rowIndex === 0 && "Ở công ty (cả ngày)"}
                        {dayIndex > 0 && rowIndex === 4 && "Nghỉ phép"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Footer with current time */}
      <div className="fixed bottom-4 right-4 bg-black bg-opacity-50 text-white px-4 py-2 rounded">
        <div className="text-lg font-bold">
          {format(currentTime, "HH:mm:ss", { locale: vi })}
        </div>
        <div className="text-sm">
          {format(currentTime, "EEEE, dd/MM/yyyy", { locale: vi })}
        </div>
      </div>
    </div>
  );
}