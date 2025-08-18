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
    if (!displayData?.workSchedules) return <div className="text-center text-gray-500">Đang tải dữ liệu...</div>;

    // Lọc lịch công tác trong tuần hiện tại
    const today = startOfDay(new Date());
    const weekDays = eachDayOfInterval({
      start: addDays(today, -getDay(today) + 1), // Thứ Hai
      end: addDays(today, -getDay(today) + 7)    // Chủ Nhật
    });

    return (
      <div className="space-y-3">
        {/* Danh sách ngày trong tuần - layout dọc cho mobile */}
        <div className="space-y-2">
          {weekDays.map((day) => {
            const isToday = format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
            const daySchedules = displayData.workSchedules.filter(schedule => {
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
                      
                      return (
                        <div 
                          key={`${schedule.id}-${index}`}
                          className="p-2 rounded border-l-4 border-[#006b68] bg-gray-50"
                        >
                          <div className="flex flex-col space-y-1">
                            <div className="font-semibold text-gray-800 text-sm">
                              {staffMember?.fullName || 'Không xác định'}
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
      </div>
    );
  };

  // Component hiển thị lịch phòng họp cho mobile
  const MeetingScheduleDisplayMobile = () => {
    if (!displayData?.meetingSchedules) return <div className="text-center text-gray-500">Đang tải dữ liệu...</div>;

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
            const dayMeetings = displayData.meetingSchedules.filter(meeting => {
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
                    dayMeetings.map((meeting, index) => {
                      const room = meetingRooms.find(r => r.id === meeting.meetingRoomId);
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
    if (!displayData?.otherEvents) return <div className="text-center text-gray-500">Đang tải dữ liệu...</div>;

    const currentEvents = displayData.otherEvents.filter(event => event.status === 'active');
    
    if (currentEvents.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="text-gray-400 text-lg">Không có sự kiện nào</div>
        </div>
      );
    }

    const currentEvent = currentEvents[currentEventIndex % currentEvents.length];

    return (
      <div className="space-y-4">{/* Hiển thị indicator số sự kiện nếu có nhiều sự kiện */}
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
              {currentEvent.title}
            </h3>
          </div>

          {/* Mô tả sự kiện */}
          {currentEvent.description && (
            <div className="p-4">
              <div className="text-gray-700 leading-relaxed">
                {currentEvent.description}
              </div>
            </div>
          )}

          {/* Hình ảnh sự kiện - tối ưu cho mobile */}
          {currentEvent.images && currentEvent.images.length > 0 && (
            <div className="p-4 space-y-4">
              {currentEvent.images.map((imagePath: string, imageIndex: number) => {
                const imageUrl = createImageUrl(imagePath);
                
                return (
                  <div key={imageIndex} className="w-full">
                    <img
                      src={imageUrl}
                      alt={`${currentEvent.title} - Hình ${imageIndex + 1}`}
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