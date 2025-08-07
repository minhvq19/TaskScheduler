import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Users,
  Building,
  Star,
  DoorOpen,
  CalendarCheck,
  CalendarPlus,
  Calendar,
  UserCog,
  Key,
  Tv,
  LayoutDashboard,
  Settings,
  CalendarDays,
} from "lucide-react";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const menuItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    category: null,
  },
  {
    category: "Quản lý danh mục",
    items: [
      { id: "staff-management", label: "Quản lý cán bộ", icon: Users },
      { id: "department-management", label: "Quản lý phòng ban", icon: Building },
      { id: "event-management", label: "Quản lý sự kiện", icon: Star },
      { id: "room-management", label: "Quản lý phòng họp", icon: DoorOpen },
    ],
  },
  {
    category: "Quản trị lịch",
    items: [
      { id: "work-schedule", label: "Lịch công tác", icon: CalendarCheck },
      { id: "meeting-schedule", label: "Lịch phòng họp", icon: CalendarPlus },
      { id: "other-events", label: "Sự kiện khác", icon: Calendar },
      { id: "holiday-management", label: "Quản lý ngày lễ", icon: CalendarDays },
    ],
  },
  {
    category: "Hệ thống",
    items: [
      { id: "permissions", label: "Phân quyền", icon: Key },
      { id: "user-groups", label: "Nhóm quyền", icon: UserCog },
      { id: "system-config", label: "Tham số hệ thống", icon: Settings },
    ],
  },
];

export default function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const openPublicDisplay = () => {
    window.open("/display", "_blank");
  };

  return (
    <aside className="w-64 bg-gradient-to-b from-slate-50 to-white shadow-xl h-screen sticky top-0 border-r border-gray-200 overflow-hidden flex flex-col">
      <nav className="p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {/* Dashboard */}
        <Button
          variant={activeSection === "dashboard" ? "default" : "ghost"}
          className={cn(
            "w-full justify-start space-x-3 rounded-xl transition-all duration-300 transform hover:scale-105",
            activeSection === "dashboard" 
              ? "bg-gradient-to-r from-[#006b68] to-[#008a85] text-white hover:from-[#005a57] hover:to-[#007974] shadow-lg border border-[#005a57]" 
              : "text-gray-700 hover:bg-gradient-to-r hover:from-[#006b68] hover:to-[#008a85] hover:text-white hover:shadow-md hover:border hover:border-[#005a57]"
          )}
          onClick={() => onSectionChange("dashboard")}
          data-testid="nav-dashboard"
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="font-semibold">Dashboard</span>
        </Button>

        {/* Menu sections */}
        {menuItems.slice(1).map((section, sectionIndex) => (
          <div key={sectionIndex} className="pt-6">
            <div className="bg-gradient-to-r from-[#006b68] to-[#008a85] text-white px-4 py-2.5 rounded-xl mb-4 shadow-lg border border-[#005a57]">
              <p className="text-xs font-bold uppercase tracking-wider">
                {section.category}
              </p>
            </div>
            {section.items?.map((item) => (
              <Button
                key={item.id}
                variant={activeSection === item.id ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start space-x-3 mb-2 rounded-xl transition-all duration-300 transform hover:scale-105",
                  activeSection === item.id 
                    ? "bg-gradient-to-r from-[#006b68] to-[#008a85] text-white hover:from-[#005a57] hover:to-[#007974] shadow-lg border border-[#005a57]" 
                    : "text-gray-700 hover:bg-gradient-to-r hover:from-[#006b68] hover:to-[#008a85] hover:text-white hover:shadow-md hover:border hover:border-[#005a57]"
                )}
                onClick={() => onSectionChange(item.id)}
                data-testid={`nav-${item.id}`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Button>
            ))}
          </div>
        ))}

        {/* Public Display Button */}
        <div className="pt-6">
          <Button
            variant="outline"
            className="w-full justify-start space-x-3 rounded-xl text-orange-600 border-orange-300 hover:bg-gradient-to-r hover:from-orange-500 hover:to-orange-600 hover:text-white hover:border-orange-500 transition-all duration-300 transform hover:scale-105 shadow-md"
            onClick={openPublicDisplay}
            data-testid="nav-public-display"
          >
            <Tv className="w-5 h-5" />
            <span className="font-medium">Màn hình công cộng</span>
          </Button>
        </div>
      </nav>
    </aside>
  );
}
