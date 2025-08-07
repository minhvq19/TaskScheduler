import { useQuery } from "@tanstack/react-query";

interface SystemConfig {
  key: string;
  value: string;
  type: string;
  category: string;
}

export const useSystemColors = () => {
  const { data: configs = [] } = useQuery<SystemConfig[]>({
    queryKey: ["/api/system-config"],
    refetchInterval: 5000, // Refresh every 5 seconds to pick up color changes
  });

  const colorConfigs = configs.filter(config => config.category === "colors");
  
  const getWorkScheduleColor = (workType: string) => {
    const colorMap = {
      "Làm việc tại CN": colorConfigs.find(c => c.key === "colors.work_at_branch")?.value || "#4a90a4",
      "Nghỉ phép": colorConfigs.find(c => c.key === "colors.leave")?.value || "#f59e0b",
      "Trực lãnh đạo": colorConfigs.find(c => c.key === "colors.leadership_duty")?.value || "#ef4444",
      "Đi công tác trong nước": colorConfigs.find(c => c.key === "colors.domestic_business_trip")?.value || "#10b981",
      "Đi công tác nước ngoài": colorConfigs.find(c => c.key === "colors.international_business_trip")?.value || "#8b5cf6",
      "Khác": colorConfigs.find(c => c.key === "colors.other")?.value || "#6b7280"
    };
    
    return colorMap[workType as keyof typeof colorMap] || "#4a90a4";
  };

  return {
    getWorkScheduleColor,
    configs: colorConfigs
  };
};