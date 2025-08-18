import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, startOfDay, eachDayOfInterval, getDay } from "date-fns";
import { vi } from "date-fns/locale";
import { useSystemColors } from "@/hooks/useSystemColors";
import { ChevronLeft, ChevronRight, Pause, Play, Calendar, Clock, Users } from "lucide-react";
import "@/styles/mobile-display.css";

// Interface dữ liệu hiển thị
interface DisplayData {
  workSchedules: any[];
  meetingSchedules: any[];
  otherEvents: any[];
  currentTime: string;
}

// Interface phòng họp
interface MeetingRoom {
  id: string;
  name: string;
  location?: string;
}

// Interface cán bộ
interface Staff {
  id: string;
  employeeId: string;
  fullName: string;
  position: string;
  department: {
    name: string;
  };
}

// Cấu hình các màn hình hiển thị
const SCREENS = [
  { id: 'work-schedule', name: 'Kế hoạch công tác', icon: Calendar },
  { id: 'meeting-schedule', name: 'Lịch phòng họp', icon: Users },
  { id: 'other-events', name: 'Sự kiện khác', icon: Clock }
];

// Hàm tạo URL ảnh đúng định dạng cho mobile
const createImageUrl = (imagePath: string | null): string => {
  if (!imagePath) return '';
  
  // Đảm bảo đường dẫn bắt đầu bằng /uploads
  const cleanPath = imagePath.startsWith('/uploads') ? imagePath : `/uploads/${imagePath}`;
  
  // Mã hóa URL để xử lý khoảng trắng và ký tự đặc biệt
  const encodedPath = cleanPath.split('/').map((segment, index) => 
    index === 0 ? segment : encodeURIComponent(segment)
  ).join('/');
  
  return encodedPath;
};

