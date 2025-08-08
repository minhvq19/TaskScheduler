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

interface MeetingRoom {
  id: string;
  name: string;
  location?: string;
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

  // Fetch meeting rooms data
  const { data: rooms = [] } = useQuery<MeetingRoom[]>({
    queryKey: ["/api/meeting-rooms"],
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
    
    const daySchedules = displayData.workSchedules.filter(schedule => {
      if (schedule.staffId !== staffId) return false;
      
      const scheduleStart = startOfDay(new Date(schedule.startDateTime));
      const scheduleEnd = startOfDay(new Date(schedule.endDateTime));
      const checkDay = startOfDay(day);
      
      // Check if the day falls within the schedule range (inclusive)
      return checkDay >= scheduleStart && checkDay <= scheduleEnd;
    });

    // For board directors, if no schedule exists for a weekday, add default "Làm việc tại CN"
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
    const staffMember = staff.find(s => s.id === staffId);
    const isBoardMember = staffMember && staffMember.department?.name.toLowerCase().includes("giám đốc");
    
    if (!isWeekend && isBoardMember && daySchedules.length === 0) {
      // Add default work schedule
      daySchedules.push({
        id: `default-${staffId}-${day.toISOString()}`,
        staffId: staffId,
        startDateTime: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 8, 0).toISOString(),
        endDateTime: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 17, 30).toISOString(),
        workType: "Làm việc tại CN",
        customContent: null,
        createdBy: "system",
        createdAt: new Date().toISOString(),
        updatedBy: null,
        updatedAt: new Date().toISOString()
      } as any);
    }

