import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, startOfDay, eachDayOfInterval, getDay, startOfWeek, endOfWeek } from "date-fns";
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
  positionShort: string;
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
    const [currentWeekOffset, setCurrentWeekOffset] = useState<number>(0);
    
    if (!displayData?.workSchedules) return <div className="text-center text-gray-500">Đang tải dữ liệu...</div>;

    // Tính toán tuần hiện tại + offset
    const today = startOfDay(new Date());
    const currentWeekStart = addDays(today, -getDay(today) + 1 + (currentWeekOffset * 7)); // Thứ Hai
    const currentWeekEnd = addDays(currentWeekStart, 6); // Chủ Nhật
    
    const weekDays = eachDayOfInterval({
      start: currentWeekStart,
      end: currentWeekEnd
    });

    // Lọc chỉ cán bộ thuộc Ban giám đốc
    const managementStaff = staff.filter(s => s.department?.name === 'Ban giám đốc');

    // Lọc lịch theo tuần hiện tại và chỉ hiển thị cán bộ Ban giám đốc
    let filteredSchedules = displayData.workSchedules.filter(schedule => {
      const scheduleDate = startOfDay(new Date(schedule.startDateTime));
      const scheduleEndDate = startOfDay(new Date(schedule.endDateTime));
      
      // Kiểm tra xem lịch có nằm trong tuần hiện tại không
      const isInCurrentWeek = (scheduleDate >= currentWeekStart && scheduleDate <= currentWeekEnd) ||
                            (scheduleEndDate >= currentWeekStart && scheduleEndDate <= currentWeekEnd) ||
                            (scheduleDate <= currentWeekStart && scheduleEndDate >= currentWeekEnd);
      
      const staffInManagement = managementStaff.some(s => s.id === schedule.staffId);
      
      return isInCurrentWeek && staffInManagement;
    });

    // Hiển thị theo layout mới như hình mẫu
    const renderScheduleView = () => {
      return (
        <div className="space-y-3">
          {weekDays.map((day) => {
            const isToday = format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
            
            // Lọc lịch cho ngày cụ thể, bao gồm cả lịch kéo dài nhiều ngày
            const daySchedules = filteredSchedules.filter(schedule => {
              const scheduleStartDate = startOfDay(new Date(schedule.startDateTime));
              const scheduleEndDate = startOfDay(new Date(schedule.endDateTime));
              const currentDay = startOfDay(day);
              
              // Kiểm tra xem ngày hiện tại có nằm trong khoảng thời gian của lịch không
              return currentDay >= scheduleStartDate && currentDay <= scheduleEndDate;
            });

            if (daySchedules.length === 0) return null;

            return (
              <div key={format(day, 'yyyy-MM-dd')} className="bg-white rounded-lg overflow-hidden shadow-sm">
                {/* Header ngày với background màu cam */}
                <div className="bg-orange-100 border border-orange-200 p-3 text-center">
                  <div className="text-lg font-bold text-orange-700">
                    {format(day, 'dd/MM')}
                  </div>
                </div>

                {/* Danh sách lịch công tác */}
                <div className="divide-y divide-gray-200">
                  {daySchedules.map((schedule, index) => {
                    const staffMember = staff.find(s => s.id === schedule.staffId);
                    const startTime = new Date(schedule.startDateTime);
                    const endTime = new Date(schedule.endDateTime);
                    const scheduleStartDate = startOfDay(new Date(schedule.startDateTime));
                    const scheduleEndDate = startOfDay(new Date(schedule.endDateTime));
                    const currentDay = startOfDay(day);
                    
                    // Hiển thị thời gian khác nhau tùy theo lịch một ngày hay nhiều ngày
                    const isMultiDay = format(scheduleStartDate, 'yyyy-MM-dd') !== format(scheduleEndDate, 'yyyy-MM-dd');
                    let timeDisplay = '';
                    
                    if (isMultiDay) {
                      if (format(currentDay, 'yyyy-MM-dd') === format(scheduleStartDate, 'yyyy-MM-dd')) {
                        // Ngày đầu
                        timeDisplay = `${format(startTime, 'HH:mm')} - 12:00`;
                      } else if (format(currentDay, 'yyyy-MM-dd') === format(scheduleEndDate, 'yyyy-MM-dd')) {
                        // Ngày cuối
                        timeDisplay = `08:00 - ${format(endTime, 'HH:mm')}`;
                      } else {
                        // Ngày giữa
                        timeDisplay = '08:00 - 12:00';
                      }
                    } else {
                      // Lịch trong ngày
                      timeDisplay = `${format(startTime, 'HH:mm')} - ${format(endTime, 'HH:mm')}`;
                    }
                    
                    return (
                      <div key={`${schedule.id}-${index}`} className="p-3 border-l-4 border-gray-400">
                        <div className="space-y-1">
                          {/* Tên với chức danh viết tắt */}
                          <div className="font-bold text-gray-900 text-sm">
                            {staffMember?.positionShort}. {staffMember?.fullName || 'Không xác định'}
                          </div>
                          
                          {/* Thời gian */}
                          <div className="text-xs text-gray-600">
                            {timeDisplay}
                          </div>
                          
                          {/* Nội dung công việc */}
                          <div className="text-sm text-gray-800">
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
          
          {filteredSchedules.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-400 text-lg">Không có lịch công tác trong tuần này</div>
              <div className="text-gray-300 text-sm mt-2">
                Tuần: {format(currentWeekStart, 'dd/MM')} - {format(currentWeekEnd, 'dd/MM')}
              </div>
            </div>
          )}
        </div>
      );
    };



    return (
      <div className="space-y-3">
        {/* Header điều khiển tuần */}
        <div className="bg-white p-3 rounded-lg shadow-sm">
          {/* Navigation tuần */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setCurrentWeekOffset(currentWeekOffset - 1)}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              <ChevronLeft size={20} />
            </button>
            
            <div className="text-center flex-1">
              <div className="font-bold text-lg text-gray-800">
                Tuần {format(currentWeekStart, 'dd/MM')} - {format(currentWeekEnd, 'dd/MM/yyyy')}
              </div>
            </div>
            
            <button
              onClick={() => setCurrentWeekOffset(currentWeekOffset + 1)}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              <ChevronRight size={20} />
            </button>
          </div>


        </div>

        {/* Nội dung hiển thị */}
        {renderScheduleView()}
      </div>
    );
  };

  // Component hiển thị lịch phòng họp cho mobile
  const MeetingScheduleDisplayMobile = () => {
    // Lấy dữ liệu từ API public display data
    const { data: displayData, isLoading: displayLoading } = useQuery({
      queryKey: ['/api/public/display-data'],
      refetchInterval: 30000
    });

    // Lấy dữ liệu phòng họp từ API
    const { data: meetingRooms, isLoading: roomsLoading } = useQuery({
      queryKey: ['/api/public/meeting-rooms'],
      refetchInterval: 60000
    });

    const meetingSchedules = (displayData as any)?.meetingSchedules || [];
    const meetingsLoading = displayLoading;

    if (meetingsLoading || roomsLoading) return <div className="text-center text-gray-500">Đang tải dữ liệu...</div>;
    if (!meetingSchedules) return <div className="text-center text-gray-500">Không có dữ liệu lịch họp</div>;
    if (!meetingRooms) return <div className="text-center text-gray-500">Không có dữ liệu phòng họp</div>;

    const today = startOfDay(new Date());
    const currentWeek = eachDayOfInterval({
      start: startOfWeek(today, { weekStartsOn: 1 }),
      end: endOfWeek(today, { weekStartsOn: 1 })
    });

    // Hàm kiểm tra xem phòng có đang được sử dụng không
    const isRoomBusy = (roomId: string, checkTime: Date) => {
      return Array.isArray(meetingSchedules) ? meetingSchedules.some((meeting: any) => {
        const meetingStart = new Date(meeting.startDateTime);
        const meetingEnd = new Date(meeting.endDateTime);
        // Sử dụng roomId thay vì meetingRoomId
        return meeting.roomId === roomId && 
               checkTime >= meetingStart && 
               checkTime < meetingEnd;
      }) : false;
    };

    // Hàm lấy cuộc họp tiếp theo của phòng
    const getNextMeeting = (roomId: string) => {
      if (!Array.isArray(meetingSchedules)) return null;
      
      const now = new Date();
      const upcomingMeetings = meetingSchedules
        .filter((meeting: any) => {
          const meetingStart = new Date(meeting.startDateTime);
          return meeting.roomId === roomId && meetingStart > now;
        })
        .sort((a: any, b: any) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
      
      return upcomingMeetings[0] || null;
    };

    // Hàm lấy cuộc họp hiện tại của phòng
    const getCurrentMeeting = (roomId: string) => {
      if (!Array.isArray(meetingSchedules)) return null;
      
      const now = new Date();
      return meetingSchedules.find((meeting: any) => {
        const meetingStart = new Date(meeting.startDateTime);
        const meetingEnd = new Date(meeting.endDateTime);
        return meeting.roomId === roomId && 
               now >= meetingStart && 
               now < meetingEnd;
      }) || null;
    };



    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="text-center bg-[#006b68] text-white p-3 rounded-lg">
          <h2 className="text-lg font-bold">Tình trạng phòng họp hôm nay</h2>
          <div className="text-sm">
            {format(today, 'dd/MM/yyyy')} - {format(new Date(), 'HH:mm')}
          </div>
        </div>

        {/* Danh sách phòng họp */}
        <div className="space-y-3">
          {Array.isArray(meetingRooms) && meetingRooms.map((room: any) => {
            const currentMeeting = getCurrentMeeting(room.id);
            const nextMeeting = getNextMeeting(room.id);
            const isBusy = isRoomBusy(room.id, new Date());

            return (
              <div 
                key={room.id}
                className={`p-4 rounded-lg border-2 ${
                  isBusy 
                    ? 'border-red-400 bg-red-50' 
                    : 'border-green-400 bg-green-50'
                }`}
              >
                {/* Header phòng */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      isBusy ? 'bg-red-500' : 'bg-green-500'
                    }`}></div>
                    <h3 className="font-bold text-lg text-gray-800">
                      {room.name}
                    </h3>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    isBusy 
                      ? 'bg-red-200 text-red-800' 
                      : 'bg-green-200 text-green-800'
                  }`}>
                    {isBusy ? 'Đang sử dụng' : 'Trống'}
                  </div>
                </div>

                {/* Thông tin hiện tại */}
                {currentMeeting && (
                  <div className="mb-3 p-3 bg-white rounded border border-red-200">
                    <div className="text-sm font-medium text-red-700 mb-1">
                      Đang diễn ra:
                    </div>
                    <div className="text-sm text-gray-800 font-medium">
                      {currentMeeting.meetingContent || currentMeeting.title || 'Cuộc họp'}
                    </div>
                    <div className="text-xs text-gray-600">
                      {format(new Date(currentMeeting.startDateTime), 'HH:mm')} - {format(new Date(currentMeeting.endDateTime), 'HH:mm')}
                      {currentMeeting.contactPerson && ` • Người liên hệ: ${currentMeeting.contactPerson}`}
                    </div>
                  </div>
                )}

                {/* Cuộc họp tiếp theo */}
                {nextMeeting && (
                  <div className="mb-3 p-3 bg-white rounded border border-blue-200">
                    <div className="text-sm font-medium text-blue-700 mb-1">
                      Cuộc họp tiếp theo:
                    </div>
                    <div className="text-sm text-gray-800 font-medium">
                      {nextMeeting.meetingContent || nextMeeting.title || 'Cuộc họp'}
                    </div>
                    <div className="text-xs text-gray-600">
                      {format(new Date(nextMeeting.startDateTime), 'dd/MM HH:mm')} - {format(new Date(nextMeeting.endDateTime), 'HH:mm')}
                      {nextMeeting.contactPerson && ` • Người liên hệ: ${nextMeeting.contactPerson}`}
                    </div>
                  </div>
                )}


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
    const currentEvents = Array.isArray(otherEvents) ? otherEvents.filter((event: any) => {
      const startDate = new Date(event.startDateTime);
      const endDate = new Date(event.endDateTime);
      return startDate <= now && now <= endDate;
    }) : [];
    
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