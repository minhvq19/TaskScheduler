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
      { id: "user-management", label: "Quản lý người dùng", icon: UserCog },
      { id: "permissions", label: "Phân quyền", icon: Key },
      { id: "system-config", label: "Tham số hệ thống", icon: Settings },
    ],
  },
];

export default function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const openPublicDisplay = () => {
    window.open("/display", "_blank");
  };

  return (
    <aside className="w-64 bg-white shadow-sm h-screen sticky top-0">
      <nav className="p-6 space-y-2">
        {/* Dashboard */}
        <Button
          variant={activeSection === "dashboard" ? "default" : "ghost"}
          className={cn(
            "w-full justify-start space-x-3",
            activeSection === "dashboard" 
              ? "bg-bidv-light-gray text-bidv-teal" 
              : "text-gray-700 hover:bg-gray-100"
          )}
          onClick={() => onSectionChange("dashboard")}
          data-testid="nav-dashboard"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="font-medium">Dashboard</span>
        </Button>

        {/* Menu sections */}
        {menuItems.slice(1).map((section, sectionIndex) => (
          <div key={sectionIndex} className="pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3 bg-[#006b68] text-[#ffffff]">
              {section.category}
            </p>
            {section.items?.map((item) => (
              <Button
                key={item.id}
                variant={activeSection === item.id ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start space-x-3 mb-1",
                  activeSection === item.id 
                    ? "bg-bidv-light-gray text-bidv-teal" 
                    : "text-gray-700 hover:bg-gray-100"
                )}
                onClick={() => onSectionChange(item.id)}
                data-testid={`nav-${item.id}`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Button>
            ))}
          </div>
        ))}

        {/* Public Display Button */}
        <div className="pt-4">
          <Button
            variant="outline"
            className="w-full justify-start space-x-3 text-orange-600 border-orange-200 hover:bg-orange-50"
            onClick={openPublicDisplay}
            data-testid="nav-public-display"
          >
            <Tv className="w-4 h-4" />
            <span>Màn hình công cộng</span>
          </Button>
        </div>
      </nav>
    </aside>
  );
}