    return daySchedules;
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
    <div className="public-display-table bg-white rounded-lg overflow-hidden shadow-lg" style={{ fontFamily: 'Roboto, sans-serif' }}>
      {/* Table Header */}
      <div className="public-display-table-header bg-orange-500" style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1fr) repeat(7, 1fr)' }}>
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
      <div className="public-display-table-body">
        {staff
          .filter(s => s.department && s.department.name.toLowerCase().includes("giám đốc"))
          .map((staffMember, rowIndex) => (
          <div key={staffMember.id} className="public-display-row border-b border-gray-200" style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1fr) repeat(7, 1fr)' }}>
            {/* Staff Name Column */}
            <div className="p-2 bg-teal-700 text-white font-bold border-r border-gray-300 flex items-center" style={{ fontFamily: 'Roboto, sans-serif' }}>
              <div>
                <div className="text-sm font-medium">{(staffMember as any).positionShort}. {staffMember.fullName}</div>
              </div>
            </div>
          
          {/* Schedule Columns for each day */}
          {days.map((day, dayIndex) => {
            const schedules = getSchedulesForStaffAndDay(staffMember.id, day);
            const isWeekendDay = isWeekend(day);
            
            return (
              <div 
                key={dayIndex} 
                className="public-display-cell border-r border-gray-300 relative"
                style={{ 
                  backgroundColor: isWeekendDay ? '#9ca3af' : '#006b68',
                  fontFamily: 'Roboto, sans-serif'
                }}
              >
                {!isWeekendDay && schedules.length > 0 ? (
                  <div className="public-display-schedule-container">
                    {schedules.slice(0, 8).map((schedule, idx) => {
                      const isWorkAtBranch = schedule.workType === "Làm việc tại CN";
                      
                      return (
                        <div
                          key={schedule.id}
                          className="public-display-schedule-item text-xs p-1 rounded text-white font-medium"
                          style={{
                            backgroundColor: isWorkAtBranch ? "transparent" : getWorkScheduleColor(schedule.workType),
                            fontSize: "11px",
                            lineHeight: "1.2",
                            opacity: isWorkAtBranch ? 0 : 1,
                            fontFamily: 'Roboto, sans-serif',
                            fontWeight: '500'
                          }}
                        >
                          {!isWorkAtBranch && (
                            <>
                              {/* Line 1: [Main content] - Time */}
                              <div className="font-semibold truncate" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: '600', fontSize: '11px' }}>
                                {schedule.workType === "Khác" && schedule.customContent 
                                  ? schedule.customContent 
                                  : schedule.workType} - (
                                {format(new Date(schedule.startDateTime), "HH:mm", { locale: vi })} – 
                                {format(new Date(schedule.endDateTime), "HH:mm", { locale: vi })})
                              </div>
                              {/* Line 2: Detailed content (only for custom content when workType is not "Khác") */}
                              {schedule.workType !== "Khác" && schedule.customContent && (
                                <div className="truncate opacity-90" style={{ fontFamily: 'Roboto, sans-serif', fontSize: '10px' }}>{schedule.customContent}</div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                    {schedules.filter(s => s.workType !== "Làm việc tại CN").length > 8 && (
                      <div className="text-[9px] text-gray-300 text-center" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        +{schedules.filter(s => s.workType !== "Làm việc tại CN").length - 8} more
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="public-display-schedule-container">
                    {/* Empty cell - no schedule or weekend */}
                  </div>
                )}
              </div>
            );
          })}
          </div>
        ))}
      </div>
      
      {/* Compact Color Legend */}
      <div className="public-display-legend bg-gray-50 p-1 border-t border-gray-300" style={{ fontFamily: 'Roboto, sans-serif' }}>
        <div className="text-xs font-bold text-gray-700 mb-1 text-center" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: '700' }}>GHI CHÚ MÀU SẮC</div>
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs" style={{ fontFamily: 'Roboto, sans-serif' }}>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded mr-1" style={{ backgroundColor: getWorkScheduleColor("Làm việc tại CN") }}></div>
            <span className="text-[10px]" style={{ fontFamily: 'Roboto, sans-serif' }}>CN</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded mr-1" style={{ backgroundColor: getWorkScheduleColor("Nghỉ phép") }}></div>
            <span className="text-[10px]" style={{ fontFamily: 'Roboto, sans-serif' }}>Nghỉ phép</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded mr-1" style={{ backgroundColor: getWorkScheduleColor("Trực lãnh đạo") }}></div>
            <span className="text-[10px]" style={{ fontFamily: 'Roboto, sans-serif' }}>Trực LD</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded mr-1" style={{ backgroundColor: getWorkScheduleColor("Đi công tác trong nước") }}></div>
            <span className="text-[10px]" style={{ fontFamily: 'Roboto, sans-serif' }}>CT trong nước</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded mr-1" style={{ backgroundColor: getWorkScheduleColor("Đi công tác nước ngoài") }}></div>
            <span className="text-[10px]" style={{ fontFamily: 'Roboto, sans-serif' }}>CT nước ngoài</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded mr-1" style={{ backgroundColor: getWorkScheduleColor("Khác") }}></div>
            <span className="text-[10px]" style={{ fontFamily: 'Roboto, sans-serif' }}>Khác</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Helper function to parse datetime for status checking (same as in meeting-schedule.tsx)
  const parseLocalDateTime = (dateTime: string | Date): Date => {
    if (dateTime instanceof Date) {
      return dateTime;
    }
    
    // For status checking, we need actual Date objects
    const dateTimeString = dateTime.toString();
    const cleanString = dateTimeString.replace('T', ' ').replace('Z', '').split('.')[0];
    const localDate = new Date(cleanString);
    return localDate;
  };

  const renderMeetingScheduleTable = () => {
    // Get meeting schedules, filter out completed ones, sort by start time, limit to 20
    const now = new Date();
    const sortedMeetings = (displayData?.meetingSchedules || [])
      .filter((meeting: any) => parseLocalDateTime(meeting.endDateTime) > now) // Only show future and ongoing meetings
      .sort((a: any, b: any) => parseLocalDateTime(a.startDateTime).getTime() - parseLocalDateTime(b.startDateTime).getTime())
      .slice(0, 20);

    return (
      <div className="public-display-table bg-white rounded-lg overflow-hidden shadow-lg" style={{ fontFamily: 'Roboto, sans-serif', height: '100%' }}>
        {/* Table Header */}
        <div className="bg-orange-600" style={{ display: 'grid', gridTemplateColumns: '80px 250px 180px 1fr 200px 300px', fontFamily: 'Roboto, sans-serif' }}>
          <div className="p-3 text-white font-bold text-center border-r border-orange-700" style={{ fontSize: '16px', fontWeight: '700' }}>Thứ tự</div>
          <div className="p-3 text-white font-bold text-center border-r border-orange-700" style={{ fontSize: '16px', fontWeight: '700' }}>Thời gian</div>
          <div className="p-3 text-white font-bold text-center border-r border-orange-700" style={{ fontSize: '16px', fontWeight: '700' }}>Địa điểm</div>
          <div className="p-3 text-white font-bold text-center border-r border-orange-700" style={{ fontSize: '16px', fontWeight: '700' }}>Nội dung cuộc họp</div>
          <div className="p-3 text-white font-bold text-center border-r border-orange-700" style={{ fontSize: '16px', fontWeight: '700' }}>Trạng thái</div>
          <div className="p-3 text-white font-bold text-center" style={{ fontSize: '16px', fontWeight: '700' }}>Đầu mối</div>
        </div>

        {/* Table Body */}
        <div className="flex-1" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'hidden' }}>
          {sortedMeetings.length > 0 ? (
            <>              
              {/* Render meeting rows */}
              {sortedMeetings.map((meeting: any, index: number) => {
                // Format datetime string to show both start and end times
                const formatDateTime = (startDateTime: string, endDateTime: string): string => {
                  const formatSingleDateTime = (dateTimeString: string) => {
                    const dateTime = dateTimeString.replace('T', ' ').replace('Z', '').split('.')[0];
                    const [datePart, timePart] = dateTime.split(' ');
                    const [year, month, day] = datePart.split('-');
                    const [hour, minute] = timePart ? timePart.split(':') : ['00', '00'];
                    return { time: `${hour}:${minute}`, date: `${day}/${month}/${year}` };
                  };
                  
                  const start = formatSingleDateTime(startDateTime);
                  const end = formatSingleDateTime(endDateTime);
                  
                  return `${start.time} - ${start.date} (dự kiến kết thúc lúc ${end.time} - ${end.date})`;
                };

                // Get room name from rooms data
                const room = rooms?.find((r: any) => r.id === meeting.roomId);
                const roomName = room?.name || 'Phòng không xác định';
                
                // Determine meeting status
                const now = new Date();
                const meetingStart = parseLocalDateTime(meeting.startDateTime);
                const meetingEnd = parseLocalDateTime(meeting.endDateTime);
                
                let status = "Sắp diễn ra";
                let statusColor = "#f59e0b"; // yellow
                
                if (now >= meetingStart && now <= meetingEnd) {
                  status = "Đang sử dụng";
                  statusColor = "#32a852"; // green
                }

                return (
                  <div 
                    key={index} 
                    className="border-b border-orange-400" 
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '80px 250px 180px 1fr 200px 300px',
                      backgroundColor: '#006b68',
                      fontFamily: 'Roboto, sans-serif'
                    }}
                  >
                    <div className="p-3 text-white font-bold text-center border-r border-orange-400" style={{ fontSize: '14px', fontWeight: '600' }}>
                      {index + 1}
                    </div>
                    <div className="p-3 text-white text-center border-r border-orange-400" style={{ fontSize: '14px' }}>
                      {formatDateTime(meeting.startDateTime, meeting.endDateTime)}
                    </div>
                    <div className="p-3 text-white text-center border-r border-orange-400" style={{ fontSize: '14px' }}>
                      {roomName}
                    </div>
                    <div className="p-3 text-white border-r border-orange-400" style={{ fontSize: '14px' }}>
                      {meeting.meetingContent || 'Không có thông tin'}
                    </div>
                    <div className="p-3 text-white text-center border-r border-orange-400" style={{ fontSize: '14px' }}>
                      <div 
                        className="px-2 py-1 rounded text-white font-medium text-xs"
                        style={{ backgroundColor: statusColor, fontFamily: 'Roboto, sans-serif' }}
                      >
                        {status}
                      </div>
                    </div>
                    <div className="p-3 text-white text-center" style={{ fontSize: '14px' }}>
                      {meeting.contactPerson || 'Chưa có thông tin'}
                    </div>
                  </div>
                );
              })}
              
              {/* Fill empty rows to reach total of 20 rows */}
              {Array.from({ length: Math.max(0, 20 - sortedMeetings.length) }, (_, index) => (
                <div 
                  key={`empty-${index}`}
                  className="border-b border-orange-400" 
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '80px 250px 180px 1fr 200px 300px',
                    backgroundColor: '#006b68',
                    fontFamily: 'Roboto, sans-serif',
                    minHeight: '48px'
                  }}
                >
                  <div className="p-3 text-white font-bold text-center border-r border-orange-400" style={{ fontSize: '14px', fontWeight: '600' }}>
                    {sortedMeetings.length + index + 1}
                  </div>
                  <div className="p-3 text-white text-center border-r border-orange-400" style={{ fontSize: '14px' }}>
                    ...
                  </div>
                  <div className="p-3 text-white text-center border-r border-orange-400" style={{ fontSize: '14px' }}>
                    
                  </div>
                  <div className="p-3 text-white border-r border-orange-400" style={{ fontSize: '14px' }}>
                    
                  </div>
                  <div className="p-3 text-white text-center border-r border-orange-400" style={{ fontSize: '14px' }}>
                    
                  </div>
                  <div className="p-3 text-white text-center" style={{ fontSize: '14px' }}>
                    
                  </div>
                </div>
              ))}
            </>
          ) : (
            // Show empty table with 20 rows when no meetings
            Array.from({ length: 20 }, (_, index) => (
              <div 
                key={`empty-${index}`}
                className="border-b border-orange-400" 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '80px 250px 180px 1fr 200px 300px',
                  backgroundColor: '#006b68',
                  fontFamily: 'Roboto, sans-serif',
                  minHeight: '48px'
                }}
              >
                <div className="p-3 text-white font-bold text-center border-r border-orange-400" style={{ fontSize: '14px', fontWeight: '600' }}>
                  {index + 1}
                </div>
                <div className="p-3 text-white text-center border-r border-orange-400" style={{ fontSize: '14px' }}>
                  {index < 3 ? '...' : ''}
                </div>
                <div className="p-3 text-white text-center border-r border-orange-400" style={{ fontSize: '14px' }}>
                  
                </div>
                <div className="p-3 text-white border-r border-orange-400" style={{ fontSize: '14px' }}>
                  
                </div>
                <div className="p-3 text-white text-center border-r border-orange-400" style={{ fontSize: '14px' }}>
                  
                </div>
                <div className="p-3 text-white text-center" style={{ fontSize: '14px' }}>
                  
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderOtherEventsTable = () => {
    // Filter to show only ongoing events
    const now = new Date();
    const ongoingEvents = (displayData?.otherEvents || [])
      .filter((event: any) => {
        const start = parseLocalDateTime(event.startDateTime);
        const end = parseLocalDateTime(event.endDateTime);
        return now >= start && now <= end; // Only show events that are currently ongoing
      });

    return (
      <div className="public-display-table bg-white rounded-lg overflow-hidden shadow-lg h-full" style={{ fontFamily: 'Roboto, sans-serif' }}>
        <div className="p-6 h-full">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: '700' }}>Sự kiện khác đang diễn ra</h2>
          {ongoingEvents.length > 0 ? (
            <div className="h-full flex flex-col justify-center">
              {ongoingEvents.map((event: any, index: number) => (
                <div key={index} className="text-center mb-6" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  {/* Event name on top */}
                  <div className="mb-4">
                    <h3 className="text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: '700' }}>
                      {event.shortName}
                    </h3>
                    <div className="text-xl text-gray-700" style={{ fontFamily: 'Roboto, sans-serif' }}>
                      {format(new Date(event.startDateTime), "dd/MM/yyyy HH:mm", { locale: vi })} - 
                      {format(new Date(event.endDateTime), "HH:mm", { locale: vi })}
                    </div>
                  </div>
                  
                  {/* Large image below */}
                  {event.imageUrl && (
                    <div className="flex justify-center">
                      <img 
                        src={event.imageUrl} 
                        alt={event.shortName}
                        className="max-w-full max-h-96 object-contain rounded-lg shadow-lg"
                        style={{ maxHeight: '400px', width: 'auto' }}
                      />
                    </div>
                  )}
                  
                  {/* Event content */}
                  {event.content && (
                    <div className="mt-4 text-lg text-gray-700" style={{ fontFamily: 'Roboto, sans-serif' }}>
                      {event.content}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-gray-500 text-2xl text-center" style={{ fontFamily: 'Roboto, sans-serif' }}>
                Hiện tại không có sự kiện nào đang diễn ra
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-teal-900 flex items-center justify-center">
        <div className="text-white text-2xl" style={{ fontFamily: 'Roboto, sans-serif' }}>Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <div className="public-display-container bg-teal-900" style={{ fontFamily: 'Roboto, sans-serif' }} data-testid="public-display">
      {/* Header with time in top right */}
      <div className="public-display-header bg-teal-900 text-center py-3 relative" style={{ fontFamily: 'Roboto, sans-serif' }}>
        <div className="text-yellow-400 text-lg font-bold" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: '700' }}>NGÂN HÀNG TMCP ĐẦU TƯ VÀ PHÁT TRIỂN VIỆT NAM</div>
        <div className="text-white text-base text-center font-bold" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: '600' }}>
          Chi nhánh Sở giao dịch 1
        </div>
        <div className="text-yellow-400 text-xl font-bold mt-2" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: '700' }}>
          {SCREENS[currentScreenIndex].name.toUpperCase()}
        </div>
        
        {/* Screen info and time display in top right corner */}
        <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded" style={{ fontFamily: 'Roboto, sans-serif' }}>
          <div className="text-base font-bold" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: '600' }}>
            {format(currentTime, "HH:mm:ss", { locale: vi })}
          </div>
          <div className="text-xs" style={{ fontFamily: 'Roboto, sans-serif' }}>
            {format(currentTime, "dd/MM/yyyy", { locale: vi })}
          </div>
          <div className="text-xs mt-1 text-yellow-300" style={{ fontFamily: 'Roboto, sans-serif' }}>
            Màn hình: {currentScreenIndex + 1}/{SCREENS.length}
          </div>
          <div className="text-xs text-yellow-300" style={{ fontFamily: 'Roboto, sans-serif' }}>
            Còn lại: {timeRemaining}s
          </div>
        </div>
      </div>
      {/* Dynamic Screen Content */}
      <div className="public-display-content p-2">
        {renderScheduleContent()}
      </div>
    </div>
  );
}