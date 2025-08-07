import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, startOfDay, eachDayOfInterval, getDay } from "date-fns";
import { vi } from "date-fns/locale";
import { useSystemColors } from "@/hooks/useSystemColors";

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

const SCREEN_DURATION = 15000; // 15 seconds
const SCREENS = [
  { id: 'work-schedule', name: 'Kế hoạch công tác' },
  { id: 'meeting-schedule', name: 'Lịch họp' },
  { id: 'other-events', name: 'Sự kiện khác' }
];

export default function PublicDisplay() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentScreenIndex, setCurrentScreenIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(SCREEN_DURATION / 1000);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Screen rotation and countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Switch to next screen and reset countdown
          setCurrentScreenIndex(prev => (prev + 1) % SCREENS.length);
          return SCREEN_DURATION / 1000;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Get 7 days starting from today
  const today = new Date();
  const days = eachDayOfInterval({
    start: today,
    end: addDays(today, 6)
  });

  // Fetch display data when screen changes (every 15 seconds)
  const { data: displayData, isLoading, refetch: refetchDisplayData } = useQuery<DisplayData>({
    queryKey: ["/api/public/display-data"],
    refetchInterval: SCREEN_DURATION,
    refetchIntervalInBackground: true,
  });

  // Refetch data when screen changes
  useEffect(() => {
    refetchDisplayData();
  }, [currentScreenIndex, refetchDisplayData]);

  // Fetch staff data
  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/public/staff"],
    refetchInterval: 60000,
  });

  const { getWorkScheduleColor } = useSystemColors();

  // Function to check if date is weekend
  const isWeekend = (date: Date) => {
    const day = getDay(date); // 0 = Sunday, 6 = Saturday
    return day === 0 || day === 6; // Sunday or Saturday
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

  const renderScheduleContent = () => {
    const currentScreen = SCREENS[currentScreenIndex];
    
    switch (currentScreen.id) {
      case 'work-schedule':
        return renderWorkScheduleTable();
      case 'meeting-schedule':
        return renderMeetingScheduleTable();
      case 'other-events':
        return renderOtherEventsTable();
      default:
        return renderWorkScheduleTable();
    }
  };

  const renderWorkScheduleTable = () => (
    <div className="bg-white rounded-lg overflow-hidden shadow-lg">
      {/* Table Header */}
      <div className="grid grid-cols-8 bg-orange-500">
        <div className="p-2 text-white font-bold text-center border-r border-orange-600">
          <div className="text-sm">Lãnh đạo/ Ngày</div>
        </div>
        {days.map((day, index) => {
          const dayOfWeek = day.getDay();
          const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
          
          return (
            <div key={index} className="p-2 text-white font-bold text-center border-r border-orange-600">
              <div className="text-sm">{dayNames[dayOfWeek]}</div>
              <div className="text-xs">{format(day, "dd/MM", { locale: vi })}</div>
            </div>
          );
        })}
      </div>

      {/* Table Body */}
      {staff
        .filter(s => s.department && s.department.name.toLowerCase().includes("giám đốc"))
        .map((staffMember, rowIndex) => (
        <div key={staffMember.id} className="grid grid-cols-8 border-b border-gray-200">
          {/* Staff Name Column */}
          <div className="p-2 bg-teal-700 text-white font-bold border-r border-gray-300 flex items-center">
            <div>
              <div className="text-xs">{(staffMember as any).positionShort}. {staffMember.fullName}</div>
            </div>
          </div>
          
          {/* Schedule Columns for each day */}
          {days.map((day, dayIndex) => {
            const schedules = getSchedulesForStaffAndDay(staffMember.id, day);
            const isWeekendDay = isWeekend(day);
            
            return (
              <div 
                key={dayIndex} 
                className={`p-0.5 border-r border-gray-300 min-h-[70px] relative ${isWeekendDay ? 'bg-gray-400' : ''}`}
              >
                {!isWeekendDay && schedules.length > 0 ? (
                  <div className="space-y-0.5">
                    {schedules.slice(0, 8).map((schedule, idx) => (
                      <div
                        key={schedule.id}
                        className="text-xs p-0.5 rounded text-white font-medium"
                        style={{
                          backgroundColor: getWorkScheduleColor(schedule.workType),
                          fontSize: "7px",
                          lineHeight: "1.0"
                        }}
                      >
                        <div className="font-bold truncate">{schedule.workType}</div>
                        {schedule.customContent && (
                          <div className="truncate opacity-90 text-[6px]">{schedule.customContent}</div>
                        )}
                        <div className="opacity-75 text-[6px]">
                          {format(new Date(schedule.startDateTime), "HH:mm", { locale: vi })}-
                          {format(new Date(schedule.endDateTime), "HH:mm", { locale: vi })}
                        </div>
                      </div>
                    ))}
                    {schedules.length > 8 && (
                      <div className="text-[6px] text-gray-500 text-center">
                        +{schedules.length - 8} more
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-400 text-xs p-0.5">
                    {/* Empty cell - no schedule or weekend */}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
      
      {/* Color Legend */}
      <div className="bg-gray-50 p-3 border-t border-gray-300">
        <div className="text-xs font-bold text-gray-700 mb-2 text-center">GHI CHÚ MÀU SẮC</div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: getWorkScheduleColor("Làm việc tại CN") }}></div>
            <span>Làm việc tại CN</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: getWorkScheduleColor("Nghỉ phép") }}></div>
            <span>Nghỉ phép</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: getWorkScheduleColor("Trực lãnh đạo") }}></div>
            <span>Trực lãnh đạo</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: getWorkScheduleColor("Đi công tác trong nước") }}></div>
            <span>Đi công tác trong nước</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: getWorkScheduleColor("Đi công tác nước ngoài") }}></div>
            <span>Đi công tác nước ngoài</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: getWorkScheduleColor("Khác") }}></div>
            <span>Khác</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMeetingScheduleTable = () => (
    <div className="bg-white rounded-lg overflow-hidden shadow-lg">
      <div className="p-4 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Lịch họp trong tuần</h2>
        {displayData?.meetingSchedules && displayData.meetingSchedules.length > 0 ? (
          <div className="space-y-2">
            {displayData.meetingSchedules.map((meeting: any, index: number) => (
              <div key={index} className="bg-blue-100 p-4 rounded-lg">
                <div className="font-bold text-lg">{meeting.title}</div>
                <div className="text-sm text-gray-600">
                  {format(new Date(meeting.startDateTime), "dd/MM/yyyy HH:mm", { locale: vi })} - 
                  {format(new Date(meeting.endDateTime), "HH:mm", { locale: vi })}
                </div>
                <div className="text-sm">{meeting.location}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 text-xl">Không có lịch họp nào trong tuần này</div>
        )}
      </div>
    </div>
  );

  const renderOtherEventsTable = () => (
    <div className="bg-white rounded-lg overflow-hidden shadow-lg">
      <div className="p-4 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Sự kiện khác</h2>
        {displayData?.otherEvents && displayData.otherEvents.length > 0 ? (
          <div className="space-y-2">
            {displayData.otherEvents.map((event: any, index: number) => (
              <div key={index} className="bg-green-100 p-4 rounded-lg">
                <div className="font-bold text-lg">{event.title}</div>
                <div className="text-sm text-gray-600">
                  {format(new Date(event.startDateTime), "dd/MM/yyyy HH:mm", { locale: vi })} - 
                  {format(new Date(event.endDateTime), "HH:mm", { locale: vi })}
                </div>
                {event.description && (
                  <div className="text-sm mt-2">{event.description}</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 text-xl">Không có sự kiện nào khác</div>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-teal-900 flex items-center justify-center">
        <div className="text-white text-2xl">Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-teal-900" data-testid="public-display">
      {/* Header with time in top right */}
      <div className="bg-teal-900 text-center py-4 relative">
        <div className="text-yellow-400 text-lg font-bold">
          BIDV 🟡 NGÂN HÀNG TMCP ĐẦU TƯ VÀ PHÁT TRIỂN VIỆT NAM
        </div>
        <div className="text-white text-base text-center font-bold">
          Chi nhánh Sở giao dịch 1
        </div>
        <div className="text-yellow-400 text-xl font-bold mt-2">
          {SCREENS[currentScreenIndex].name.toUpperCase()}
        </div>
        
        {/* Screen info and time display in top right corner */}
        <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded">
          <div className="text-base font-bold">
            {format(currentTime, "HH:mm:ss", { locale: vi })}
          </div>
          <div className="text-xs">
            {format(currentTime, "dd/MM/yyyy", { locale: vi })}
          </div>
          <div className="text-xs mt-1 text-yellow-300">
            Màn hình: {currentScreenIndex + 1}/{SCREENS.length}
          </div>
          <div className="text-xs text-yellow-300">
            Còn lại: {timeRemaining}s
          </div>
        </div>
      </div>
      {/* Dynamic Screen Content */}
      <div className="p-2">
        {renderScheduleContent()}
      </div>

    </div>
  );
}