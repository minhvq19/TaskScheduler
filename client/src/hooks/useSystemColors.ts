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
  });

  const colorConfigs = configs.filter(config => config.category === "colors");
  
  const getWorkScheduleColor = (workType: string) => {
    const colorMap = {
      "Làm việc tại CN": colorConfigs.find(c => c.key === "colors.work_at_branch")?.value || "#4a90a4",
      "Nghỉ phép": colorConfigs.find(c => c.key === "colors.leave")?.value || "#9f224e",
      "Trực lãnh đạo": colorConfigs.find(c => c.key === "colors.leadership_duty")?.value || "#f58732",
      "Đi công tác trong nước": colorConfigs.find(c => c.key === "colors.domestic_business_trip")?.value || "#0071a6",
      "Đi công tác nước ngoài": colorConfigs.find(c => c.key === "colors.international_business_trip")?.value || "#32a852",
      "Tiếp khách VIP": colorConfigs.find(c => c.key === "colors.vip_reception")?.value || "#ba02ae",
      "Khác": colorConfigs.find(c => c.key === "colors.other")?.value || "#6b7280"
    };
    
    return colorMap[workType as keyof typeof colorMap] || "#4a90a4";
  };

  return {
    getWorkScheduleColor,
    configs: colorConfigs
  };
};