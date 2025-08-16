import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, startOfDay, eachDayOfInterval, getDay } from "date-fns";
import { vi } from "date-fns/locale";
import { useSystemColors } from "@/hooks/useSystemColors";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

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

// SCREEN_DURATION sẽ được tải từ cấu hình hệ thống
const SCREENS = [
  { id: 'work-schedule', name: 'Kế hoạch công tác' },
  { id: 'meeting-schedule', name: 'Lịch họp' },
  { id: 'other-events', name: 'Sự kiện khác' }
];

export default function PublicDisplay() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentScreenIndex, setCurrentScreenIndex] = useState(0);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(15); // Sẽ được cập nhật từ cấu hình
  const [isPaused, setIsPaused] = useState(false);

  // Cập nhật thời gian mỗi giây
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Lấy cấu hình hệ thống để lấy khoảng thời gian làm mới và giờ làm việc
  const { data: systemConfig = [] } = useQuery<any[]>({
    queryKey: ["/api/system-config"],
    refetchInterval: 60000,
  });

  // Lấy giờ làm việc từ cấu hình hệ thống
  const workHours = React.useMemo(() => {
    const startConfig = systemConfig.find(config => config.key === 'work_hours.start_time');
    const endConfig = systemConfig.find(config => config.key === 'work_hours.end_time');
    return {
      start: startConfig?.value || '08:00',
      end: endConfig?.value || '17:30'
    };
  }, [systemConfig]);

  // Lấy thời gian hiển thị cho từng loại màn hình từ cấu hình
  const screenDurations = React.useMemo(() => {
    const workScheduleConfig = systemConfig.find(config => config.key === 'display.work_schedule_display_time');
    const meetingScheduleConfig = systemConfig.find(config => config.key === 'display.meeting_schedule_display_time');
    const eventsConfig = systemConfig.find(config => config.key === 'display.events_display_time');
    
    return {
      'work-schedule': workScheduleConfig ? parseInt(workScheduleConfig.value) * 1000 : 15000,
      'meeting-schedule': meetingScheduleConfig ? parseInt(meetingScheduleConfig.value) * 1000 : 15000,
      'other-events': eventsConfig ? parseInt(eventsConfig.value) * 1000 : 15000,
    };
  }, [systemConfig]);

  // Lấy thời gian hiển thị cho màn hình hiện tại
  const getCurrentScreenDuration = () => {
    const currentScreen = SCREENS[currentScreenIndex];
    return screenDurations[currentScreen.id as keyof typeof screenDurations] || 15000;
  };

  // Cập nhật timeRemaining khi cấu hình hoặc màn hình thay đổi
  useEffect(() => {
    const newDuration = getCurrentScreenDuration() / 1000;
    setTimeRemaining(newDuration);
  }, [screenDurations, currentScreenIndex]);

  // Các hàm điều hướng thủ công
  const goToPreviousScreen = () => {
    setCurrentScreenIndex(prev => (prev - 1 + SCREENS.length) % SCREENS.length);
    setCurrentEventIndex(0);
    setTimeRemaining(getCurrentScreenDuration() / 1000);
  };

  const goToNextScreen = () => {
    setCurrentScreenIndex(prev => (prev + 1) % SCREENS.length);
    setCurrentEventIndex(0);
    setTimeRemaining(getCurrentScreenDuration() / 1000);
  };

  const toggleAutoRotation = () => {
    setIsPaused(prev => !prev);
    if (!isPaused) {
      setTimeRemaining(getCurrentScreenDuration() / 1000); // Đặt lại bộ đếm thời gian khi tạm dừng
    }
  };

  // Xoay màn hình và đếm ngược
  useEffect(() => {
    if (isPaused) return; // Không xoay khi bị tạm dừng
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Chuyển sang màn hình tiếp theo và đặt lại đếm ngược
          const currentScreen = SCREENS[currentScreenIndex];
          
          if (currentScreen.id === 'other-events' && displayData && displayData.otherEvents) {
            // Đối với các sự kiện khác, xoay qua các sự kiện liên quan (đang diễn ra + sắp tới trong vòng 30 ngày)
            const now = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(now.getDate() + 30);
            
            const relevantEvents = displayData.otherEvents
              .filter((event: any) => {
                const start = new Date(event.startDateTime);
                const end = new Date(event.endDateTime);
                const isOngoing = now >= start && now <= end;
                const isUpcoming = start >= now && start <= thirtyDaysFromNow;
                return isOngoing || isUpcoming;
              })
              .sort((a: any, b: any) => {
                const startA = new Date(a.startDateTime);
                const startB = new Date(b.startDateTime);
                return startA.getTime() - startB.getTime();
              });
            
            if (relevantEvents.length > 1) {
              // Nếu có nhiều sự kiện, xoay qua chúng
              const nextEventIndex = (currentEventIndex + 1) % relevantEvents.length;
              if (nextEventIndex === 0) {
                // Hoàn thành tất cả sự kiện, chuyển sang màn hình tiếp theo
                setCurrentScreenIndex(prev => (prev + 1) % SCREENS.length);
                setCurrentEventIndex(0);
              } else {
                // Hiển thị sự kiện tiếp theo
                setCurrentEventIndex(nextEventIndex);
              }
            } else {
              // Một hoặc không có sự kiện, chuyển sang màn hình tiếp theo
              setCurrentScreenIndex(prev => (prev + 1) % SCREENS.length);
              setCurrentEventIndex(0);
            }
          } else {
            // Xoay màn hình thông thường
            setCurrentScreenIndex(prev => (prev + 1) % SCREENS.length);
            setCurrentEventIndex(0);
          }
          
          return getCurrentScreenDuration() / 1000;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentScreenIndex, currentEventIndex, isPaused, screenDurations]);

  // Lấy 7 ngày bắt đầu từ hôm nay
  const today = new Date();
  const days = eachDayOfInterval({
    start: today,
    end: addDays(today, 6)
  });

  // Lấy dữ liệu hiển thị khi màn hình thay đổi (mỗi 15 giây)
  const { data: displayData, isLoading, refetch: refetchDisplayData } = useQuery<DisplayData>({
    queryKey: ["/api/public/display-data"], // Sử dụng key ổn định nhưng buộc làm mới
    refetchInterval: 3000, // Làm mới mỗi 3 giây để cập nhật ngay lập tức
    refetchIntervalInBackground: true,
    staleTime: 0, // Luôn coi dữ liệu là cũ
    gcTime: 0, // Không cache dữ liệu để đảm bảo URL ảnh mới
  });

  // Lấy lại dữ liệu khi màn hình thay đổi
  useEffect(() => {
    refetchDisplayData();
  }, [currentScreenIndex, refetchDisplayData]);

  // Lấy dữ liệu nhân viên
  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/public/staff"],
    refetchInterval: 60000,
  });

  // Lấy dữ liệu phòng họp - sử dụng endpoint công khai
  const { data: rooms = [] } = useQuery<MeetingRoom[]>({
    queryKey: ["/api/public/meeting-rooms"],
    refetchInterval: 60000,
  });



  const { getWorkScheduleColor } = useSystemColors();

  // Hàm kiểm tra xem ngày có phải cuối tuần không
  const isWeekend = (date: Date) => {
    const day = getDay(date); // 0 = Chủ nhật, 6 = Thứ bảy
    return day === 0 || day === 6; // Chủ nhật hoặc Thứ bảy
  };

  // Hàm lấy lịch cho một nhân viên và ngày cụ thể
  const getSchedulesForStaffAndDay = (staffId: string, day: Date) => {
    if (!displayData?.workSchedules) return [];
    
    const daySchedules = displayData.workSchedules.filter(schedule => {
      if (schedule.staffId !== staffId) return false;
      
      const scheduleStart = startOfDay(new Date(schedule.startDateTime));
      const scheduleEnd = startOfDay(new Date(schedule.endDateTime));
      const checkDay = startOfDay(day);
      
      // Kiểm tra xem ngày có nằm trong phạm vi lịch trình không (bao gồm)
      return checkDay >= scheduleStart && checkDay <= scheduleEnd;
    });

    // Đối với giám đốc, nếu không có lịch cho ngày trong tuần, thêm mặc định "Làm việc tại CN"
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
    const staffMember = staff.find(s => s.id === staffId);
    const isBoardMember = staffMember && staffMember.department?.name.toLowerCase().includes("giám đốc");
    
    if (!isWeekend && isBoardMember && daySchedules.length === 0) {
      // Thêm lịch làm việc mặc định
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

  const renderWorkScheduleTable = () => {
    // Calculate dynamic grid template based on actual day positions
    const getColumnWidth = (index: number) => {
      const day = days[index];
      const dayOfWeek = getDay(day); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      return (dayOfWeek === 0 || dayOfWeek === 6) ? '0.5fr' : '1fr'; // Weekend smaller
    };
    
    const gridTemplate = `minmax(160px, 1fr) ${days.map((_, index) => getColumnWidth(index)).join(' ')}`;
    
    return (
    <div className="public-display-table bg-white rounded-lg overflow-hidden shadow-lg" style={{ fontFamily: 'Roboto, sans-serif' }}>
      {/* Table Header */}
      <div className="public-display-table-header bg-orange-500" style={{ display: 'grid', gridTemplateColumns: gridTemplate }}>
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
          <div key={staffMember.id} className="public-display-row border-b border-gray-200" style={{ display: 'grid', gridTemplateColumns: gridTemplate }}>
            {/* Staff Name Column */}
            <div className="p-2 bg-teal-700 text-white font-bold border-r border-gray-300 flex items-center" style={{ fontFamily: 'Roboto, sans-serif' }}>
              <div>
                <div className="text-lg font-bold" style={{ fontFamily: 'Roboto, sans-serif', fontSize: '22px', fontWeight: '700' }}>{(staffMember as any).positionShort}. {staffMember.fullName}</div>
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
                {schedules.length > 0 ? (
                  <div className="public-display-schedule-container">
                    {schedules.slice(0, 8).map((schedule, idx) => {
                      const isWorkAtBranch = schedule.workType === "Làm việc tại CN";
                      
                      // Check if this is a full day schedule using system work hours
                      const startTime = format(parseLocalDateTime(schedule.startDateTime), "HH:mm");
                      const endTime = format(parseLocalDateTime(schedule.endDateTime), "HH:mm");
                      const isFullDay = startTime === workHours.start && endTime === workHours.end;
                      
                      return (
                        <div
                          key={schedule.id}
                          className="public-display-schedule-item text-sm p-1 rounded text-white font-medium"
                          style={{
                            backgroundColor: isWorkAtBranch ? "transparent" : getWorkScheduleColor(schedule.workType),
                            fontSize: "15px",
                            lineHeight: "1.4",
                            opacity: isWorkAtBranch ? 0 : 1,
                            fontFamily: 'Roboto, sans-serif',
                            fontWeight: '600',
                            whiteSpace: 'normal',
                            wordWrap: 'break-word'
                          }}
                        >
                          {!isWorkAtBranch && (
                            <>
                              {/* Line 1: [Main content] - Time or Full Day */}
                              <div className="font-semibold" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: '700', fontSize: '15px', whiteSpace: 'normal', wordWrap: 'break-word' }}>
                                {schedule.workType === "Khác" && schedule.customContent 
                                  ? schedule.customContent 
                                  : schedule.workType === "Đi công tác nước ngoài" 
                                    ? "Đi công tác NN" 
                                    : schedule.workType}{isFullDay ? " - (Cả ngày)" : ` - (${format(parseLocalDateTime(schedule.startDateTime), "HH:mm", { locale: vi })} – ${format(parseLocalDateTime(schedule.endDateTime), "HH:mm", { locale: vi })})`}
                              </div>
                              {/* Line 2: Detailed content (only for custom content when workType is not "Khác") */}
                              {schedule.workType !== "Khác" && schedule.customContent && (
                                <div className="opacity-90" style={{ fontFamily: 'Roboto, sans-serif', fontSize: '13px', whiteSpace: 'normal', wordWrap: 'break-word' }}>{schedule.customContent}</div>
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
            <div className="w-2 h-2 rounded mr-1" style={{ backgroundColor: getWorkScheduleColor("Đi khách hàng") }}></div>
            <span className="text-[10px]" style={{ fontFamily: 'Roboto, sans-serif' }}>Đi khách hàng</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded mr-1" style={{ backgroundColor: getWorkScheduleColor("Đi công tác nước ngoài") }}></div>
            <span className="text-[10px]" style={{ fontFamily: 'Roboto, sans-serif' }}>CT NN</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded mr-1" style={{ backgroundColor: getWorkScheduleColor("Khác") }}></div>
            <span className="text-[10px]" style={{ fontFamily: 'Roboto, sans-serif' }}>Khác</span>
          </div>
        </div>
      </div>
    </div>
    );
  };

  // Helper function to parse datetime for status checking and display with proper timezone
  const parseLocalDateTime = (dateTime: string | Date): Date => {
    if (dateTime instanceof Date) {
      return dateTime;
    }
    
    // The datetime from server is already in UTC, just parse it directly
    // No need to add timezone offset since the server data is already correctly stored
    const parsedDate = new Date(dateTime.toString());
    
    console.log('Original:', dateTime.toString(), 'UTC:', parsedDate.toISOString(), 'Vietnam:', parsedDate.toISOString());
    
    return parsedDate;
  };

  const renderMeetingScheduleTable = () => {
    // Get current week dates - from today to end of week (not past days)
    const today = new Date();
    const todayStart = startOfDay(today);
    
    // Show 7 days starting from today (13/08 - 19/08)
    const endOfWeek = addDays(todayStart, 6);
    
    const weekDays = eachDayOfInterval({
      start: todayStart, // Start from today, not Monday
      end: endOfWeek
    });

    // Debug log
    console.log('Today:', format(today, 'yyyy-MM-dd HH:mm:ss'));
    console.log('Week start (today):', format(todayStart, 'yyyy-MM-dd'));
    console.log('Week end (Sunday):', format(endOfWeek, 'yyyy-MM-dd'));
    console.log('Week days:', weekDays.map(d => format(d, 'yyyy-MM-dd')));

    // Get all meeting rooms
    const meetingRooms = rooms || [];
    
    // Get meetings for current week (include meetings that overlap with current week)
    const weekMeetings = (displayData?.meetingSchedules || [])
      .filter((meeting: any) => {
        // Use UTC date for meeting date calculation (not Vietnam time)  
        const utcStartTime = new Date(meeting.startDateTime);
        const utcEndTime = new Date(meeting.endDateTime);
        
        // Get the UTC date by using the UTC components (not local timezone)
        const startYear = utcStartTime.getUTCFullYear();
        const startMonth = utcStartTime.getUTCMonth();
        const startDay = utcStartTime.getUTCDate();
        const meetingStartDate = new Date(startYear, startMonth, startDay);
        
        const endYear = utcEndTime.getUTCFullYear();
        const endMonth = utcEndTime.getUTCMonth();
        const endDay = utcEndTime.getUTCDate();
        const meetingEndDate = new Date(endYear, endMonth, endDay);
        const weekStartDate = todayStart;
        const weekEndDate = endOfWeek;
        
        // Debug log for ALL meetings
        if (meeting.roomId) {
          console.log('=== MEETING DEBUG ===');
          console.log('Room ID:', meeting.roomId);
          console.log('Meeting content:', meeting.meetingContent || 'NO CONTENT');
          console.log('Original startDateTime:', meeting.startDateTime);
          console.log('Original endDateTime:', meeting.endDateTime);
          console.log('UTC start time (raw):', utcStartTime.toISOString());
          console.log('UTC end time (raw):', utcEndTime.toISOString());
          console.log('UTC start time (formatted):', format(utcStartTime, 'yyyy-MM-dd HH:mm'));
          console.log('UTC end time (formatted):', format(utcEndTime, 'yyyy-MM-dd HH:mm'));
          console.log('Meeting start date (UTC):', format(meetingStartDate, 'yyyy-MM-dd'));
          console.log('Meeting end date (UTC):', format(meetingEndDate, 'yyyy-MM-dd'));
          console.log('Week start:', format(weekStartDate, 'yyyy-MM-dd'));
          console.log('Week end:', format(weekEndDate, 'yyyy-MM-dd'));
          const overlapCheck = meetingStartDate <= weekEndDate && meetingEndDate >= weekStartDate;
          console.log('Overlap check:', overlapCheck);
          console.log('Will be included?', overlapCheck ? 'YES' : 'NO');
          console.log('===================');
        }
        
        // Bao gồm cuộc họp nếu nó chồng lấp với tuần hiện tại
        // Cuộc họp chồng lấp nếu: cuộc họp bắt đầu trước hoặc vào cuối tuần VÀ cuộc họp kết thúc sau hoặc vào đầu tuần
        return meetingStartDate <= weekEndDate && meetingEndDate >= weekStartDate;
      });

    console.log('Total meetings found:', weekMeetings.length);

    // Nhóm cuộc họp theo phòng và ngày
    const meetingsByRoomAndDate: Record<string, Record<string, any[]>> = {};
    meetingRooms.forEach(room => {
      meetingsByRoomAndDate[room.id] = {};
      weekDays.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        meetingsByRoomAndDate[room.id][dateKey] = [];
      });
    });

    weekMeetings.forEach((meeting: any) => {
      // Sử dụng ngày UTC để nhóm cuộc họp
      const utcStartTime = new Date(meeting.startDateTime);
      const utcEndTime = new Date(meeting.endDateTime);
      
      // Lấy ngày UTC bằng cách sử dụng các thành phần UTC (không phải múi giờ địa phương)
      const startYear = utcStartTime.getUTCFullYear();
      const startMonth = utcStartTime.getUTCMonth();
      const startDay = utcStartTime.getUTCDate();
      const meetingStart = new Date(startYear, startMonth, startDay);
      
      const endYear = utcEndTime.getUTCFullYear();
      const endMonth = utcEndTime.getUTCMonth();
      const endDay = utcEndTime.getUTCDate();
      const meetingEnd = new Date(endYear, endMonth, endDay);
      
      // Thêm cuộc họp vào tất cả các ngày mà nó trải dài trong tuần hiện tại
      weekDays.forEach(day => {
        const currentDay = startOfDay(day);
        const dateKey = format(currentDay, 'yyyy-MM-dd');
        
        // Kiểm tra xem ngày hiện tại có nằm trong thời gian cuộc họp không
        if (currentDay >= meetingStart && currentDay <= meetingEnd) {
          if (meetingsByRoomAndDate[meeting.roomId] && meetingsByRoomAndDate[meeting.roomId][dateKey]) {
            meetingsByRoomAndDate[meeting.roomId][dateKey].push(meeting);
          }
        }
      });
    });

    console.log('Meetings by room and date:', JSON.stringify(meetingsByRoomAndDate, null, 2));

    return (
      <div className="public-display-container" style={{ fontFamily: 'Roboto, sans-serif', height: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0, zIndex: 1000, margin: 0, padding: 0, backgroundColor: 'white' }}>
        {/* Header */}
        <div className="bg-teal-700 text-white py-4 px-6" style={{ height: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <h1 className="text-xl font-bold text-center mb-1" style={{ fontSize: '20px', fontWeight: '700', color: '#FDE68A', margin: 0, lineHeight: '1.2' }}>
            NGÂN HÀNG TMCP ĐẦU TƯ VÀ PHÁT TRIỂN VIỆT NAM
          </h1>
          <h2 className="text-lg font-semibold text-center mb-2" style={{ fontSize: '16px', fontWeight: '600', color: '#FDE68A', margin: 0, lineHeight: '1.2' }}>
            CHI NHÁNH SỞ GIAO DỊCH 1
          </h2>
          <h3 className="text-2xl font-bold text-center" style={{ fontSize: '24px', fontWeight: '700', color: 'white', margin: 0, lineHeight: '1.2' }}>
            LỊCH HỌP
          </h3>
        </div>
        

        
        {/* Navigation Controls */}
        <div 
          className="fixed top-4 right-4 flex items-center gap-2 bg-black bg-opacity-75 rounded-lg px-3 py-2 z-50"
          style={{ 
            fontFamily: 'Roboto, sans-serif',
            fontSize: '12px',
            color: 'white'
          }}
        >
          {/* Previous Button */}
          <button
            onClick={() => setCurrentScreenIndex(prev => prev > 0 ? prev - 1 : SCREENS.length - 1)}
            className="bg-orange-600 hover:bg-orange-700 text-white p-2 rounded-full transition-colors"
            style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={16} />
          </button>
          
          {/* Play/Pause Button */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-full transition-colors"
            style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {isPaused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          
          {/* Next Button */}
          <button
            onClick={() => setCurrentScreenIndex(prev => prev < SCREENS.length - 1 ? prev + 1 : 0)}
            className="bg-orange-600 hover:bg-orange-700 text-white p-2 rounded-full transition-colors"
            style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronRight size={16} />
          </button>
          
          {/* Screen Info */}
          <div className="ml-3 text-white" style={{ minWidth: '100px' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', lineHeight: '1.2' }}>
              {format(currentTime, 'HH:mm:ss')}
            </div>
            <div style={{ fontSize: '11px', lineHeight: '1.2', opacity: 0.9 }}>
              {format(currentTime, 'dd/MM/yyyy')}
            </div>
            <div style={{ fontSize: '11px', lineHeight: '1.2', color: '#FDE68A' }}>
              Màn hình: {currentScreenIndex + 1}/{SCREENS.length}
            </div>
            <div style={{ fontSize: '11px', lineHeight: '1.2', color: isPaused ? '#FCA5A5' : '#86EFAC' }}>
              {isPaused ? 'Đã tạm dừng' : `${timeRemaining}s`}
            </div>
          </div>
        </div>
        
        {/* Meeting Schedule Table */}
        <div className="public-display-table bg-white" style={{ height: 'calc(100vh - 120px)', overflow: 'hidden' }}>
        <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontFamily: 'Roboto, sans-serif' }}>
          <colgroup>
            <col style={{ width: '280px' }} />
            {weekDays.map((day, index) => {
              const isWeekend = getDay(day) === 0 || getDay(day) === 6; // Sunday or Saturday
              return (
                <col key={index} style={{ 
                  width: isWeekend ? 'calc((100% - 280px) * 0.1)' : 'calc((100% - 280px) * 0.18)' 
                }} />
              );
            })}
          </colgroup>
          <thead style={{ height: '60px' }}>
            <tr className="bg-orange-600" style={{ height: '60px' }}>
              <th 
                className="text-white font-bold text-center"
                style={{ 
                  fontSize: '16px', 
                  fontWeight: '700',
                  padding: '12px',
                  borderRight: '1px solid rgb(194 65 12)', // orange-700
                  verticalAlign: 'middle'
                }}
              >
                Phòng họp/ Ngày
              </th>
          {weekDays.map((day, index) => {
            const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
            const dayName = dayNames[getDay(day)];
            const isWeekend = getDay(day) === 0 || getDay(day) === 6; // Sunday or Saturday
            const isLastColumn = index === weekDays.length - 1;
            
            return (
              <th 
                key={index}
                className="text-white font-bold text-center"
                style={{ 
                  fontSize: '14px', 
                  fontWeight: '700',
                  padding: '12px',
                  borderRight: isLastColumn ? 'none' : '1px solid rgb(194 65 12)', // orange-700
                  verticalAlign: 'middle'
                }}
              >
                <div>{dayName}</div>
                <div style={{ fontSize: '12px', fontWeight: '400' }}>
                  {format(day, 'dd/MM', { locale: vi })}
                </div>
              </th>
            );
          })}
            </tr>
          </thead>
          <tbody style={{ height: 'calc(100% - 60px)' }}>
            {meetingRooms.map((room: any, roomIndex: number) => (
              <tr key={room.id} className="border-b border-gray-200" style={{ height: `calc((100vh - 180px) / ${meetingRooms.length})`, minHeight: `calc((100vh - 180px) / ${meetingRooms.length})`, maxHeight: `calc((100vh - 180px) / ${meetingRooms.length})` }}>
                {/* Room Name Column */}
                <td 
                  className="bg-teal-600 text-white font-bold"
                  style={{
                    padding: '8px',
                    borderRight: '1px solid rgb(209 213 219)', // gray-300
                    verticalAlign: 'middle',
                    height: '100%',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ 
                    height: '100%',
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center',
                    overflow: 'hidden',
                    alignItems: 'flex-start'
                  }}>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: '700', 
                      lineHeight: '1.2',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {room.name}
                    </div>
                    {room.location && (
                      <div style={{ 
                        fontSize: '11px', 
                        fontWeight: '400', 
                        opacity: 0.9,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginTop: '2px'
                      }}>
                        {room.location}
                      </div>
                    )}
                  </div>
                </td>

              {/* Day Columns */}
              {weekDays.map((day, dayIndex) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayMeetings = meetingsByRoomAndDate[room.id][dateKey] || [];
                const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                
                const isLastColumn = dayIndex === weekDays.length - 1;
                
                return (
                  <td 
                    key={dayIndex} 
                    className={isWeekend ? 'bg-gray-100' : 'bg-white'}
                    style={{ 
                      height: '100%',
                      padding: '8px',
                      borderRight: isLastColumn ? 'none' : '1px solid rgb(229 231 235)', // gray-200
                      verticalAlign: 'top',
                      overflow: 'hidden'
                    }}
                  >
                    {dayMeetings.map((meeting: any, meetingIndex: number) => {
                      
                      // Format time only for grid display
                      const formatTime = (dateTimeString: string): string => {
                        const dateTime = dateTimeString.replace('T', ' ').replace('Z', '').split('.')[0];
                        const [datePart, timePart] = dateTime.split(' ');
                        const [hour, minute] = timePart ? timePart.split(':') : ['00', '00'];
                        return `${hour}:${minute}`;
                      };

                      // Calculate actual time range for current day using UTC dates
                      const utcStartTime = new Date(meeting.startDateTime);
                      const utcEndTime = new Date(meeting.endDateTime);
                      
                      // Get UTC date strings for comparison (using UTC components to avoid timezone issues)
                      const meetingStartDate = `${utcStartTime.getUTCFullYear()}-${String(utcStartTime.getUTCMonth() + 1).padStart(2, '0')}-${String(utcStartTime.getUTCDate()).padStart(2, '0')}`;
                      const meetingEndDate = `${utcEndTime.getUTCFullYear()}-${String(utcEndTime.getUTCMonth() + 1).padStart(2, '0')}-${String(utcEndTime.getUTCDate()).padStart(2, '0')}`;
                      const currentDayDate = format(day, 'yyyy-MM-dd');

                      let displayStartTime, displayEndTime;

                      // If meeting starts on current day, show actual UTC time
                      if (meetingStartDate === currentDayDate) {
                        displayStartTime = `${String(utcStartTime.getUTCHours()).padStart(2, '0')}:${String(utcStartTime.getUTCMinutes()).padStart(2, '0')}`;
                      } else {
                        displayStartTime = "00:00";
                      }

                      // If meeting ends on current day, show actual UTC time
                      if (meetingEndDate === currentDayDate) {
                        displayEndTime = `${String(utcEndTime.getUTCHours()).padStart(2, '0')}:${String(utcEndTime.getUTCMinutes()).padStart(2, '0')}`;
                      } else {
                        displayEndTime = "23:59";
                      }

                      const timeRange = `${displayStartTime} - ${displayEndTime}`;


                      // Determine meeting status
                      const now = new Date();
                      const meetingStart = parseLocalDateTime(meeting.startDateTime);
                      const meetingEnd = parseLocalDateTime(meeting.endDateTime);
                      
                      let statusColor = "#10b981"; // green - completed
                      let statusText = "Đã kết thúc";
                      
                      if (now < meetingStart) {
                        statusColor = "#f59e0b"; // yellow - upcoming
                        statusText = "Sắp diễn ra";
                      } else if (now >= meetingStart && now <= meetingEnd) {
                        statusColor = "#dc2626"; // red - ongoing
                        statusText = "Đang diễn ra";
                      }

                      // Apply BIDV colors based on status
                      let bidvStatusColor = "#006B68"; // BIDV Teal - default
                      let bidvBgColor = "#006B6820"; // Teal with transparency
                      
                      if (now < meetingStart) {
                        bidvStatusColor = "#FFC62F"; // BIDV Yellow - upcoming
                        bidvBgColor = "#FFC62F20"; // Yellow with transparency
                      } else if (now >= meetingStart && now <= meetingEnd) {
                        bidvStatusColor = "#dc2626"; // Red - ongoing (keep red for urgency)
                        bidvBgColor = "#dc262620"; // Red with transparency
                      }

                      return (
                        <div
                          key={meetingIndex}
                          className="mb-2"
                          style={{ 
                            padding: '0',
                            lineHeight: '1.3'
                          }}
                        >
                          <div style={{ 
                            fontSize: '12px', 
                            fontWeight: '500',
                            lineHeight: '1.3',
                            marginBottom: '4px'
                          }}>
                            <div style={{
                              color: '#9f224e',
                              fontWeight: '700',
                              fontSize: '12px',
                              marginBottom: '2px'
                            }}>
                              {timeRange}
                            </div>
                            <div style={{
                              color: '#006B68',
                              fontWeight: '500',
                              fontSize: '12px',
                              lineHeight: '1.4',
                              wordWrap: 'break-word',
                              whiteSpace: 'normal'
                            }}>
                              {meeting.meetingContent}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </td>
                );
              })}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    );
  };

  // Simple Image Layout Component for Standard Display - sử dụng thẻ img trực tiếp
  const SimpleImageLayout = ({ images }: { images: string[] }) => {
    if (images.length === 1) {
      // Một ảnh - toàn màn hình
      return (
        <div className="w-full h-full flex items-center justify-center p-4">
          <img
            src={images[0].startsWith("/") ? `${window.location.origin}${images[0]}` : images[0]}
            alt="Ảnh sự kiện"
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            }}
          />
        </div>
      );
    }

    if (images.length === 2) {
      // Hai ảnh - cạnh nhau
      return (
        <div className="w-full h-full flex gap-4 p-4">
          {images.map((src, index) => (
            <div key={index} className="flex-1 h-full">
              <img
                src={src.startsWith("/") ? `${window.location.origin}${src}` : src}
                alt={`Ảnh sự kiện ${index + 1}`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                }}
              />
            </div>
          ))}
        </div>
      );
    }

    if (images.length === 3) {
      // Ba ảnh - 2 trên, 1 dưới giữa
      return (
        <div className="w-full h-full flex flex-col gap-4 p-4">
          <div className="flex gap-4 h-1/2">
            {images.slice(0, 2).map((src, index) => (
              <div key={index} className="flex-1 h-full">
                <img
                  src={src.startsWith("/") ? `${window.location.origin}${src}` : src}
                  alt={`Ảnh sự kiện ${index + 1}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                  }}
                />
              </div>
            ))}
          </div>
          <div className="h-1/2 flex justify-center">
            <div className="w-1/2 h-full">
              <img
                src={images[2].startsWith("/") ? `${window.location.origin}${images[2]}` : images[2]}
                alt="Ảnh sự kiện 3"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                }}
              />
            </div>
          </div>
        </div>
      );
    }

    if (images.length === 4) {
      // Bốn ảnh - lưới 2x2
      return (
        <div className="w-full h-full flex flex-col gap-4 p-4">
          <div className="flex gap-4 h-1/2">
            {images.slice(0, 2).map((src, index) => (
              <div key={index} className="flex-1 h-full">
                <img
                  src={src.startsWith("/") ? `${window.location.origin}${src}` : src}
                  alt={`Ảnh sự kiện ${index + 1}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-4 h-1/2">
            {images.slice(2, 4).map((src, index) => (
              <div key={index + 2} className="flex-1 h-full">
                <img
                  src={src.startsWith("/") ? `${window.location.origin}${src}` : src}
                  alt={`Ảnh sự kiện ${index + 3}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  const renderOtherEventsTable = () => {
    // Filter to show ongoing events OR events starting within the next 30 days
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    
    const relevantEvents = (displayData?.otherEvents || [])
      .filter((event: any) => {
        // Use simple Date constructor for ISO format strings
        const start = new Date(event.startDateTime);
        const end = new Date(event.endDateTime);
        
        // Show events that are ongoing OR will start within the next 30 days
        const isOngoing = now >= start && now <= end;
        const isUpcoming = start >= now && start <= thirtyDaysFromNow;
        
        return isOngoing || isUpcoming;
      })
      .sort((a: any, b: any) => {
        // Sort by start time - ongoing events first, then upcoming
        const startA = new Date(a.startDateTime);
        const startB = new Date(b.startDateTime);
        return startA.getTime() - startB.getTime();
      });

    // Show only the current event based on currentEventIndex
    const currentEvent = relevantEvents[currentEventIndex];

    return (
      <div className="public-display-table bg-white rounded-lg overflow-hidden shadow-lg h-full" style={{ fontFamily: 'Roboto, sans-serif' }}>
        <div className="p-6 h-full">
          {currentEvent ? (
            <div className="h-full flex flex-col justify-center">
              <div className="text-center h-full flex items-center justify-center" style={{ fontFamily: 'Roboto, sans-serif' }}>
                {(() => {
                  // Get all available images (imageUrls array or fallback to single imageUrl)
                  const images = currentEvent.imageUrls && currentEvent.imageUrls.length > 0 
                    ? currentEvent.imageUrls.filter(Boolean) 
                    : currentEvent.imageUrl ? [currentEvent.imageUrl] : [];

                  if (images.length > 0) {
                    return <SimpleImageLayout images={images} />;
                  } else {
                    return (
                      <div className="w-full h-full flex flex-col items-center justify-center p-8">
                        <div className="text-center text-teal-800">
                          <h2 className="text-4xl font-bold mb-6" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: '700' }}>
                            {currentEvent.shortName}
                          </h2>
                          <p className="text-2xl leading-relaxed" style={{ fontFamily: 'Roboto, sans-serif' }}>
                            {currentEvent.content || "Không có nội dung"}
                          </p>
                        </div>
                      </div>
                    );
                  }
                })()}
              </div>
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
        <div className="text-yellow-400 font-bold text-[22px]" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: '700' }}>NGÂN HÀNG TMCP ĐẦU TƯ VÀ PHÁT TRIỂN VIỆT NAM</div>
        <div className="text-center font-bold text-[22px] text-[#facc15]" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: '600' }}>CHI NHÁNH SỞ GIAO DỊCH 1
</div>
        <div className="font-bold mt-2 text-[#ffffff] text-[44px]" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: '700' }}>
          {(() => {
            const currentScreen = SCREENS[currentScreenIndex];
            if (currentScreen.id === 'other-events' && displayData?.otherEvents) {
              // Use same filtering logic as renderOtherEventsTable
              const now = new Date();
              const thirtyDaysFromNow = new Date();
              thirtyDaysFromNow.setDate(now.getDate() + 30);
              
              const relevantEvents = displayData.otherEvents
                .filter((event: any) => {
                  const start = new Date(event.startDateTime);
                  const end = new Date(event.endDateTime);
                  const isOngoing = now >= start && now <= end;
                  const isUpcoming = start >= now && start <= thirtyDaysFromNow;
                  return isOngoing || isUpcoming;
                })
                .sort((a: any, b: any) => {
                  const startA = new Date(a.startDateTime);
                  const startB = new Date(b.startDateTime);
                  return startA.getTime() - startB.getTime();
                });
              
              const currentEvent = relevantEvents[currentEventIndex];
              if (currentEvent) {
                return `${currentEvent.shortName.toUpperCase()}`;
              }
            }
            return currentScreen.name.toUpperCase();
          })()} 
        </div>
        
        {/* Navigation controls and time display in top right corner */}
        <div className="absolute top-4 right-4 flex items-start gap-3">
          {/* Navigation buttons */}
          <div className="flex flex-col gap-2">
            {/* Navigation controls row */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousScreen}
                className="bg-orange-600 hover:bg-orange-700 text-white p-2 rounded-full transition-colors duration-200 shadow-lg"
                style={{ fontSize: '16px' }}
                data-testid="button-prev-screen"
                title="Màn hình trước"
              >
                <ChevronLeft size={20} />
              </button>
              
              <button
                onClick={toggleAutoRotation}
                className={`${isPaused ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white p-2 rounded-full transition-colors duration-200 shadow-lg`}
                style={{ fontSize: '16px' }}
                data-testid="button-toggle-auto"
                title={isPaused ? "Tiếp tục tự động" : "Tạm dừng tự động"}
              >
                {isPaused ? <Play size={20} /> : <Pause size={20} />}
              </button>
              
              <button
                onClick={goToNextScreen}
                className="bg-orange-600 hover:bg-orange-700 text-white p-2 rounded-full transition-colors duration-200 shadow-lg"
                style={{ fontSize: '16px' }}
                data-testid="button-next-screen"
                title="Màn hình tiếp theo"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Screen info and time display */}
          <div className="bg-black bg-opacity-50 text-white px-3 py-2 rounded" style={{ fontFamily: 'Roboto, sans-serif' }}>
            <div className="text-base font-bold" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: '600' }}>
              {format(currentTime, "HH:mm:ss", { locale: vi })}
            </div>
            <div className="text-xs" style={{ fontFamily: 'Roboto, sans-serif' }}>
              {format(currentTime, "dd/MM/yyyy", { locale: vi })}
            </div>
            <div className="text-xs mt-1 text-yellow-300" style={{ fontFamily: 'Roboto, sans-serif' }}>
              Màn hình: {currentScreenIndex + 1}/{SCREENS.length}
            </div>
            <div className={`text-xs ${isPaused ? 'text-red-300' : 'text-yellow-300'}`} style={{ fontFamily: 'Roboto, sans-serif' }}>
              {isPaused ? 'Đã tạm dừng' : `Còn lại: ${timeRemaining}s`}
            </div>
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