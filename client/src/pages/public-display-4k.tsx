import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfDay, addDays, eachDayOfInterval } from "date-fns";
import { vi } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import React from "react";

// Hiển thị 4K được tối ưu hóa cho độ phân giải 3840x2160 (TV 65")
const SCREENS = [
  { id: "work-schedule", name: "Kế hoạch công tác" },
  { id: "meeting-schedule", name: "Lịch sử dụng phòng họp" },
  { id: "other-events", name: "Sự kiện khác" },
];

export default function PublicDisplay4K() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentScreenIndex, setCurrentScreenIndex] = useState(0);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(15);
  const [isPaused, setIsPaused] = useState(false);

  // Cập nhật thời gian mỗi giây
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Lấy cấu hình hệ thống để tính khoảng thời gian làm mới và giờ làm việc
  const { data: systemConfig = [] } = useQuery<any[]>({
    queryKey: ["/api/system-config"],
    refetchInterval: 60000,
  });

  // Lấy giờ làm việc từ cấu hình hệ thống
  const workHours = React.useMemo(() => {
    const startConfig = systemConfig.find(
      (config) => config.key === "work_hours.start_time",
    );
    const endConfig = systemConfig.find(
      (config) => config.key === "work_hours.end_time",
    );
    return {
      start: startConfig?.value || "08:00",
      end: endConfig?.value || "17:30",
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
    setCurrentScreenIndex(
      (prev) => (prev - 1 + SCREENS.length) % SCREENS.length,
    );
    setCurrentEventIndex(0);
    setTimeRemaining(getCurrentScreenDuration() / 1000);
  };

  const goToNextScreen = () => {
    setCurrentScreenIndex((prev) => (prev + 1) % SCREENS.length);
    setCurrentEventIndex(0);
    setTimeRemaining(getCurrentScreenDuration() / 1000);
  };

  const toggleAutoRotation = () => {
    setIsPaused((prev) => !prev);
    if (!isPaused) {
      setTimeRemaining(getCurrentScreenDuration() / 1000);
    }
  };

  // Lấy dữ liệu hiển thị
  const { data: displayData } = useQuery<any>({
    queryKey: ["/api/public/display-data"],
    refetchInterval: 4000,
  });

  // Xoay màn hình và đếm ngược
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
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
  }, [currentScreenIndex, currentEventIndex, isPaused, screenDurations, displayData]);

  // Lấy dữ liệu nhân viên
  const { data: staff = [] } = useQuery<any[]>({
    queryKey: ["/api/public/staff"],
    refetchInterval: 30000,
  });

  // Lấy danh sách phòng họp
  const { data: meetingRooms = [] } = useQuery<any[]>({
    queryKey: ["/api/public/meeting-rooms"],
    refetchInterval: 30000,
  });

  // Hàm hỗ trợ phân tích datetime với múi giờ phù hợp
  const parseLocalDateTime = (dateTime: string | Date): Date => {
    if (dateTime instanceof Date) {
      return dateTime;
    }

    // Datetime từ server đã ở UTC, chỉ cần phân tích trực tiếp
    const parsedDate = new Date(dateTime.toString());

    console.log(
      "Original:",
      dateTime.toString(),
      "UTC:",
      parsedDate.toISOString(),
      "Vietnam:",
      parsedDate.toISOString(),
    );

    return parsedDate;
  };

  // Tạo các ngày trong tuần bắt đầu từ thứ Hai
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

  // Sử dụng tuần hiện tại bắt đầu từ hôm nay (chỉ 5 ngày)
  const today = new Date();
  const todayStart = startOfDay(today);
  const endOfWeek = addDays(todayStart, 4); // Chỉ hiển thị 5 ngày

  const weekDays = eachDayOfInterval({
    start: todayStart, // Bắt đầu từ hôm nay, không phải thứ Hai
    end: endOfWeek,
  });

  const getDay = (date: Date) => date.getDay();
  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  // Lấy lịch cho một nhân viên cụ thể trong ngày
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

      return scheduleStart <= endOfDay && scheduleEnd >= startOfDay;
    });
  };

  // Lấy màu cho lịch công tác
  const getWorkScheduleColor = (workType: string) => {
    const colorConfig = systemConfig.find((config) => {
      switch (workType) {
        case "Làm việc tại CN":
          return config.key === "colors.work_at_branch";
        case "Nghỉ phép":
          return config.key === "colors.leave";
        case "Làm việc với BGĐ":
          return config.key === "colors.leadership_duty";
        case "Đi khách hàng":
          return config.key === "colors.customer_visit";
        case "Đi công tác nước ngoài":
          return config.key === "colors.international_business_trip";
        default:
          return config.key === "colors.other";
      }
    });
    return colorConfig ? colorConfig.value : "#9f224e";
  };

  // Bảng Kế hoạch Công tác cho 4K
  const renderWorkScheduleTable4K = () => {
    if (!displayData || !displayData.workSchedules) {
      return (
        <div className="flex items-center justify-center h-full text-4xl text-white">
          Đang tải dữ liệu...
        </div>
      );
    }

    // Điều chỉnh độ rộng cột: nhỏ hơn cho cột cuối tuần, lớn hơn cho cột ngày thường, cột lãnh đạo rộng hơn
    const weekdayCount = weekDays.filter((day) => !isWeekend(day)).length;
    const weekendCount = weekDays.filter((day) => isWeekend(day)).length;

    const gridTemplate = weekDays
      .map((day) => {
        if (isWeekend(day)) {
          return "0.4fr"; // Nhỏ hơn cho cuối tuần (giảm từ 0.8fr)
        } else {
          return "1.6fr"; // Lớn hơn cho ngày thường (tăng từ 1.2fr)
        }
      })
      .join(" ");

    const fullGridTemplate = `500px ${gridTemplate}`; // Cột tên Lãnh đạo rộng 500px để không bị xuống dòng

    return (
      <div
        className="h-full overflow-hidden"
        style={{ fontFamily: "Roboto, sans-serif", backgroundColor: "#f5f0dc" }}
      >
        {/* Tiêu đề */}
        <div
          className="grid border-b-4 border-gray-400 bg-yellow-400"
          style={{ gridTemplateColumns: fullGridTemplate }}
        >
          <div className="p-6 bg-yellow-400 text-black font-bold text-3xl flex items-center justify-center border-r-4 border-gray-400">
            LÃNH ĐẠO
          </div>
          {weekDays.map((day, index) => {
            const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
            const dayName = dayNames[getDay(day)];
            const isWeekendDay = isWeekend(day);
            return (
              <div
                key={index}
                className={`p-4 text-black font-bold text-2xl text-center border-r-4 border-gray-400 ${isWeekendDay ? "bg-gray-300" : "bg-yellow-400"}`}
                style={{ fontFamily: "Roboto, sans-serif" }}
              >
                <div className="font-bold text-[24px]">{dayName}</div>
                <div className="text-2xl font-bold">
                  {format(day, "dd/MM", { locale: vi })}
                </div>
              </div>
            );
          })}
        </div>
        {/* Nội dung với các hàng cho từng nhân viên */}
        <div
          className="overflow-auto"
          style={{ height: "calc(100% - 310px)", backgroundColor: "#f5f0dc" }}
        >
          {staff
            .filter(
              (s) =>
                s.department &&
                s.department.name.toLowerCase().includes("giám đốc"),
            )
            .map((staffMember, rowIndex) => (
              <div
                key={staffMember.id}
                className="grid border-b-2 border-gray-300"
                style={{
                  gridTemplateColumns: fullGridTemplate,
                  minHeight: "180px",
                }}
              >
                {/* Cột Tên Nhân viên */}
                <div
                  className="p-4 text-white font-bold border-r-2 border-gray-300 flex items-center"
                  style={{ backgroundColor: "#f5f0dc" }}
                >
                  <div
                    className="font-bold pl-[0px] pr-[0px] mt-[0px] mb-[0px] pt-[0px] pb-[0px] text-[36px] text-[#791301]"
                    style={{
                      fontFamily: "Roboto, sans-serif",
                      fontWeight: "700",
                    }}
                  >
                    {(staffMember as any).positionShort}. {staffMember.fullName}
                  </div>
                </div>

                {/* Cột Lịch cho từng ngày */}
                {weekDays.map((day, dayIndex) => {
                  const schedules = getSchedulesForStaffAndDay(
                    staffMember.id,
                    day,
                  );
                  const isWeekendDay = isWeekend(day);

                  return (
                    <div
                      key={dayIndex}
                      className="border-r-2 border-gray-300 relative p-2"
                      style={{
                        backgroundColor: isWeekendDay ? "#adacac" : "#f5f4f0",
                        fontFamily: "Roboto, sans-serif",
                      }}
                    >
                      {schedules.length > 0 ? (
                        <div className="space-y-2">
                          {schedules
                            .slice(0, 6)
                            .map((schedule: any, idx: number) => {
                              const isWorkAtBranch =
                                schedule.workType === "Làm việc tại CN";

                              // Tính toán thời gian hiển thị phù hợp cho ngày hiện tại
                              const scheduleStartDate = parseLocalDateTime(schedule.startDateTime);
                              const scheduleEndDate = parseLocalDateTime(schedule.endDateTime);
                              const currentDay = new Date(day);
                              currentDay.setHours(0, 0, 0, 0);
                              
                              const scheduleStartDay = new Date(scheduleStartDate);
                              scheduleStartDay.setHours(0, 0, 0, 0);
                              
                              const scheduleEndDay = new Date(scheduleEndDate);
                              scheduleEndDay.setHours(0, 0, 0, 0);
                              
                              let displayStartTime, displayEndTime;
                              
                              // Nếu ngày hiện tại là ngày bắt đầu lịch
                              if (currentDay.getTime() === scheduleStartDay.getTime()) {
                                displayStartTime = format(scheduleStartDate, "HH:mm");
                              } else {
                                // Ngày giữa hoặc ngày cuối: bắt đầu từ giờ làm việc
                                displayStartTime = workHours.start;
                              }
                              
                              // Nếu ngày hiện tại là ngày kết thúc lịch
                              if (currentDay.getTime() === scheduleEndDay.getTime()) {
                                displayEndTime = format(scheduleEndDate, "HH:mm");
                              } else {
                                // Ngày đầu hoặc ngày giữa: kết thúc vào giờ làm việc
                                displayEndTime = workHours.end;
                              }
                              
                              const isFullDay = displayStartTime === workHours.start && displayEndTime === workHours.end;

                              return (
                                <div
                                  key={schedule.id}
                                  className="text-lg p-2 rounded font-medium"
                                  style={{
                                    backgroundColor: getWorkScheduleColor(
                                      schedule.workType,
                                    ),
                                    fontSize: "26pt",
                                    lineHeight: "1.1",
                                    opacity: 1,
                                    fontFamily: "Roboto, sans-serif",
                                    fontWeight: "400",
                                    whiteSpace: "normal",
                                    wordWrap: "break-word",
                                  }}
                                >
                                  {
                                    <>
                                      {/* Nội dung chính với thời gian hoặc cả ngày */}
                                      <div
                                        className="font-semibold"
                                        style={{
                                          fontFamily: "Roboto, sans-serif",
                                          fontWeight: "400",
                                          fontSize: "28pt",
                                          color: isWorkAtBranch
                                            ? "#260705"
                                            : "#ffffff",
                                        }}
                                      >
                                        {schedule.workType === "Khác" &&
                                        schedule.customContent
                                          ? schedule.customContent
                                          : schedule.workType ===
                                              "Đi công tác nước ngoài"
                                            ? "Đi công tác NN"
                                            : schedule.workType}
                                        {isFullDay
                                          ? " - (Cả ngày)"
                                          : ` - (${displayStartTime} – ${displayEndTime})`}
                                      </div>
                                      {/* Nội dung bổ sung */}
                                      {schedule.workType !== "Khác" &&
                                        schedule.customContent && (
                                          <div
                                            className="opacity-90"
                                            style={{
                                              fontFamily: "Roboto, sans-serif",
                                              fontSize: "28pt",
                                              color: isWorkAtBranch
                                                ? "#260705"
                                                : "#ffffff",
                                            }}
                                          >
                                            {schedule.customContent}
                                          </div>
                                        )}
                                    </>
                                  }
                                </div>
                              );
                            })}
                          {schedules.length > 6 && (
                            <div
                              className="text-center"
                              style={{
                                fontFamily: "Roboto, sans-serif",
                                fontSize: "30pt",
                                color: "#d1d5db",
                              }}
                            >
                              +{schedules.length - 6} more
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
        {/* Chú thích Màu cho 4K - giống như hiển thị tiêu chuẩn */}
        <div
          className="p-8"
          style={{
            fontFamily: "Roboto, sans-serif",
            backgroundColor: "#f5f0dc",
            marginTop: "20px",
            marginBottom: "20px",
          }}
        >
          <div
            className="text-2xl font-bold mb-3 text-center"
            style={{
              fontFamily: "Roboto, sans-serif",
              fontWeight: "700",
              color: "#260705",
              fontSize: "30pt",
            }}
          >
            GHI CHÚ
          </div>
          <div
            className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-xl"
            style={{ fontFamily: "Roboto, sans-serif" }}
          >
            <div className="flex items-center">
              <div
                className="w-10 h-10 rounded mr-4"
                style={{
                  backgroundColor: getWorkScheduleColor("Làm việc tại CN"),
                }}
              ></div>
              <span
                className="text-xl"
                style={{
                  fontFamily: "Roboto, sans-serif",
                  color: "#260705",
                  fontSize: "26pt",
                }}
              >
                Làm việc tại CN
              </span>
            </div>
            <div className="flex items-center">
              <div
                className="w-10 h-10 rounded mr-4"
                style={{ backgroundColor: getWorkScheduleColor("Nghỉ phép") }}
              ></div>
              <span
                className="text-xl"
                style={{
                  fontFamily: "Roboto, sans-serif",
                  color: "#260705",
                  fontSize: "26pt",
                }}
              >
                Nghỉ phép
              </span>
            </div>
            <div className="flex items-center">
              <div
                className="w-10 h-10 rounded mr-4"
                style={{
                  backgroundColor: getWorkScheduleColor("Trực Lãnh đạo"),
                }}
              ></div>
              <span
                className="text-xl"
                style={{
                  fontFamily: "Roboto, sans-serif",
                  color: "#260705",
                  fontSize: "26pt",
                }}
              >
                Trực Lãnh đạo
              </span>
            </div>
            <div className="flex items-center">
              <div
                className="w-10 h-10 rounded mr-4"
                style={{
                  backgroundColor: getWorkScheduleColor("Đi khách hàng"),
                }}
              ></div>
              <span
                className="text-xl"
                style={{
                  fontFamily: "Roboto, sans-serif",
                  color: "#260705",
                  fontSize: "26pt",
                }}
              >
                Đi khách hàng
              </span>
            </div>
            <div className="flex items-center">
              <div
                className="w-10 h-10 rounded mr-4"
                style={{
                  backgroundColor: getWorkScheduleColor(
                    "Đi công tác nước ngoài",
                  ),
                }}
              ></div>
              <span
                className="text-xl"
                style={{
                  fontFamily: "Roboto, sans-serif",
                  color: "#260705",
                  fontSize: "26pt",
                }}
              >
                Công tác NN
              </span>
            </div>
            <div className="flex items-center">
              <div
                className="w-10 h-10 rounded mr-4"
                style={{ backgroundColor: getWorkScheduleColor("Khác") }}
              ></div>
              <span
                className="text-xl"
                style={{
                  fontFamily: "Roboto, sans-serif",
                  color: "#260705",
                  fontSize: "26pt",
                }}
              >
                Khác
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Bảng Lịch Họp cho 4K - khớp với bố cục hiển thị tiêu chuẩn
  const renderMeetingScheduleTable4K = () => {
    // Debug log để kiểm tra dữ liệu
    console.log("4K Meeting Schedules Debug:", {
      hasDisplayData: !!displayData,
      meetingSchedulesCount: displayData?.meetingSchedules?.length || 0,
      sampleMeeting: displayData?.meetingSchedules?.[0] || null,
      meetingRoomsCount: meetingRooms?.length || 0,
    });

    if (!displayData?.meetingSchedules) {
      return (
        <div className="flex items-center justify-center h-full text-4xl text-white">
          Không có dữ liệu lịch họp
        </div>
      );
    }

    // Tạo các ngày trong tuần cho tiêu đề bảng (hoàn toàn giống như hiển thị tiêu chuẩn)
    const today = new Date();
    const todayStart = startOfDay(today);

    // Hiển thị 5 ngày bắt đầu từ hôm nay (giảm từ 7 ngày)
    const endOfWeek = addDays(todayStart, 4);

    const weekDays = eachDayOfInterval({
      start: todayStart, // Bắt đầu từ hôm nay, không phải thứ Hai
      end: endOfWeek,
    });

    const getDay = (date: Date) => date.getDay();

    // Lấy tất cả phòng họp (giống như hiển thị tiêu chuẩn)
    const rooms = meetingRooms || [];

    // Lấy các cuộc họp cho tuần hiện tại (bao gồm các cuộc họp chồng lấp với tuần hiện tại) - logic giống như tiêu chuẩn
    const weekMeetings = (displayData?.meetingSchedules || []).filter(
      (meeting: any) => {
        // Sử dụng ngày UTC để tính toán ngày họp (không phải thời gian Việt Nam) - hoàn toàn giống như tiêu chuẩn
        const utcStartTime = new Date(meeting.startDateTime);
        const utcEndTime = new Date(meeting.endDateTime);

        // Lấy ngày UTC bằng cách sử dụng các thành phần UTC (không phải múi giờ địa phương) - hoàn toàn giống như tiêu chuẩn
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

        // Bao gồm cuộc họp nếu nó chồng lấp với tuần hiện tại - hoàn toàn giống như tiêu chuẩn
        // Cuộc họp chồng lấp nếu: cuộc họp bắt đầu trước hoặc vào cuối tuần VÀ cuộc họp kết thúc sau hoặc vào đầu tuần
        return (
          meetingStartDate <= weekEndDate && meetingEndDate >= weekStartDate
        );
      },
    );

    // Nhóm các cuộc họp theo phòng và ngày - logic hoàn toàn giống như tiêu chuẩn
    const meetingsByRoomAndDate: Record<string, Record<string, any[]>> = {};
    rooms.forEach((room) => {
      meetingsByRoomAndDate[room.id] = {};
      weekDays.forEach((day) => {
        const dateKey = format(day, "yyyy-MM-dd");
        meetingsByRoomAndDate[room.id][dateKey] = [];
      });
    });

    weekMeetings.forEach((meeting: any) => {
      // Debug log để kiểm tra từng meeting
      console.log("Processing meeting:", {
        id: meeting.id,
        content: meeting.meetingContent,
        roomId: meeting.roomId,
        startDateTime: meeting.startDateTime,
        endDateTime: meeting.endDateTime,
      });

      // Sử dụng ngày UTC để nhóm cuộc họp - hoàn toàn giống như tiêu chuẩn
      const utcStartTime = new Date(meeting.startDateTime);
      const utcEndTime = new Date(meeting.endDateTime);

      // Lấy ngày UTC bằng cách sử dụng các thành phần UTC (không phải múi giờ địa phương) - hoàn toàn giống như tiêu chuẩn
      const startYear = utcStartTime.getUTCFullYear();
      const startMonth = utcStartTime.getUTCMonth();
      const startDay = utcStartTime.getUTCDate();
      const meetingStart = new Date(startYear, startMonth, startDay);

      const endYear = utcEndTime.getUTCFullYear();
      const endMonth = utcEndTime.getUTCMonth();
      const endDay = utcEndTime.getUTCDate();
      const meetingEnd = new Date(endYear, endMonth, endDay);

      // Đối với các cuộc họp nhiều ngày, thêm vào mỗi ngày - hoàn toàn giống như tiêu chuẩn
      const startDate = meetingStart;
      const endDate = meetingEnd;

      for (
        let currentDate = new Date(startDate);
        currentDate <= endDate;
        currentDate.setDate(currentDate.getDate() + 1)
      ) {
        const dateKey = format(currentDate, "yyyy-MM-dd");

        // Kiểm tra xem ngày này có nằm trong phạm vi hiển thị tuần của chúng ta không
        const isWithinWeek = weekDays.some(
          (day) => format(day, "yyyy-MM-dd") === dateKey,
        );

        console.log("Meeting room assignment:", {
          meetingId: meeting.id,
          roomId: meeting.roomId,
          dateKey,
          isWithinWeek,
          hasRoomInMap: !!meetingsByRoomAndDate[meeting.roomId],
        });

        if (isWithinWeek && meetingsByRoomAndDate[meeting.roomId]) {
          meetingsByRoomAndDate[meeting.roomId][dateKey].push(meeting);
        }
      }
    });

    // Hàm hỗ trợ lấy các cuộc họp cho một phòng và ngày cụ thể - hoàn toàn giống như tiêu chuẩn
    const getMeetingsForRoomAndDay = (roomId: string, day: Date) => {
      const dateKey = format(day, "yyyy-MM-dd");
      return meetingsByRoomAndDate[roomId]?.[dateKey] || [];
    };

    return (
      <div
        className="h-full overflow-hidden relative flex flex-col"
        style={{ fontFamily: "Roboto, sans-serif" }}
      >
        {/* Bảng Lịch Họp */}
        <div className="bg-white overflow-hidden flex-1">
          <table
            style={{
              width: "100%",
              height: "100%",
              borderCollapse: "collapse",
              tableLayout: "fixed",
              border: "3px solid rgb(230 205 168)",
            }}
          >
            <colgroup>
              <col style={{ width: "420px" }} /> {/* Rộng hơn cho 4K */}
              {weekDays.map((day, index) => {
                const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                return (
                  <col
                    key={index}
                    style={{
                      width: isWeekend
                        ? "400px" // Fix độ rộng 400px cho T7,CN
                        : "calc((100% - 420px - 800px) / 5)", // Cột ngày thường = (100% - 420px - 800px) / 5 (chia đều sau khi trừ cột cuối tuần)
                    }}
                  />
                );
              })}
            </colgroup>
            <thead
              style={{
                height: "45px",
                borderBottom: "2px solid rgb(230 205 168)",
              }}
            >
              {/* Chiều cao được tối ưu cho 4K */}
              <tr
                className="bg-orange-600"
                style={{
                  height: "40px",
                  borderBottom: "3px solid rgb(230 205 168)",
                }}
              >
                <th
                  className="text-white font-bold text-center"
                  style={{
                    fontSize: "22pt",
                    fontWeight: "700",
                    padding: "6px",
                    borderRight: "3px solid rgb(230 205 168)",
                    verticalAlign: "middle",
                  }}
                >
                  Phòng họp/ Ngày
                </th>
                {weekDays.map((day, index) => {
                  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
                  const dayName = dayNames[getDay(day)];
                  const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                  const isLastColumn = index === weekDays.length - 1;

                  return (
                    <th
                      key={index}
                      className="text-white font-bold text-center"
                      style={{
                        fontSize: "22pt",
                        fontWeight: "700",
                        padding: "6px",
                        borderRight: isLastColumn
                          ? "none"
                          : "3px solid rgb(230 205 168)",
                        verticalAlign: "middle",
                        backgroundColor: isWeekend ? "#adacac" : "inherit",
                      }}
                    >
                      <div>{dayName}</div>
                      <div style={{ fontSize: "20pt", fontWeight: "400" }}>
                        {format(day, "dd/MM", { locale: vi })}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody style={{ height: "calc(100% - 35px)" }}>
              {rooms.slice(0, 10).map(
                (
                  room: any,
                  roomIndex: number, // Giới hạn 10 phòng cho 4K
                ) => (
                  <tr
                    key={room.id}
                    style={{
                      borderBottom: "3px solid rgb(230 205 168)",
                      height: `calc((100vh - 320px) / ${Math.min(rooms.length, 10)})`,
                      minHeight: "60px",
                      maxHeight: "80px",
                    }}
                  >
                    {/* Cột Tên Phòng */}
                    <td
                      className="text-white font-bold"
                      style={{
                        backgroundColor: "#f5f0dc",
                        padding: "16px",
                        borderRight: "3px solid rgb(230 205 168)",
                        verticalAlign: "middle",
                        height: "100%",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "26pt",
                          fontWeight: "700",
                          textAlign: "center",
                          lineHeight: "1.2",
                          wordWrap: "break-word",
                        }}
                        className="text-[#791301] text-[24px]"
                      >
                        {room.name}
                      </div>
                    </td>
                    {/* Cột cuộc họp cho mỗi ngày */}
                    {weekDays.map((day, dayIndex) => {
                      const dayMeetings = getMeetingsForRoomAndDay(
                        room.id,
                        day,
                      );
                      const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                      const isLastColumn = dayIndex === weekDays.length - 1;

                      return (
                        <td
                          key={dayIndex}
                          style={{
                            padding: "12px",
                            borderRight: isLastColumn
                              ? "none"
                              : "3px solid rgb(230 205 168)",
                            backgroundColor: isWeekend ? "#adacac" : "#f5f4f0",
                            verticalAlign: "top",
                            overflow: "hidden",
                          }}
                        >
                          {dayMeetings.map(
                            (meeting: any, meetingIndex: number) => {
                              // Tính toán hiển thị thời gian (logic giống như tiêu chuẩn)
                              const utcStartTime = new Date(
                                meeting.startDateTime,
                              );
                              const utcEndTime = new Date(meeting.endDateTime);

                              const meetingStartDate = `${utcStartTime.getUTCFullYear()}-${String(utcStartTime.getUTCMonth() + 1).padStart(2, "0")}-${String(utcStartTime.getUTCDate()).padStart(2, "0")}`;
                              const meetingEndDate = `${utcEndTime.getUTCFullYear()}-${String(utcEndTime.getUTCMonth() + 1).padStart(2, "0")}-${String(utcEndTime.getUTCDate()).padStart(2, "0")}`;
                              const currentDayDate = format(day, "yyyy-MM-dd");

                              let displayStartTime, displayEndTime;
                              if (meetingStartDate === currentDayDate) {
                                displayStartTime = `${String(utcStartTime.getUTCHours()).padStart(2, "0")}:${String(utcStartTime.getUTCMinutes()).padStart(2, "0")}`;
                              } else {
                                displayStartTime = "00:00";
                              }

                              if (meetingEndDate === currentDayDate) {
                                displayEndTime = `${String(utcEndTime.getUTCHours()).padStart(2, "0")}:${String(utcEndTime.getUTCMinutes()).padStart(2, "0")}`;
                              } else {
                                displayEndTime = "23:59";
                              }

                              const timeRange = `${displayStartTime} - ${displayEndTime}`;

                              return (
                                <div
                                  key={meetingIndex}
                                  className="mb-3"
                                  style={{
                                    padding: "0",
                                    lineHeight: "1.3",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: "26pt", // Adjusted for 4K
                                      fontWeight: "500",
                                      lineHeight: "1.3",
                                      marginBottom: "6px",
                                    }}
                                  >
                                    <div
                                      style={{
                                        color: "#9f224e",
                                        fontWeight: "700",
                                        fontSize: "26pt",
                                        marginBottom: "4px",
                                      }}
                                    >
                                      {timeRange}
                                    </div>
                                    <div
                                      style={{
                                        color: "#006b68",
                                        fontWeight: "500",
                                        fontSize: "26pt",
                                        lineHeight: "1.1",
                                        wordWrap: "break-word",
                                        whiteSpace: "normal",
                                      }}
                                    >
                                      {meeting.meetingContent}
                                    </div>
                                  </div>
                                </div>
                              );
                            },
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Utility function để tạo URL ảnh đúng cách cho production và development
  const createImageUrl = (path: string) => {
    if (!path) return '';
    
    // Nếu đã là URL đầy đủ, return ngay
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    // Đảm bảo path bắt đầu với /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    // Encode các ký tự đặc biệt nhưng giữ nguyên /
    const encodedPath = normalizedPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
    
    // Tạo full URL
    const fullUrl = `${window.location.origin}${encodedPath}`;
    
    console.log('createImageUrl:', { 
      originalPath: path, 
      normalizedPath, 
      encodedPath, 
      fullUrl,
      environment: process.env.NODE_ENV 
    });
    
    return fullUrl;
  };

  // Component đơn giản để hiển thị ảnh sự kiện
  const SimpleImageLayout4K = ({ images }: { images: string[] }) => {
    if (images.length === 1) {
      // Một ảnh - toàn màn hình
      const imgSrc = createImageUrl(images[0]);
      return (
        <div className="w-full h-full flex items-center justify-center p-8">
          <img
            src={imgSrc}
            alt="Ảnh sự kiện"
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              borderRadius: "12px",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
            }}
            onLoad={() => console.log("4K Single image loaded successfully:", imgSrc)}
            onError={(e) => {
              console.error("4K Single image failed to load:", imgSrc);
              console.error("4K Error details:", e);
            }}
          />
        </div>
      );
    }

    if (images.length === 2) {
      // Hai ảnh - cạnh nhau
      return (
        <div className="w-full h-full flex gap-8 p-8">
          {images.map((src, index) => {
            const imageUrl = createImageUrl(src);
            
            return (
              <div key={index} className="flex-1 h-full">
                <img
                  src={imageUrl}
                  alt={`Ảnh sự kiện ${index + 1}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    borderRadius: "12px",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
                  }}
                  onLoad={() => console.log(`4K Image ${index + 1} loaded successfully: ${imageUrl}`)}
                  onError={(e) => {
                    console.error(`4K Failed to load image ${index + 1}: ${imageUrl}`, e);
                  }}
                />
              </div>
            );
          })}
        </div>
      );
    }

    if (images.length === 3) {
      // Ba ảnh - 2 trên, 1 dưới giữa
      return (
        <div className="w-full h-full flex flex-col gap-8 p-8">
          <div className="flex gap-8 h-1/2">
            {images.slice(0, 2).map((src, index) => (
              <div key={index} className="flex-1 h-full">
                <img
                  src={
                    src.startsWith("/")
                      ? `${window.location.origin}${src}`
                      : src
                  }
                  alt={`Ảnh sự kiện ${index + 1}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    borderRadius: "12px",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
                  }}
                />
              </div>
            ))}
          </div>
          <div className="h-1/2 flex justify-center">
            <div className="w-1/2 h-full">
              <img
                src={
                  images[2].startsWith("/")
                    ? `${window.location.origin}${images[2]}`
                    : images[2]
                }
                alt="Ảnh sự kiện 3"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  borderRadius: "12px",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
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
        <div className="w-full h-full flex flex-col gap-8 p-8">
          <div className="flex gap-8 h-1/2">
            {images.slice(0, 2).map((src, index) => (
              <div key={index} className="flex-1 h-full">
                <img
                  src={
                    src.startsWith("/")
                      ? `${window.location.origin}${src}`
                      : src
                  }
                  alt={`Ảnh sự kiện ${index + 1}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    borderRadius: "12px",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-8 h-1/2">
            {images.slice(2, 4).map((src, index) => (
              <div key={index + 2} className="flex-1 h-full">
                <img
                  src={
                    src.startsWith("/")
                      ? `${window.location.origin}${src}`
                      : src
                  }
                  alt={`Ảnh sự kiện ${index + 3}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    borderRadius: "12px",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
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

  // Hiển thị Sự kiện Khác cho 4K - với bố cục ảnh linh hoạt
  const renderOtherEventsDisplay4K = () => {
    // Lọc để hiển thị các sự kiện đang diễn ra HOẶC sự kiện bắt đầu trong vòng 30 ngày tới (giống như tiêu chuẩn)
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

    // Chỉ hiển thị sự kiện hiện tại dựa trên currentEventIndex (giống như tiêu chuẩn)
    const currentEvent = relevantEvents[currentEventIndex];

    // Debug thời gian hiển thị sự kiện
    console.log("4K Display - Other Events Info:", {
      relevantEventsCount: relevantEvents.length,
      currentEventIndex,
      currentEvent: currentEvent
        ? {
            id: currentEvent.id,
            shortName: currentEvent.shortName.substring(0, 50) + "...",
            startTime: currentEvent.startDateTime,
            endTime: currentEvent.endDateTime,
          }
        : null,
      screenDuration: "Full screen rotation time",
      currentTime: now.toISOString(),
    });

    return (
      <div
        className="bg-white rounded-lg overflow-hidden shadow-lg h-full"
        style={{ fontFamily: "Roboto, sans-serif" }}
      >
        {currentEvent ? (
          <div className="h-full flex flex-col justify-center">
            {/* Hiển thị ảnh linh hoạt dựa trên số lượng ảnh */}
            <div
              className="text-center h-full flex items-center justify-center"
              style={{ fontFamily: "Roboto, sans-serif" }}
            >
              <EventDisplay4K currentEvent={currentEvent} />
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div
              className="text-gray-500 text-4xl text-center"
              style={{ fontFamily: "Roboto, sans-serif" }}
            >
              Hiện tại không có sự kiện nào đang diễn ra
            </div>
          </div>
        )}
      </div>
    );
  };

  // Component hiển thị sự kiện riêng biệt để tránh re-render
  const EventDisplay4K = React.memo(
    ({ currentEvent }: { currentEvent: any }) => {
      // Lấy tất cả ảnh có sẵn (mảng imageUrls hoặc dự phòng imageUrl đơn lẻ)
      const images = React.useMemo(() => {
        console.log("4K EventDisplay - Processing event:", {
          eventId: currentEvent.id,
          shortName: currentEvent.shortName?.substring(0, 50) + "...",
          imageUrls: currentEvent.imageUrls,
          imageUrl: currentEvent.imageUrl,
          hasImageUrls: !!currentEvent.imageUrls,
          imageUrlsLength: currentEvent.imageUrls?.length || 0
        });

        const finalImages = currentEvent.imageUrls && currentEvent.imageUrls.length > 0
          ? currentEvent.imageUrls.filter(Boolean)
          : currentEvent.imageUrl
            ? [currentEvent.imageUrl]
            : [];

        console.log("4K EventDisplay - Final images array:", finalImages);
        return finalImages;
      }, [currentEvent.imageUrls, currentEvent.imageUrl]);

      if (images.length > 0) {
        return <SimpleImageLayout4K images={images} />;
      } else {
        return (
          <div className="w-full h-full flex flex-col items-center justify-center p-12">
            <div className="text-center" style={{ color: "#f5f0dc" }}>
              <h2
                className="text-6xl font-bold mb-8"
                style={{
                  fontFamily: "Roboto, sans-serif",
                  fontWeight: "700",
                }}
              >
                {currentEvent.shortName}
              </h2>
              <p
                className="text-4xl leading-relaxed"
                style={{ fontFamily: "Roboto, sans-serif" }}
              >
                {currentEvent.content || "Không có nội dung"}
              </p>
            </div>
          </div>
        );
      }
    },
  );

  const currentScreen = SCREENS[currentScreenIndex];

  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col"
      style={{
        width: "100vw",
        height: "100vh",
        background: `linear-gradient(to bottom right, #f5f0dc, #1a0504)`,
      }}
    >
      {/* Header with BIDV branding - matching standard display colors */}
      <div
        className="public-display-header text-center py-6 relative"
        style={{ fontFamily: "Roboto, sans-serif", backgroundColor: "#f5f0dc" }}
      >
        <div
          className="font-bold text-[42px] text-[#791301]"
          style={{ fontFamily: "Roboto, sans-serif", fontWeight: "700" }}
        >
          NGÂN HÀNG TMCP ĐẦU TƯ VÀ PHÁT TRIỂN VIỆT NAM
        </div>
        <div
          className="text-center font-bold text-[42px] text-[#791301]"
          style={{ fontFamily: "Roboto, sans-serif", fontWeight: "600" }}
        >
          CHI NHÁNH SỞ GIAO DỊCH 1
        </div>
        <div
          className="font-bold mt-4 text-6xl text-[#421001]"
          style={{ fontFamily: "Roboto, sans-serif", fontWeight: "700" }}
        >
          {(() => {
            if (
              currentScreen.id === "other-events" &&
              displayData?.otherEvents
            ) {
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
                className={`${isPaused ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"} text-white p-3 rounded-full transition-colors duration-200 shadow-lg`}
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
              <div className="text-sm">{timeRemaining}s</div>
            </div>
          </div>

          {/* Current time display */}
          <div className="bg-black bg-opacity-50 text-white px-6 py-4 rounded-lg text-right">
            <div className="text-2xl font-bold">
              {format(currentTime, "HH:mm:ss")}
            </div>
            <div className="text-lg">
              {format(currentTime, "dd/MM/yyyy", { locale: vi })}
            </div>
            <div className="text-sm">
              {format(currentTime, "EEEE", { locale: vi })}
            </div>
          </div>
        </div>
      </div>
      {/* Main content area */}
      <div
        className="flex-1"
        style={{
          height:
            currentScreen.id === "meeting-schedule"
              ? "calc(100vh - 210px)"
              : "calc(100vh - 200px)",
          minHeight: 0,
        }}
      >
        {currentScreen.id === "work-schedule" && renderWorkScheduleTable4K()}
        {currentScreen.id === "meeting-schedule" &&
          renderMeetingScheduleTable4K()}
        {currentScreen.id === "other-events" && renderOtherEventsDisplay4K()}
      </div>

      {/* Footer chỉ hiển thị cho meeting schedule - màu và chiều cao rõ ràng hơn */}
      {currentScreen.id === "meeting-schedule" && (
        <div
          style={{
            height: "10px",
            backgroundColor: "#F5F0DC",
            width: "100%",
            flexShrink: 0,
            minHeight: "10px",
            borderTop: "1px solid #ccc",
            position: "relative",
            zIndex: 10,
          }}
        />
      )}
    </div>
  );
}
