import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import React from 'react';

// 4K Display optimized for 3840x2160 resolution (65" TV)
const SCREENS = [
  { id: 'work-schedule', name: 'Kế hoạch công tác' },
  { id: 'meeting-schedule', name: 'Lịch họp' },
  { id: 'other-events', name: 'Sự kiện khác' }
];

export default function PublicDisplay4K() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentScreenIndex, setCurrentScreenIndex] = useState(0);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(15);
  const [isPaused, setIsPaused] = useState(false);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Fetch system config to get refresh interval and work hours
  const { data: systemConfig = [] } = useQuery<any[]>({
    queryKey: ["/api/system-config"],
    refetchInterval: 60000,
  });

  // Get work hours from system config
  const workHours = React.useMemo(() => {
    const startConfig = systemConfig.find(config => config.key === 'work_hours.start_time');
    const endConfig = systemConfig.find(config => config.key === 'work_hours.end_time');
    return {
      start: startConfig?.value || '08:00',
      end: endConfig?.value || '17:30'
    };
  }, [systemConfig]);

  // Get screen duration from config, default to 15 seconds
  const screenDurationMs = React.useMemo(() => {
    const refreshConfig = systemConfig.find(config => config.key === 'display.refresh_interval');
    return refreshConfig ? parseInt(refreshConfig.value) * 1000 : 15000;
  }, [systemConfig]);

  // Manual navigation functions
  const goToPreviousScreen = () => {
    setCurrentScreenIndex(prev => (prev - 1 + SCREENS.length) % SCREENS.length);
    setCurrentEventIndex(0);
    setTimeRemaining(screenDurationMs / 1000);
  };

  const goToNextScreen = () => {
    setCurrentScreenIndex(prev => (prev + 1) % SCREENS.length);
    setCurrentEventIndex(0);
    setTimeRemaining(screenDurationMs / 1000);
  };

  const toggleAutoRotation = () => {
    setIsPaused(prev => !prev);
    if (!isPaused) {
      setTimeRemaining(screenDurationMs / 1000);
    }
  };

  // Screen rotation and countdown
  useEffect(() => {
    if (isPaused) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          const currentScreen = SCREENS[currentScreenIndex];
          
          if (currentScreen.id === 'other-events' && displayData && displayData.otherEvents) {
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
              
            if (relevantEvents.length > 0) {
              const nextEventIndex = (currentEventIndex + 1) % relevantEvents.length;
              if (nextEventIndex === 0) {
                setCurrentScreenIndex(prev => (prev + 1) % SCREENS.length);
                setCurrentEventIndex(0);
              } else {
                setCurrentEventIndex(nextEventIndex);
              }
            } else {
              setCurrentScreenIndex(prev => (prev + 1) % SCREENS.length);
              setCurrentEventIndex(0);
            }
          } else {
            setCurrentScreenIndex(prev => (prev + 1) % SCREENS.length);
            setCurrentEventIndex(0);
          }
          return screenDurationMs / 1000;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, screenDurationMs, currentScreenIndex, currentEventIndex]);

  // Fetch display data
  const { data: displayData } = useQuery<any>({
    queryKey: ["/api/public/display-data"],
    refetchInterval: 4000,
  });

  // Fetch staff data
  const { data: staff = [] } = useQuery<any[]>({
    queryKey: ["/api/public/staff"],
    refetchInterval: 30000,
  });

  // Fetch meeting rooms
  const { data: meetingRooms = [] } = useQuery<any[]>({
    queryKey: ["/api/public/meeting-rooms"],
    refetchInterval: 30000,
  });

  // Helper function to parse datetime with proper timezone
  const parseLocalDateTime = (dateTime: string | Date): Date => {
    if (dateTime instanceof Date) {
      return dateTime;
    }
    
    // The datetime from server is already in UTC, just parse it directly
    const parsedDate = new Date(dateTime.toString());
    
    console.log('Original:', dateTime.toString(), 'UTC:', parsedDate.toISOString(), 'Vietnam:', parsedDate.toISOString());
    
    return parsedDate;
  };

  // Generate week days starting from Monday
  const getWeekDays = (startDate: Date) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getMonday = (date: Date) => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  const days = getWeekDays(getMonday(new Date()));
  
  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  // Get schedules for a specific staff member and day
  const getSchedulesForStaffAndDay = (staffId: string, day: Date) => {
    if (!displayData?.workSchedules) return [];

    const startOfDay = new Date(day);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(day);
    endOfDay.setHours(23, 59, 59, 999);

    return displayData.workSchedules.filter((schedule: any) => {
      if (schedule.staffId !== staffId) return false;

      const scheduleStart = parseLocalDateTime(schedule.startDateTime);
      const scheduleEnd = parseLocalDateTime(schedule.endDateTime);

      return (scheduleStart <= endOfDay && scheduleEnd >= startOfDay);
    });
  };

  // Get work schedule color
  const getWorkScheduleColor = (workType: string) => {
    const colorConfig = systemConfig.find(config => {
      switch(workType) {
        case "Làm việc tại CN": return config.key === "colors.work_at_branch";
        case "Nghỉ phép": return config.key === "colors.leave";
        case "Làm việc với BGĐ": return config.key === "colors.leadership_duty";
        case "Đi khách hàng": return config.key === "colors.customer_visit";
        case "Đi công tác nước ngoài": return config.key === "colors.international_business_trip";
        default: return config.key === "colors.other";
      }
    });
    return colorConfig ? colorConfig.value : '#9f224e';
  };

  // Work Schedule Table for 4K
  const renderWorkScheduleTable4K = () => {
    if (!displayData || !displayData.workSchedules) {
      return <div className="flex items-center justify-center h-full text-4xl text-white">Đang tải dữ liệu...</div>;
    }

    const gridTemplate = `300px repeat(7, 1fr)`;

    return (
      <div className="h-full overflow-hidden" style={{ fontFamily: 'Roboto, sans-serif' }}>
        {/* Header */}
        <div className="grid border-b-4 border-gray-400 bg-yellow-400" style={{ gridTemplateColumns: gridTemplate }}>
          <div className="p-6 bg-yellow-400 text-black font-bold text-3xl flex items-center justify-center border-r-4 border-gray-400">
            LÃNH ĐẠO
          </div>
          {days.map((day, index) => {
            const isWeekendDay = isWeekend(day);
            return (
              <div 
                key={index} 
                className={`p-4 text-black font-bold text-2xl text-center border-r-4 border-gray-400 ${isWeekendDay ? 'bg-gray-300' : 'bg-yellow-400'}`}
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                <div className="text-xl font-bold">{format(day, 'EEEE', { locale: vi })}</div>
                <div className="text-2xl font-bold">{format(day, 'dd/MM', { locale: vi })}</div>
              </div>
            );
          })}
        </div>

        {/* Body with rows for each staff member */}
        <div className="overflow-auto" style={{ height: 'calc(100% - 120px)' }}>
          {staff
            .filter(s => s.department && s.department.name.toLowerCase().includes("giám đốc"))
            .map((staffMember, rowIndex) => (
            <div key={staffMember.id} className="grid border-b-2 border-gray-300" style={{ gridTemplateColumns: gridTemplate, minHeight: '180px' }}>
              {/* Staff Name Column */}
              <div className="p-4 bg-teal-700 text-white font-bold border-r-2 border-gray-300 flex items-center">
                <div className="text-2xl font-bold" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: '700' }}>
                  {(staffMember as any).positionShort}. {staffMember.fullName}
                </div>
              </div>
            
            {/* Schedule Columns for each day */}
            {days.map((day, dayIndex) => {
              const schedules = getSchedulesForStaffAndDay(staffMember.id, day);
              const isWeekendDay = isWeekend(day);
              
              return (
                <div 
                  key={dayIndex} 
                  className="border-r-2 border-gray-300 relative p-2"
                  style={{ 
                    backgroundColor: isWeekendDay ? '#9ca3af' : '#006b68',
                    fontFamily: 'Roboto, sans-serif'
                  }}
                >
                  {schedules.length > 0 ? (
                    <div className="space-y-2">
                      {schedules.slice(0, 6).map((schedule: any, idx: number) => {
                        const isWorkAtBranch = schedule.workType === "Làm việc tại CN";
                        
                        // Check if this is a full day schedule using system work hours
                        const startTime = format(parseLocalDateTime(schedule.startDateTime), "HH:mm");
                        const endTime = format(parseLocalDateTime(schedule.endDateTime), "HH:mm");
                        const isFullDay = startTime === workHours.start && endTime === workHours.end;
                        
                        return (
                          <div
                            key={schedule.id}
                            className="text-lg p-2 rounded text-white font-medium"
                            style={{
                              backgroundColor: isWorkAtBranch ? "transparent" : getWorkScheduleColor(schedule.workType),
                              fontSize: "20px",
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
                                {/* Main content with time or full day */}
                                <div className="font-semibold" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: '700', fontSize: '18px' }}>
                                  {schedule.workType === "Khác" && schedule.customContent 
                                    ? schedule.customContent 
                                    : schedule.workType === "Đi công tác nước ngoài" 
                                      ? "Đi công tác NN" 
                                      : schedule.workType}{isFullDay ? " - (Cả ngày)" : ` - (${format(parseLocalDateTime(schedule.startDateTime), "HH:mm", { locale: vi })} – ${format(parseLocalDateTime(schedule.endDateTime), "HH:mm", { locale: vi })})`}
                                </div>
                                {/* Additional content */}
                                {schedule.workType !== "Khác" && schedule.customContent && (
                                  <div className="opacity-90" style={{ fontFamily: 'Roboto, sans-serif', fontSize: '16px' }}>
                                    {schedule.customContent}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                      {schedules.filter((s: any) => s.workType !== "Làm việc tại CN").length > 6 && (
                        <div className="text-sm text-gray-300 text-center" style={{ fontFamily: 'Roboto, sans-serif' }}>
                          +{schedules.filter((s: any) => s.workType !== "Làm việc tại CN").length - 6} more
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full"></div>
                  )}
                </div>
              );
            })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Meeting Schedule Table for 4K - matching standard display layout
  const renderMeetingScheduleTable4K = () => {
    if (!displayData?.meetingSchedules) {
      return <div className="flex items-center justify-center h-full text-4xl text-white">Không có dữ liệu lịch họp</div>;
    }

    // Generate week days for table headers (same as standard display)
    const getDay = (date: Date) => date.getDay();
    
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Monday
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      return day;
    });

    // Get meetings for a specific room and day
    const getMeetingsForRoomAndDay = (roomId: string, day: Date) => {
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      return (displayData?.meetingSchedules || [])
        .filter((meeting: any) => {
          if (meeting.meetingRoomId !== roomId) return false;
          const meetingStart = parseLocalDateTime(meeting.startDateTime);
          const meetingEnd = parseLocalDateTime(meeting.endDateTime);
          return (meetingStart <= dayEnd && meetingEnd >= dayStart);
        })
        .sort((a: any, b: any) => {
          const startA = parseLocalDateTime(a.startDateTime);
          const startB = parseLocalDateTime(b.startDateTime);
          return startA.getTime() - startB.getTime();
        });
    };

    return (
      <div className="h-full overflow-hidden" style={{ fontFamily: 'Roboto, sans-serif' }}>
        {/* Meeting Schedule Table */}
        <div className="bg-white h-full overflow-hidden">
          <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '420px' }} /> {/* Wider for 4K */}
              {weekDays.map((day, index) => {
                const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                return (
                  <col key={index} style={{ 
                    width: isWeekend ? 'calc((100% - 420px) * 0.1)' : 'calc((100% - 420px) * 0.18)' 
                  }} />
                );
              })}
            </colgroup>
            <thead style={{ height: '100px' }}> {/* Taller for 4K */}
              <tr className="bg-orange-600" style={{ height: '100px' }}>
                <th 
                  className="text-white font-bold text-center"
                  style={{ 
                    fontSize: '28px', 
                    fontWeight: '700',
                    padding: '20px',
                    borderRight: '2px solid rgb(194 65 12)',
                    verticalAlign: 'middle'
                  }}
                >
                  Phòng họp/ Ngày
                </th>
                {weekDays.map((day, index) => {
                  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                  const dayName = dayNames[getDay(day)];
                  const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                  const isLastColumn = index === weekDays.length - 1;
                  
                  return (
                    <th 
                      key={index}
                      className="text-white font-bold text-center"
                      style={{ 
                        fontSize: '24px', 
                        fontWeight: '700',
                        padding: '20px',
                        borderRight: isLastColumn ? 'none' : '2px solid rgb(194 65 12)',
                        verticalAlign: 'middle'
                      }}
                    >
                      <div>{dayName}</div>
                      <div style={{ fontSize: '20px', fontWeight: '400' }}>
                        {format(day, 'dd/MM', { locale: vi })}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody style={{ height: 'calc(100% - 100px)' }}>
              {meetingRooms.slice(0, 8).map((room: any, roomIndex: number) => ( // Limit to 8 rooms for 4K
                <tr key={room.id} className="border-b-2 border-gray-200" style={{ 
                  height: `calc((100vh - 300px) / ${Math.min(meetingRooms.length, 8)})`,
                  minHeight: '120px' 
                }}>
                  {/* Room Name Column */}
                  <td 
                    className="bg-teal-600 text-white font-bold"
                    style={{
                      padding: '16px',
                      borderRight: '2px solid rgb(209 213 219)',
                      verticalAlign: 'middle',
                      height: '100%',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ 
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      fontWeight: '700',
                      textAlign: 'center',
                      lineHeight: '1.3',
                      wordWrap: 'break-word'
                    }}>
                      {room.name}
                    </div>
                  </td>

                  {/* Meeting columns for each day */}
                  {weekDays.map((day, dayIndex) => {
                    const dayMeetings = getMeetingsForRoomAndDay(room.id, day);
                    const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                    const isLastColumn = dayIndex === weekDays.length - 1;
                    
                    return (
                      <td 
                        key={dayIndex}
                        style={{
                          padding: '12px',
                          borderRight: isLastColumn ? 'none' : '2px solid rgb(209 213 219)',
                          backgroundColor: isWeekend ? '#f3f4f6' : 'white',
                          verticalAlign: 'top',
                          overflow: 'hidden'
                        }}
                      >
                        {dayMeetings.map((meeting: any, meetingIndex: number) => {
                          // Calculate time display (same logic as standard)
                          const utcStartTime = new Date(meeting.startDateTime);
                          const utcEndTime = new Date(meeting.endDateTime);
                          
                          const meetingStartDate = `${utcStartTime.getUTCFullYear()}-${String(utcStartTime.getUTCMonth() + 1).padStart(2, '0')}-${String(utcStartTime.getUTCDate()).padStart(2, '0')}`;
                          const meetingEndDate = `${utcEndTime.getUTCFullYear()}-${String(utcEndTime.getUTCMonth() + 1).padStart(2, '0')}-${String(utcEndTime.getUTCDate()).padStart(2, '0')}`;
                          const currentDayDate = format(day, 'yyyy-MM-dd');

                          let displayStartTime, displayEndTime;
                          if (meetingStartDate === currentDayDate) {
                            displayStartTime = `${String(utcStartTime.getUTCHours()).padStart(2, '0')}:${String(utcStartTime.getUTCMinutes()).padStart(2, '0')}`;
                          } else {
                            displayStartTime = "00:00";
                          }

                          if (meetingEndDate === currentDayDate) {
                            displayEndTime = `${String(utcEndTime.getUTCHours()).padStart(2, '0')}:${String(utcEndTime.getUTCMinutes()).padStart(2, '0')}`;
                          } else {
                            displayEndTime = "23:59";
                          }

                          const timeRange = `${displayStartTime} - ${displayEndTime}`;

                          return (
                            <div
                              key={meetingIndex}
                              className="mb-3"
                              style={{ 
                                padding: '0',
                                lineHeight: '1.3'
                              }}
                            >
                              <div style={{ 
                                fontSize: '18px', // Larger for 4K
                                fontWeight: '500',
                                lineHeight: '1.3',
                                marginBottom: '6px'
                              }}>
                                <div style={{
                                  color: '#9f224e',
                                  fontWeight: '700',
                                  fontSize: '18px',
                                  marginBottom: '4px'
                                }}>
                                  {timeRange}
                                </div>
                                <div style={{
                                  color: '#006B68',
                                  fontWeight: '500',
                                  fontSize: '16px',
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

  // Other Events Display for 4K - matching standard display layout
  const renderOtherEventsDisplay4K = () => {
    // Filter to show ongoing events OR events starting within the next 30 days (same as standard)
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    
    const relevantEvents = (displayData?.otherEvents || [])
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

    // Show only the current event based on currentEventIndex (same as standard)
    const currentEvent = relevantEvents[currentEventIndex];

    return (
      <div className="bg-white rounded-lg overflow-hidden shadow-lg h-full" style={{ fontFamily: 'Roboto, sans-serif' }}>
        <div className="p-12 h-full"> {/* Larger padding for 4K */}
          {currentEvent ? (
            <div className="h-full flex flex-col">
              {/* Event Title and Info */}
              <div className="mb-8">
                <div className="text-5xl font-bold text-gray-800 mb-6 leading-tight"> {/* Larger text for 4K */}
                  {currentEvent.shortName}
                </div>
                
                {/* Time Information */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div className="bg-green-50 p-6 rounded-lg">
                    <div className="text-2xl font-semibold text-green-700 mb-2">Thời gian bắt đầu</div>
                    <div className="text-3xl text-green-800">
                      {format(new Date(currentEvent.startDateTime), 'HH:mm', { locale: vi })}
                    </div>
                    <div className="text-xl text-green-600">
                      {format(new Date(currentEvent.startDateTime), 'EEEE, dd/MM/yyyy', { locale: vi })}
                    </div>
                  </div>
                  
                  <div className="bg-red-50 p-6 rounded-lg">
                    <div className="text-2xl font-semibold text-red-700 mb-2">Thời gian kết thúc</div>
                    <div className="text-3xl text-red-800">
                      {format(new Date(currentEvent.endDateTime), 'HH:mm', { locale: vi })}
                    </div>
                    <div className="text-xl text-red-600">
                      {format(new Date(currentEvent.endDateTime), 'EEEE, dd/MM/yyyy', { locale: vi })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 flex gap-8">
                {/* Image Section */}
                {currentEvent.imageUrl && (
                  <div className="w-1/2">
                    <div className="h-full border-4 border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                      <img 
                        src={currentEvent.imageUrl}
                        alt={currentEvent.shortName}
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          console.log('Image failed to load:', currentEvent.imageUrl);
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          // Show placeholder
                          const placeholder = document.createElement('div');
                          placeholder.className = 'flex items-center justify-center text-4xl text-gray-400 h-full w-full';
                          placeholder.textContent = 'Hình ảnh không khả dụng';
                          target.parentNode?.appendChild(placeholder);
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Content Section */}
                <div className={`${currentEvent.imageUrl ? 'w-1/2' : 'w-full'} flex flex-col justify-center`}>
                  <div className="bg-blue-50 p-8 rounded-lg h-full flex items-center">
                    <div className="text-3xl text-gray-700 leading-relaxed"> {/* Larger text for 4K */}
                      {currentEvent.content}
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress indicator at bottom */}
              {relevantEvents.length > 1 && (
                <div className="mt-8 flex justify-center">
                  <div className="flex space-x-3">
                    {relevantEvents.map((_: any, index: number) => (
                      <div
                        key={index}
                        className={`w-6 h-6 rounded-full ${index === currentEventIndex ? 'bg-blue-600' : 'bg-gray-300'}`} // Larger indicators for 4K
                      />
                    ))}
                    <div className="ml-6 text-2xl text-gray-600 font-medium">
                      {currentEventIndex + 1} / {relevantEvents.length}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl text-gray-400 mb-8">📅</div> {/* Larger icon for 4K */}
                <div className="text-4xl text-gray-600">
                  Không có sự kiện nào trong thời gian tới
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const currentScreen = SCREENS[currentScreenIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-800 to-teal-900 relative overflow-hidden" style={{ width: '100vw', height: '100vh' }}>
      {/* Header with BIDV branding */}
      <div className="relative bg-gradient-to-r from-yellow-400 to-yellow-500 text-center py-6 border-b-4 border-yellow-600">
        <div className="text-center font-bold text-3xl text-black" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: '600' }}>
          NGÂN HÀNG TMCP ĐẦU TƯ VÀ PHÁT TRIỂN VIỆT NAM
        </div>
        <div className="text-center font-bold text-2xl text-black" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: '600' }}>
          CHI NHÁNH SỞ GIAO DỊCH 1
        </div>
        <div className="font-bold mt-4 text-black text-6xl" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: '700' }}>
          {(() => {
            if (currentScreen.id === 'other-events' && displayData?.otherEvents) {
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
                return currentEvent.shortName.toUpperCase();
              }
            }
            return currentScreen.name.toUpperCase();
          })()}
        </div>
        
        {/* Navigation controls and time display in top right corner */}
        <div className="absolute top-6 right-6 flex items-start gap-4">
          {/* Navigation buttons */}
          <div className="flex flex-col gap-3">
            {/* Navigation controls row */}
            <div className="flex items-center gap-3">
              <button
                onClick={goToPreviousScreen}
                className="bg-orange-600 hover:bg-orange-700 text-white p-3 rounded-full transition-colors duration-200 shadow-lg"
                data-testid="button-prev-screen-4k"
                title="Màn hình trước"
              >
                <ChevronLeft size={28} />
              </button>
              
              <button
                onClick={toggleAutoRotation}
                className={`${isPaused ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white p-3 rounded-full transition-colors duration-200 shadow-lg`}
                data-testid="button-toggle-auto-4k"
                title={isPaused ? "Tiếp tục tự động" : "Tạm dừng tự động"}
              >
                {isPaused ? <Play size={28} /> : <Pause size={28} />}
              </button>
              
              <button
                onClick={goToNextScreen}
                className="bg-orange-600 hover:bg-orange-700 text-white p-3 rounded-full transition-colors duration-200 shadow-lg"
                data-testid="button-next-screen-4k"
                title="Màn hình tiếp theo"
              >
                <ChevronRight size={28} />
              </button>
            </div>
            
            {/* Screen counter and timer */}
            <div className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg text-center">
              <div className="text-lg font-bold">
                {currentScreenIndex + 1}/{SCREENS.length}
              </div>
              <div className="text-sm">
                {timeRemaining}s
              </div>
            </div>
          </div>
          
          {/* Current time display */}
          <div className="bg-black bg-opacity-50 text-white px-6 py-4 rounded-lg text-right">
            <div className="text-2xl font-bold">
              {format(currentTime, 'HH:mm:ss')}
            </div>
            <div className="text-lg">
              {format(currentTime, 'dd/MM/yyyy', { locale: vi })}
            </div>
            <div className="text-sm">
              {format(currentTime, 'EEEE', { locale: vi })}
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
        {currentScreen.id === 'work-schedule' && renderWorkScheduleTable4K()}
        {currentScreen.id === 'meeting-schedule' && renderMeetingScheduleTable4K()}
        {currentScreen.id === 'other-events' && renderOtherEventsDisplay4K()}
      </div>
    </div>
  );
}