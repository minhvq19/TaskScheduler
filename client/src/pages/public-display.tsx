import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isAfter, isBefore } from "date-fns";
import { vi } from "date-fns/locale";

interface DisplayData {
  workSchedules: any[];
  meetingSchedules: any[];
  otherEvents: any[];
  currentTime: string;
}

export default function PublicDisplay() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentScreen, setCurrentScreen] = useState(0);
  const screens = ["work", "meetings", "events"];

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Auto-rotate screens every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentScreen(prev => (prev + 1) % screens.length);
    }, 15000);

    return () => clearInterval(interval);
  }, [screens.length]);

  // Fetch display data every 30 seconds
  const { data: displayData, isLoading } = useQuery<DisplayData>({
    queryKey: ["/api/public/display-data"],
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  });

  const getWorkScheduleColor = (workType: string) => {
    const colors = {
      "Làm việc tại CN": "transparent",
      "Nghỉ phép": "hsl(333, 71%, 41%)", // #9f224e
      "Trực lãnh đạo": "hsl(26, 91%, 58%)", // #f58732
      "Đi công tác trong nước": "hsl(201, 100%, 33%)", // #0071a6
      "Đi công tác nước ngoài": "hsl(135, 53%, 43%)", // #32a852
      "Khác": "hsl(260, 60%, 45%)"
    };
    return colors[workType as keyof typeof colors] || "transparent";
  };

  const getScheduleStatus = (startTime: string, endTime: string) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isAfter(now, start) && isBefore(now, end)) {
      return { status: "Đang diễn ra", color: "bg-green-400", textColor: "text-green-900" };
    } else if (isBefore(now, start)) {
      return { status: "Sắp diễn ra", color: "bg-yellow-400", textColor: "text-yellow-900" };
    } else {
      return { status: "Đã kết thúc", color: "bg-gray-400", textColor: "text-gray-900" };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white" data-testid="public-display">
      {/* Header */}
      <header className="bg-bidv-teal p-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
              <i className="fas fa-university text-bidv-teal text-xl"></i>
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-organization-name">
                BIDV Chi nhánh Sở giao dịch 1
              </h1>
              <p className="text-blue-200" data-testid="text-subtitle">
                Lịch công tác và sự kiện
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold" data-testid="text-current-time">
              {format(currentTime, "HH:mm", { locale: vi })}
            </div>
            <div className="text-blue-200" data-testid="text-current-date">
              {format(currentTime, "EEEE, dd/MM/yyyy", { locale: vi })}
            </div>
          </div>
        </div>
      </header>

      {/* Display Content */}
      <div className="p-8 space-y-8">
        {currentScreen === 0 && (
          /* Work Schedules */
          <div className="bg-gray-800 rounded-2xl p-8" data-testid="screen-work-schedules">
            <div className="flex items-center mb-6">
              <div className="w-3 h-3 bg-blue-400 rounded-full mr-3"></div>
              <h2 className="text-3xl font-bold">Lịch Công Tác</h2>
            </div>

            <div className="space-y-4">
              {displayData?.workSchedules?.length ? (
                displayData.workSchedules.map((schedule) => {
                  const { status, color, textColor } = getScheduleStatus(
                    schedule.startDateTime,
                    schedule.endDateTime
                  );
                  
                  return (
                    <div
                      key={schedule.id}
                      className="rounded-xl p-6 border-l-4"
                      style={{
                        backgroundColor: getWorkScheduleColor(schedule.workType) + "30",
                        borderLeftColor: getWorkScheduleColor(schedule.workType)
                      }}
                      data-testid={`schedule-item-${schedule.id}`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className={`${color} ${textColor} px-3 py-1 rounded-full text-sm font-medium`}>
                          {status}
                        </div>
                        <div className="text-gray-300 text-sm">
                          {format(new Date(schedule.startDateTime), "HH:mm", { locale: vi })} - {format(new Date(schedule.endDateTime), "HH:mm", { locale: vi })}
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-2">{schedule.workType}</h3>
                      {schedule.customContent && (
                        <p className="text-gray-300 mb-2">{schedule.customContent}</p>
                      )}
                      <p className="text-gray-300">Cán bộ: [Tên cán bộ]</p>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-gray-400 py-8" data-testid="no-work-schedules">
                  Không có lịch công tác nào hôm nay
                </div>
              )}
            </div>
          </div>
        )}

        {currentScreen === 1 && (
          /* Meeting Schedules */
          <div className="bg-gray-800 rounded-2xl p-8" data-testid="screen-meeting-schedules">
            <div className="flex items-center mb-6">
              <div className="w-3 h-3 bg-purple-400 rounded-full mr-3"></div>
              <h2 className="text-3xl font-bold">Lịch Phòng Họp</h2>
            </div>

            <div className="space-y-4">
              {displayData?.meetingSchedules?.length ? (
                displayData.meetingSchedules.map((meeting) => {
                  const { status, color, textColor } = getScheduleStatus(
                    meeting.startDateTime,
                    meeting.endDateTime
                  );
                  
                  return (
                    <div
                      key={meeting.id}
                      className="bg-purple-900/30 rounded-xl p-6 border-l-4 border-purple-400"
                      data-testid={`meeting-item-${meeting.id}`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className={`${color} ${textColor} px-3 py-1 rounded-full text-sm font-medium`}>
                          {status}
                        </div>
                        <div className="text-purple-400 text-sm">
                          {format(new Date(meeting.startDateTime), "HH:mm", { locale: vi })} - {format(new Date(meeting.endDateTime), "HH:mm", { locale: vi })}
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-2">[Tên phòng họp]</h3>
                      <p className="text-gray-300 mb-2">{meeting.meetingContent}</p>
                      {meeting.contactPerson && (
                        <p className="text-gray-300">Người đầu mối: {meeting.contactPerson}</p>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-gray-400 py-8" data-testid="no-meeting-schedules">
                  Không có lịch phòng họp nào hôm nay
                </div>
              )}
            </div>
          </div>
        )}

        {currentScreen === 2 && (
          /* Other Events */
          <div className="bg-gray-800 rounded-2xl p-8" data-testid="screen-other-events">
            <div className="flex items-center mb-6">
              <div className="w-3 h-3 bg-orange-400 rounded-full mr-3"></div>
              <h2 className="text-3xl font-bold">Sự Kiện Đặc Biệt</h2>
            </div>

            <div className="space-y-4">
              {displayData?.otherEvents?.length ? (
                displayData.otherEvents.map((event) => {
                  const { status, color, textColor } = getScheduleStatus(
                    event.startDateTime,
                    event.endDateTime
                  );
                  
                  return (
                    <div
                      key={event.id}
                      className="bg-orange-900/30 rounded-xl p-6 border-l-4 border-orange-400"
                      data-testid={`event-item-${event.id}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className={`${color} ${textColor} px-3 py-1 rounded-full text-sm font-medium`}>
                          {status}
                        </div>
                        <div className="text-orange-400 text-sm">
                          {format(new Date(event.startDateTime), "dd/MM", { locale: vi })} - {format(new Date(event.endDateTime), "dd/MM", { locale: vi })}
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold mb-2">{event.shortName}</h3>
                      <p className="text-gray-300">{event.content}</p>
                      {event.imageUrl && (
                        <img
                          src={event.imageUrl}
                          alt={event.shortName}
                          className="mt-4 max-h-48 rounded-lg object-cover"
                        />
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-gray-400 py-8" data-testid="no-other-events">
                  Không có sự kiện đặc biệt nào
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer with rotation indicator */}
      <footer className="fixed bottom-0 left-0 right-0 bg-bidv-teal/80 p-4">
        <div className="flex justify-between items-center">
          <div className="flex space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-sm">Đang diễn ra</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span className="text-sm">Sắp diễn ra</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-sm">Đã kết thúc</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-blue-200">
              Màn hình {currentScreen + 1}/3 - Tự động cập nhật mỗi 30 giây
            </span>
            <div className="flex space-x-1">
              {screens.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentScreen ? "bg-white" : "bg-white/30"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