export default function PublicDisplayMobile() {
  // State quản lý thời gian và màn hình hiện tại
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentScreenIndex, setCurrentScreenIndex] = useState(0);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(15);
  const [isPaused, setIsPaused] = useState(false);

  // Cập nhật thời gian hiện tại mỗi giây
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Lấy cấu hình hệ thống
  const { data: systemConfig = [] } = useQuery<any[]>({
    queryKey: ["/api/system-config"],
    refetchInterval: 60000,
  });

  // Lấy dữ liệu hiển thị từ API
  const { data: displayData } = useQuery<DisplayData>({
    queryKey: ["/api/public/display-data"],
    refetchInterval: 30000,
  });

  // Lấy danh sách phòng họp
  const { data: meetingRooms = [] } = useQuery<MeetingRoom[]>({
    queryKey: ["/api/public/meeting-rooms"],
    refetchInterval: 300000,
  });

  // Lấy danh sách cán bộ
  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/public/staff"],
    refetchInterval: 300000,
  });

  // Lấy màu sắc hệ thống
  const systemColors = useSystemColors();

  // Tính toán thời gian hiển thị cho từng màn hình
  // Tính toán thời gian hiển thị cho từng màn hình
  const getScreenDurations = (): Record<string, number> => {
    const workScheduleConfig = systemConfig.find(config => config.key === 'display.work_schedule_display_time');
    const meetingScheduleConfig = systemConfig.find(config => config.key === 'display.meeting_schedule_display_time');
    const eventsConfig = systemConfig.find(config => config.key === 'display.events_display_time');
    
    return {
      'work-schedule': parseInt(workScheduleConfig?.value || '15'),
      'meeting-schedule': parseInt(meetingScheduleConfig?.value || '15'), 
      'other-events': parseInt(eventsConfig?.value || '15')
    };
  };

  const screenDurations = getScreenDurations();

  // Auto rotation giữa các màn hình
  useEffect(() => {
    if (isPaused) return;

    const currentScreen = SCREENS[currentScreenIndex];
    const duration = screenDurations[currentScreen.id];
    
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setCurrentScreenIndex((prevIndex) => (prevIndex + 1) % SCREENS.length);
          return duration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentScreenIndex, isPaused, screenDurations]);

  // Reset time remaining khi chuyển màn hình thủ công
  const handleScreenChange = (index: number) => {
    setCurrentScreenIndex(index);
    const newScreen = SCREENS[index];
    const duration = screenDurations[newScreen.id];
    setTimeRemaining(duration);
  };

  // Component hiển thị kế hoạch công tác cho mobile
  const WorkScheduleDisplayMobile = () => {
    const [selectedStaff, setSelectedStaff] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'week' | 'staff'>('week');
    
    if (!displayData?.workSchedules) return <div className="text-center text-gray-500">Đang tải dữ liệu...</div>;

    // Lọc lịch công tác trong tuần hiện tại
    const today = startOfDay(new Date());
    const weekDays = eachDayOfInterval({
      start: addDays(today, -getDay(today) + 1), // Thứ Hai
      end: addDays(today, -getDay(today) + 7)    // Chủ Nhật
    });

    // Lọc lịch theo cán bộ đã chọn
    const filteredSchedules = selectedStaff === 'all' 
      ? displayData.workSchedules 
      : displayData.workSchedules.filter(schedule => schedule.staffId === selectedStaff);

    // Hàm rút gọn chức danh
    const getShortTitle = (position: string) => {
      const titleMap: Record<string, string> = {
        'Giám đốc': 'GĐ',
        'Phó Giám đốc': 'PGĐ',
        'Trưởng phòng': 'TP',
        'Phó Trưởng phòng': 'PTP',
        'Chuyên viên': 'CV',
        'Nhân viên': 'NV',
        'Kế toán': 'KT',
        'Thủ quỹ': 'TQ',
        'Bảo vệ': 'BV',
        'Lái xe': 'LX'
      };
      return titleMap[position] || position.substring(0, 2).toUpperCase();
    };

    // Hiển thị theo tuần
    const renderWeekView = () => (
      <div className="space-y-2">
        {weekDays.map((day) => {
          const isToday = format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
          const daySchedules = filteredSchedules.filter(schedule => {
            const scheduleDate = new Date(schedule.startDateTime);
            return format(scheduleDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
          });

          return (
            <div 
              key={format(day, 'yyyy-MM-dd')} 
              className={`p-3 rounded-lg border-2 ${
                isToday 
                  ? 'border-orange-400 bg-orange-50' 
                  : 'border-gray-200 bg-white'
              }`}
            >
              {/* Ngày đơn giản hóa */}
              <div className={`text-center mb-2 pb-2 border-b ${
                isToday ? 'border-orange-300' : 'border-gray-200'
              }`}>
                <div className={`text-lg font-bold ${
                  isToday ? 'text-orange-700' : 'text-gray-800'
                }`}>
                  {format(day, 'dd/MM')}
                </div>
              </div>

              {/* Danh sách lịch công tác */}
              <div className="space-y-2">
                {daySchedules.length > 0 ? (
                  daySchedules.map((schedule, index) => {
                    const staffMember = staff.find(s => s.id === schedule.staffId);
                    const startTime = new Date(schedule.startDateTime);
                    const endTime = new Date(schedule.endDateTime);
                    const shortTitle = getShortTitle(staffMember?.position || '');
                    
                    return (
                      <div 
                        key={`${schedule.id}-${index}`}
                        className="p-2 rounded border-l-4 border-[#006b68] bg-gray-50"
                      >
                        <div className="flex flex-col space-y-1">
                          <div className="font-semibold text-gray-800 text-sm">
                            {shortTitle}. {staffMember?.fullName || 'Không xác định'}
                          </div>
                          <div className="text-xs text-gray-600">
                            {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                          </div>
                          <div className="text-sm text-gray-700">
                            {schedule.workType === 'Khác' ? schedule.customContent : schedule.workType}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-gray-400 text-sm py-2">
                    Không có lịch công tác
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );

    // Hiển thị theo cán bộ
    const renderStaffView = () => {
      // Gom nhóm lịch theo cán bộ
      const schedulesByStaff = filteredSchedules.reduce((acc, schedule) => {
        const staffId = schedule.staffId;
        if (!acc[staffId]) acc[staffId] = [];
        acc[staffId].push(schedule);
        return acc;
      }, {} as Record<string, (typeof filteredSchedules)>);

      return (
        <div className="space-y-3">
          {Object.entries(schedulesByStaff).map(([staffId, schedules]) => {
            const staffMember = staff.find(s => s.id === staffId);
            const shortTitle = getShortTitle(staffMember?.position || '');
            
            return (
              <div key={staffId} className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
                {/* Header cán bộ */}
                <div className="bg-[#006b68] text-white p-3">
                  <div className="font-bold text-sm text-center">
                    {shortTitle}. {staffMember?.fullName || 'Không xác định'}
                  </div>
                </div>
                
                {/* Lịch của cán bộ */}
                <div className="p-3 space-y-2">
                  {(schedules as any[]).map((schedule: any, index: number) => {
                    const startTime = new Date(schedule.startDateTime);
                    const endTime = new Date(schedule.endDateTime);
                    const scheduleDate = new Date(schedule.startDateTime);
                    
                    return (
                      <div 
                        key={`${schedule.id}-${index}`}
                        className="p-2 bg-gray-50 rounded border-l-4 border-orange-400"
                      >
                        <div className="flex flex-col space-y-1">
                          <div className="font-medium text-gray-800 text-sm">
                            {format(scheduleDate, 'dd/MM')} - {format(startTime, 'HH:mm')} đến {format(endTime, 'HH:mm')}
                          </div>
                          <div className="text-sm text-gray-700">
                            {schedule.workType === 'Khác' ? schedule.customContent : schedule.workType}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      );
    };

    return (
      <div className="space-y-3">
        {/* Bộ lọc và điều khiển */}
        <div className="bg-white p-3 rounded-lg shadow-sm">
          {/* Nút chuyển đổi chế độ xem */}
          <div className="flex space-x-2 mb-3">
            <button
              onClick={() => setViewMode('week')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded ${
                viewMode === 'week'
                  ? 'bg-[#006b68] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📅 Theo tuần
            </button>
            <button
              onClick={() => setViewMode('staff')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded ${
                viewMode === 'staff'
                  ? 'bg-[#006b68] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              👥 Theo cán bộ
            </button>
          </div>

          {/* Bộ lọc cán bộ */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Lọc theo cán bộ:</label>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#006b68] focus:border-transparent"
            >
              <option value="all">Tất cả cán bộ</option>
              {staff.map((staffMember) => (
                <option key={staffMember.id} value={staffMember.id}>
                  {getShortTitle(staffMember.position)}. {staffMember.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Nội dung hiển thị */}
        {viewMode === 'week' ? renderWeekView() : renderStaffView()}
      </div>
    );
  };

  // Component hiển thị lịch phòng họp cho mobile
  const MeetingScheduleDisplayMobile = () => {
    // Lấy dữ liệu từ API riêng cho meeting schedules
    const { data: meetingSchedules, isLoading: meetingsLoading } = useQuery({
      queryKey: ['/api/meeting-schedules'],
      refetchInterval: 30000
    });

    if (meetingsLoading) return <div className="text-center text-gray-500">Đang tải dữ liệu...</div>;
    if (!meetingSchedules) return <div className="text-center text-gray-500">Không có dữ liệu lịch họp</div>;

    const today = startOfDay(new Date());
    const weekDays = eachDayOfInterval({
      start: addDays(today, -getDay(today) + 1),
      end: addDays(today, -getDay(today) + 7)
    });

    return (
      <div className="space-y-3">
        {/* Danh sách phòng họp theo ngày */}
        <div className="space-y-2">
          {weekDays.map((day) => {
            const isToday = format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
            const dayMeetings = meetingSchedules.filter((meeting: any) => {
              const meetingDate = new Date(meeting.startDateTime);
              return format(meetingDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
            });

            return (
              <div 
                key={format(day, 'yyyy-MM-dd')} 
                className={`p-3 rounded-lg border-2 ${
                  isToday 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-200 bg-white'
                }`}
              >
                {/* Ngày đơn giản hóa */}
                <div className={`text-center mb-2 pb-2 border-b ${
                  isToday ? 'border-blue-300' : 'border-gray-200'
                }`}>
                  <div className={`text-lg font-bold ${
                    isToday ? 'text-blue-700' : 'text-gray-800'
                  }`}>
                    {format(day, 'dd/MM')}
                  </div>
                </div>

                {/* Danh sách cuộc họp */}
                <div className="space-y-2">
                  {dayMeetings.length > 0 ? (
                    dayMeetings.map((meeting: any, index: number) => {
                      const room = meetingRooms.find((r: any) => r.id === meeting.meetingRoomId);
                      const startTime = new Date(meeting.startDateTime);
                      const endTime = new Date(meeting.endDateTime);
                      
                      return (
                        <div 
                          key={`${meeting.id}-${index}`}
                          className="p-2 rounded border-l-4 border-blue-500 bg-blue-50"
                        >
                          <div className="flex flex-col space-y-1">
                            <div className="font-semibold text-gray-800 text-sm">
                              {meeting.title}
                            </div>
                            <div className="text-xs text-gray-600">
                              {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                            </div>
                            <div className="text-sm text-blue-700">
                              📍 {room?.name || 'Không xác định'}
                            </div>
                            {meeting.organizer && (
                              <div className="text-xs text-gray-600">
                                Chủ trì: {meeting.organizer}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center text-gray-400 text-sm py-2">
                      Không có cuộc họp
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Component hiển thị sự kiện khác cho mobile
  const OtherEventsDisplayMobile = () => {
    // Lấy dữ liệu từ API riêng cho other events
    const { data: otherEvents, isLoading: eventsLoading } = useQuery({
      queryKey: ['/api/other-events'],
      refetchInterval: 30000
    });

    if (eventsLoading) return <div className="text-center text-gray-500">Đang tải dữ liệu...</div>;
    if (!otherEvents) return <div className="text-center text-gray-500">Không có dữ liệu sự kiện</div>;

    // Lọc sự kiện active và trong khoảng thời gian hiện tại
    const now = new Date();
    const currentEvents = otherEvents.filter((event: any) => {
      const startDate = new Date(event.startDateTime);
      const endDate = new Date(event.endDateTime);
      return startDate <= now && now <= endDate;
    });
    
    if (currentEvents.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="text-gray-400 text-lg">Không có sự kiện nào đang diễn ra</div>
        </div>
      );
    }

    const currentEvent = currentEvents[currentEventIndex % currentEvents.length];

    return (
      <div className="space-y-4">
        {/* Hiển thị indicator số sự kiện nếu có nhiều sự kiện */}
        {currentEvents.length > 1 && (
          <div className="text-center">
            <div className="bg-[#006b68] text-white px-4 py-2 rounded-full inline-block text-sm font-medium">
              {currentEventIndex + 1} / {currentEvents.length}
            </div>
          </div>
        )}

        {/* Nội dung sự kiện */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Tiêu đề sự kiện */}
          <div className="p-4 bg-gray-50 border-b">
            <h3 className="text-xl font-bold text-gray-800 text-center">
              {currentEvent.shortName || currentEvent.content}
            </h3>
          </div>

          {/* Mô tả sự kiện */}
          {currentEvent.content && (
            <div className="p-4">
              <div className="text-gray-700 leading-relaxed">
                {currentEvent.content}
              </div>
            </div>
          )}

          {/* Hình ảnh sự kiện - tối ưu cho mobile */}
          {currentEvent.imageUrls && currentEvent.imageUrls.length > 0 && (
            <div className="p-4 space-y-4">
              {currentEvent.imageUrls.map((imagePath: string, imageIndex: number) => {
                const imageUrl = createImageUrl(imagePath);
                
                return (
                  <div key={imageIndex} className="w-full">
                    <img
                      src={imageUrl}
                      alt={`${currentEvent.shortName} - Hình ${imageIndex + 1}`}
                      className="w-full h-auto rounded-lg shadow-sm object-contain max-h-80"
                      onError={(e) => {
                        console.error('Lỗi tải ảnh mobile:', imageUrl);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Hiển thị ảnh chính nếu không có imageUrls */}
          {(!currentEvent.imageUrls || currentEvent.imageUrls.length === 0) && currentEvent.imageUrl && (
            <div className="p-4">
              <div className="w-full">
                <img
                  src={createImageUrl(currentEvent.imageUrl)}
                  alt={currentEvent.shortName}
                  className="w-full h-auto rounded-lg shadow-sm object-contain max-h-80"
                  onError={(e) => {
                    console.error('Lỗi tải ảnh chính mobile:', currentEvent.imageUrl);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Điều khiển chuyển sự kiện cho mobile */}
        {currentEvents.length > 1 && (
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setCurrentEventIndex((prev) => (prev - 1 + currentEvents.length) % currentEvents.length)}
              className="bg-[#006b68] hover:bg-[#005a57] text-white p-3 rounded-full shadow-lg"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={() => setCurrentEventIndex((prev) => (prev + 1) % currentEvents.length)}
              className="bg-[#006b68] hover:bg-[#005a57] text-white p-3 rounded-full shadow-lg"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render component hiện tại dựa trên currentScreenIndex
  const renderCurrentScreen = () => {
    const currentScreen = SCREENS[currentScreenIndex];
    
    switch (currentScreen.id) {
      case 'work-schedule':
        return <WorkScheduleDisplayMobile />;
      case 'meeting-schedule':
        return <MeetingScheduleDisplayMobile />;
      case 'other-events':
        return <OtherEventsDisplayMobile />;
      default:
        return <WorkScheduleDisplayMobile />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 flex flex-col mobile-container mobile-safe-area">
      {/* Header tối giản cho mobile - chỉ thông tin tổ chức và tabs */}
      <div className="bg-white shadow-md sticky top-0 z-10">
        {/* Thông tin tổ chức */}
        <div className="bg-[#260705] text-white mobile-header">
          <div className="text-center">
            <div className="mobile-org-title font-bold mobile-text-lg">
              NGÂN HÀNG ĐẦU TƯ VÀ PHÁT TRIỂN VIỆT NAM
            </div>
            <div className="mobile-text-sm">
              CHI NHÁNH SỞ GIAO DỊCH 1
            </div>
          </div>
        </div>

        {/* Thanh điều hướng màn hình cho mobile - đơn giản hóa */}
        <div className="bg-gray-50 p-2">
          <div className="flex mobile-screen-tabs">
            {SCREENS.map((screen, index) => {
              const Icon = screen.icon;
              return (
                <button
                  key={screen.id}
                  onClick={() => handleScreenChange(index)}
                  className={`flex-1 mobile-screen-tab mobile-touch-target rounded mobile-text-sm font-medium mobile-transition ${
                    index === currentScreenIndex
                      ? 'bg-[#006b68] text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-1">
                    <Icon size={16} />
                    <span className="text-xs leading-tight text-center">
                      {screen.name}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Nội dung chính - tối ưu diện tích hiển thị */}
      <div className="flex-1 p-4 overflow-y-auto mobile-scrollbar-hidden">
        {renderCurrentScreen()}
      </div>
    </div>
  );
}