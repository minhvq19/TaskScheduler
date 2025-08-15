import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfDay, addDays, eachDayOfInterval } from "date-fns";
import { vi } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import React from "react";

// Event Image with fallback component for error handling
const EventImageWithFallback = ({
  src,
  alt,
  event,
  additionalClassName = "",
  style,
}: {
  src: string;
  alt: string;
  event: any;
  additionalClassName?: string;
  style?: React.CSSProperties;
}) => {
  const [hasError, setHasError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 3;

  const imageUrl = src.startsWith("/")
    ? `${window.location.origin}${src}`
    : src;

  const handleError = () => {
    console.error("Image failed to load:", src);
    console.error("Attempted URL:", imageUrl);
    console.error("Current event data:", event);

    if (attempts < maxAttempts) {
      // Retry loading the image with a delay
      setTimeout(
        () => {
          setAttempts((prev) => prev + 1);
        },
        1000 * (attempts + 1),
      ); // Increasing delay
    } else {
      setHasError(true);
    }
  };

  if (hasError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-12 bg-gray-100 rounded-lg">
        <div className="text-center text-teal-800">
          <div
            className="text-red-600 mb-6 text-3xl"
            style={{ fontFamily: "Roboto, sans-serif" }}
          >
            🖼️ Không thể tải ảnh
          </div>
          <p
            className="text-3xl leading-relaxed"
            style={{ fontFamily: "Roboto, sans-serif" }}
          >
            {event.content || event.shortName}
          </p>
        </div>
      </div>
    );
  }

  return (
    <img
      key={attempts} // Force re-render on retry
      src={`${imageUrl}?v=${Date.now()}&retry=${attempts}`}
      alt={alt}
      className={`object-contain rounded-lg shadow-lg ${additionalClassName}`}
      style={{
        width: "100%",
        height: "100%",
        maxWidth: "100%",
        maxHeight: "100%",
        objectFit: "contain",
        ...style,
      }}
      onError={handleError}
      onLoad={() => {
        console.log("Image loaded successfully:", src);
        setHasError(false);
      }}
    />
  );
};

// 4K Display optimized for 3840x2160 resolution (65" TV)
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

  // Get screen duration from config, default to 15 seconds
  const screenDurationMs = React.useMemo(() => {
    const refreshConfig = systemConfig.find(
      (config) => config.key === "display.refresh_interval",
    );
    return refreshConfig ? parseInt(refreshConfig.value) * 1000 : 15000;
  }, [systemConfig]);

  // Manual navigation functions
  const goToPreviousScreen = () => {
    setCurrentScreenIndex(
      (prev) => (prev - 1 + SCREENS.length) % SCREENS.length,
    );
    setCurrentEventIndex(0);
    setTimeRemaining(screenDurationMs / 1000);
  };

  const goToNextScreen = () => {
    setCurrentScreenIndex((prev) => (prev + 1) % SCREENS.length);
    setCurrentEventIndex(0);
    setTimeRemaining(screenDurationMs / 1000);
  };

  const toggleAutoRotation = () => {
    setIsPaused((prev) => !prev);
    if (!isPaused) {
      setTimeRemaining(screenDurationMs / 1000);
    }
  };

  // Screen rotation and countdown
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          const currentScreen = SCREENS[currentScreenIndex];

          // Change screen - each screen shows for full duration regardless of content
          setCurrentScreenIndex((prev) => {
            const nextScreenIndex = (prev + 1) % SCREENS.length;
            const nextScreen = SCREENS[nextScreenIndex];

            // When moving to 'other-events' screen, set to next event in rotation
            if (
              nextScreen.id === "other-events" &&
              displayData &&
              displayData.otherEvents
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

              if (relevantEvents.length > 0) {
                const nextEventIndex =
                  (currentEventIndex + 1) % relevantEvents.length;
                setCurrentEventIndex(nextEventIndex);
              } else {
                setCurrentEventIndex(0);
              }
            } else {
              setCurrentEventIndex(0);
            }

            return nextScreenIndex;
          });
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

  // Use current week starting from today (5 days only)
  const today = new Date();
  const todayStart = startOfDay(today);
  const endOfWeek = addDays(todayStart, 4); // Show only 5 days

  const weekDays = eachDayOfInterval({
    start: todayStart, // Start from today, not Monday
    end: endOfWeek,
  });

  const getDay = (date: Date) => date.getDay();
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

      return scheduleStart <= endOfDay && scheduleEnd >= startOfDay;
    });
  };

  // Get work schedule color
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

  // Work Schedule Table for 4K
  const renderWorkScheduleTable4K = () => {
    if (!displayData || !displayData.workSchedules) {
      return (
        <div className="flex items-center justify-center h-full text-4xl text-white">
          Đang tải dữ liệu...
        </div>
      );
    }

    // Adjust column widths: smaller for weekend columns, larger for weekday columns, wider leadership column
    const weekdayCount = weekDays.filter((day) => !isWeekend(day)).length;
    const weekendCount = weekDays.filter((day) => isWeekend(day)).length;

    const gridTemplate = weekDays
      .map((day) => {
        if (isWeekend(day)) {
          return "0.6fr"; // Smaller for weekend (reduced from 0.8fr)
        } else {
          return "1.4fr"; // Larger for weekday (increased from 1.2fr)
        }
      })
      .join(" ");

    const fullGridTemplate = `400px ${gridTemplate}`; // Increased from 300px to 400px

    return (
      <div
        className="h-full overflow-hidden"
        style={{ fontFamily: "Roboto, sans-serif", backgroundColor: "#f5f0dc" }}
      >
        {/* Header */}
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
        {/* Body with rows for each staff member */}
        <div
          className="overflow-auto"
          style={{ height: "calc(100% - 300px)", backgroundColor: "#f5f0dc" }}
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
                {/* Staff Name Column */}
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

                {/* Schedule Columns for each day */}
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
                        backgroundColor: isWeekendDay ? "#adacac" : "white",
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

                              // Check if this is a full day schedule using system work hours
                              const startTime = format(
                                parseLocalDateTime(schedule.startDateTime),
                                "HH:mm",
                              );
                              const endTime = format(
                                parseLocalDateTime(schedule.endDateTime),
                                "HH:mm",
                              );
                              const isFullDay =
                                startTime === workHours.start &&
                                endTime === workHours.end;

                              return (
                                <div
                                  key={schedule.id}
                                  className="text-lg p-2 rounded font-medium"
                                  style={{
                                    backgroundColor: isWorkAtBranch
                                      ? "transparent"
                                      : getWorkScheduleColor(schedule.workType),
                                    fontSize: "30pt",
                                    lineHeight: "1.4",
                                    opacity: isWorkAtBranch ? 0 : 1,
                                    fontFamily: "Roboto, sans-serif",
                                    fontWeight: "600",
                                    whiteSpace: "normal",
                                    wordWrap: "break-word",
                                  }}
                                >
                                  {!isWorkAtBranch && (
                                    <>
                                      {/* Main content with time or full day */}
                                      <div
                                        className="font-semibold text-[#ffffff]"
                                        style={{
                                          fontFamily: "Roboto, sans-serif",
                                          fontWeight: "700",
                                          fontSize: "30pt",
                                          color: "#ffffff",
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
                                          : ` - (${format(parseLocalDateTime(schedule.startDateTime), "HH:mm", { locale: vi })} – ${format(parseLocalDateTime(schedule.endDateTime), "HH:mm", { locale: vi })})`}
                                      </div>
                                      {/* Additional content */}
                                      {schedule.workType !== "Khác" &&
                                        schedule.customContent && (
                                          <div
                                            className="opacity-90"
                                            style={{
                                              fontFamily: "Roboto, sans-serif",
                                              fontSize: "30pt",
                                              color: "#ffffff",
                                            }}
                                          >
                                            {schedule.customContent}
                                          </div>
                                        )}
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          {schedules.filter(
                            (s: any) => s.workType !== "Làm việc tại CN",
                          ).length > 6 && (
                            <div
                              className="text-center"
                              style={{
                                fontFamily: "Roboto, sans-serif",
                                fontSize: "30pt",
                                color: "#d1d5db",
                              }}
                            >
                              +
                              {schedules.filter(
                                (s: any) => s.workType !== "Làm việc tại CN",
                              ).length - 6}{" "}
                              more
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
        {/* Color Legend for 4K - same as standard display */}
        <div
          className="p-8 border-t border-gray-300"
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
                  backgroundColor: getWorkScheduleColor("Trực lãnh đạo"),
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

  // Meeting Schedule Table for 4K - matching standard display layout
  const renderMeetingScheduleTable4K = () => {
    if (!displayData?.meetingSchedules) {
      return (
        <div className="flex items-center justify-center h-full text-4xl text-white">
          Không có dữ liệu lịch họp
        </div>
      );
    }

    // Generate week days for table headers (exactly same as standard display)
    const today = new Date();
    const todayStart = startOfDay(today);

    // Show 5 days starting from today (reduced from 7 days)
    const endOfWeek = addDays(todayStart, 4);

    const weekDays = eachDayOfInterval({
      start: todayStart, // Start from today, not Monday
      end: endOfWeek,
    });

    const getDay = (date: Date) => date.getDay();

    // Get all meeting rooms (same as standard display)
    const rooms = meetingRooms || [];

    // Get meetings for current week (include meetings that overlap with current week) - same logic as standard
    const weekMeetings = (displayData?.meetingSchedules || []).filter(
      (meeting: any) => {
        // Use UTC date for meeting date calculation (not Vietnam time) - exact same as standard
        const utcStartTime = new Date(meeting.startDateTime);
        const utcEndTime = new Date(meeting.endDateTime);

        // Get the UTC date by using the UTC components (not local timezone) - exact same as standard
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

        // Include meeting if it overlaps with current week - exact same as standard
        // Meeting overlaps if: meeting starts before or on week end AND meeting ends after or on week start
        return (
          meetingStartDate <= weekEndDate && meetingEndDate >= weekStartDate
        );
      },
    );

    // Group meetings by room and date - exact same logic as standard
    const meetingsByRoomAndDate: Record<string, Record<string, any[]>> = {};
    rooms.forEach((room) => {
      meetingsByRoomAndDate[room.id] = {};
      weekDays.forEach((day) => {
        const dateKey = format(day, "yyyy-MM-dd");
        meetingsByRoomAndDate[room.id][dateKey] = [];
      });
    });

    weekMeetings.forEach((meeting: any) => {
      // Use UTC date for meeting grouping - exact same as standard
      const utcStartTime = new Date(meeting.startDateTime);
      const utcEndTime = new Date(meeting.endDateTime);

      // Get the UTC date by using the UTC components (not local timezone) - exact same as standard
      const startYear = utcStartTime.getUTCFullYear();
      const startMonth = utcStartTime.getUTCMonth();
      const startDay = utcStartTime.getUTCDate();
      const meetingStart = new Date(startYear, startMonth, startDay);

      const endYear = utcEndTime.getUTCFullYear();
      const endMonth = utcEndTime.getUTCMonth();
      const endDay = utcEndTime.getUTCDate();
      const meetingEnd = new Date(endYear, endMonth, endDay);

      // For multi-day meetings, add to each day - exact same as standard
      const startDate = meetingStart;
      const endDate = meetingEnd;

      for (
        let currentDate = new Date(startDate);
        currentDate <= endDate;
        currentDate.setDate(currentDate.getDate() + 1)
      ) {
        const dateKey = format(currentDate, "yyyy-MM-dd");

        // Check if this date is within our week display range
        const isWithinWeek = weekDays.some(
          (day) => format(day, "yyyy-MM-dd") === dateKey,
        );

        if (isWithinWeek && meetingsByRoomAndDate[meeting.roomId]) {
          meetingsByRoomAndDate[meeting.roomId][dateKey].push(meeting);
        }
      }
    });

    // Get meetings for a specific room and day helper - exact same as standard
    const getMeetingsForRoomAndDay = (roomId: string, day: Date) => {
      const dateKey = format(day, "yyyy-MM-dd");
      return meetingsByRoomAndDate[roomId]?.[dateKey] || [];
    };

    return (
      <div
        className="h-full overflow-hidden"
        style={{ fontFamily: "Roboto, sans-serif" }}
      >
        {/* Meeting Schedule Table */}
        <div className="bg-white h-full overflow-hidden">
          <table
            style={{
              width: "100%",
              height: "100%",
              borderCollapse: "collapse",
              tableLayout: "fixed",
              border: "3px solid rgb(194 65 12)",
            }}
          >
            <colgroup>
              <col style={{ width: "420px" }} /> {/* Wider for 4K */}
              {weekDays.map((day, index) => {
                const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                return (
                  <col
                    key={index}
                    style={{
                      width: isWeekend
                        ? "calc((100% - 420px) * 0.06)" // Further reduced from 0.08 to 0.06
                        : "calc((100% - 420px) * 0.235)", // Further increased from 0.21 to 0.235
                    }}
                  />
                );
              })}
            </colgroup>
            <thead style={{ height: "45px" }}>
              {" "}
              {/* Optimized height for 4K */}
              <tr className="bg-orange-600" style={{ height: "40px" }}>
                <th
                  className="text-white font-bold text-center"
                  style={{
                    fontSize: "22pt",
                    fontWeight: "700",
                    padding: "6px",
                    borderRight: "2px solid rgb(194 65 12)",
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
                          : "2px solid rgb(194 65 12)",
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
                  roomIndex: number, // Limit to 10 rooms for 4K
                ) => (
                  <tr
                    key={room.id}
                    style={{
                      borderBottom: "3px solid rgb(194 65 12)",
                      height: `calc((100vh - 320px) / ${Math.min(rooms.length, 10)})`,
                      minHeight: "60px",
                      maxHeight: "80px",
                    }}
                  >
                    {/* Room Name Column */}
                    <td
                      className="text-white font-bold"
                      style={{
                        backgroundColor: "#f5f0dc",
                        padding: "16px",
                        borderRight: "3px solid rgb(194 65 12)",
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
                    {/* Meeting columns for each day */}
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
                              : "3px solid rgb(194 65 12)",
                            backgroundColor: isWeekend ? "#adacac" : "white",
                            verticalAlign: "top",
                            overflow: "hidden",
                          }}
                        >
                          {dayMeetings.map(
                            (meeting: any, meetingIndex: number) => {
                              // Calculate time display (same logic as standard)
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
                                      fontSize: "30pt", // Adjusted for 4K
                                      fontWeight: "500",
                                      lineHeight: "1.3",
                                      marginBottom: "6px",
                                    }}
                                  >
                                    <div
                                      style={{
                                        color: "#9f224e",
                                        fontWeight: "700",
                                        fontSize: "30pt",
                                        marginBottom: "4px",
                                      }}
                                    >
                                      {timeRange}
                                    </div>
                                    <div
                                      style={{
                                        color: "#006b68",
                                        fontWeight: "500",
                                        fontSize: "30pt",
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

  // Flexible Image Layout Component for 4K
  const FlexibleImageLayout4K = ({
    images,
    eventName,
  }: {
    images: string[];
    eventName: string;
  }) => {
    const renderImage = (
      src: string,
      index: number,
      className: string = "",
    ) => (
      <EventImageWithFallback
        key={index}
        src={src}
        alt={`${eventName} - Image ${index + 1}`}
        event={{ shortName: eventName, content: eventName }}
        additionalClassName={className}
      />
    );

    switch (images.length) {
      case 1:
        // Single image - full size
        return (
          <div className="w-full h-full flex items-center justify-center p-6">
            {renderImage(images[0], 0, "max-w-full max-h-full")}
          </div>
        );

      case 2:
        // Two images - side by side
        return (
          <div className="w-full h-full flex gap-4 p-6">
            <div className="flex-1 h-full">{renderImage(images[0], 0)}</div>
            <div className="flex-1 h-full">{renderImage(images[1], 1)}</div>
          </div>
        );

      case 3:
        // Three images - 2 top, 1 center bottom
        return (
          <div className="w-full h-full flex flex-col gap-4 p-6">
            <div className="flex gap-4 h-1/2">
              <div className="flex-1 h-full">{renderImage(images[0], 0)}</div>
              <div className="flex-1 h-full">{renderImage(images[1], 1)}</div>
            </div>
            <div className="h-1/2 flex justify-center">
              <div className="w-1/2 h-full">{renderImage(images[2], 2)}</div>
            </div>
          </div>
        );

      case 4:
        // Four images - 2x2 grid
        return (
          <div className="w-full h-full flex flex-col gap-4 p-6">
            <div className="flex gap-4 h-1/2">
              <div className="flex-1 h-full">{renderImage(images[0], 0)}</div>
              <div className="flex-1 h-full">{renderImage(images[1], 1)}</div>
            </div>
            <div className="flex gap-4 h-1/2">
              <div className="flex-1 h-full">{renderImage(images[2], 2)}</div>
              <div className="flex-1 h-full">{renderImage(images[3], 3)}</div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Other Events Display for 4K - with flexible image layouts
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

    // Debug the event display timing
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
            {/* Flexible image display based on number of images */}
            <div
              className="text-center h-full flex items-center justify-center"
              style={{ fontFamily: "Roboto, sans-serif" }}
            >
              {(() => {
                // Get all available images (imageUrls array or fallback to single imageUrl)
                const images =
                  currentEvent.imageUrls && currentEvent.imageUrls.length > 0
                    ? currentEvent.imageUrls.filter(Boolean)
                    : currentEvent.imageUrl
                      ? [currentEvent.imageUrl]
                      : [];

                if (images.length > 0) {
                  return (
                    <FlexibleImageLayout4K
                      images={images}
                      eventName={currentEvent.shortName}
                    />
                  );
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
              })()}
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

  const currentScreen = SCREENS[currentScreenIndex];

  return (
    <div
      className="min-h-screen relative overflow-hidden"
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
      <div className="flex-1" style={{ height: "calc(100vh - 200px)" }}>
        {currentScreen.id === "work-schedule" && renderWorkScheduleTable4K()}
        {currentScreen.id === "meeting-schedule" &&
          renderMeetingScheduleTable4K()}
        {currentScreen.id === "other-events" && renderOtherEventsDisplay4K()}
      </div>
    </div>
  );
}
