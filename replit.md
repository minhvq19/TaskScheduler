# Overview

This is a comprehensive work schedule management system built for BIDV (Bank for Investment and Development of Vietnam). The application provides a complete solution for managing staff schedules, meeting rooms, events, and organizational data with both administrative interfaces and public display capabilities.

The system features a React-based frontend with a modern component library (shadcn/ui), an Express.js backend with RESTful APIs, and PostgreSQL database integration through Drizzle ORM. It includes authentication, role-based permissions, and real-time data management for organizational scheduling needs.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes

- **August 12, 2025**: Khắc phục hoàn toàn lỗi sự kiện khác không hiển thị trên màn hình công cộng. Mở rộng API data range từ 7 ngày thành 30 ngày tương lai. Cập nhật logic filtering để hiển thị sự kiện đang diễn ra HOẶC sự kiện sắp tới trong 30 ngày. Sửa logic auto-cycling để chu kỳ hiển thị đúng nhiều sự kiện.
- **August 12, 2025**: Triển khai tham số cấu hình cho phép/không cho phép nhập lịch công tác vào cuối tuần (mặc định: cho phép). Thêm loại hình "Đi khách hàng" trong nội dung công tác "Khác" với đặc điểm không tô màu nền trên lịch. Cập nhật form validation và hiển thị ghi chú cho user về chính sách cuối tuần và màu sắc. Thêm entry vào color legend cho "Đi khách hàng".
- **August 12, 2025**: Thêm tính năng navigation manual cho màn hình công cộng. Triển khai nút Previous/Next và nút Play/Pause ở góc trên bên phải với thiết kế đẹp, sử dụng icons từ Lucide React. Người dùng có thể chủ động chuyển màn hình hoặc tạm dừng/tiếp tục chế độ tự động chuyển màn hình. Các nút có màu cam (navigation) và đỏ/xanh (pause/play) với hover effects và tooltips.
- **August 11, 2025**: Khắc phục lỗi form validation "Vui lòng chọn ngày kết thúc" khi checkbox "Cả ngày (08:00 - 17:30)" được chọn. Thêm logic tự động điền ngày kết thúc bằng ngày bắt đầu khi checkbox "Cả ngày" được tích. Sửa useEffect trong enhanced-schedule-modal.tsx để tự động clear lỗi validation và điền endDate khi isFullDay được chọn. Khắc phục vấn đề state inconsistency giữa checkbox "Cả ngày" và validation fields.
- **August 11, 2025**: Khắc phục lỗi "Phòng không xác định" trên màn hình công cộng bằng cách thêm API endpoint `/api/public/meeting-rooms` để bypass authentication requirements. Sửa lỗi hiển thị thời gian sai (01:00-10:30 thay vì 08:00-17:30) bằng cách cập nhật parseLocalDateTime để xử lý đúng múi giờ GMT+7. Tất cả API endpoints public đã hoạt động bình thường.
- **August 8, 2025**: Khắc phục hoàn toàn lỗi sự kiện không hiển thị trên màn hình công cộng. Sửa logic filtering trong storage.getOtherEvents() để tìm sự kiện chồng lấp thời gian thay vì sự kiện hoàn toàn nằm trong khoảng tìm kiếm. Triển khai đầy đủ search, sorting và status column cho quản trị sự kiện khác. Màn hình công cộng bây giờ hiển thị chính xác sự kiện đang diễn ra với layout ảnh lớn.
- **August 8, 2025**: Xây dựng lại hoàn toàn chức năng "Quản trị sự kiện khác" theo đúng yêu cầu URD FR-QL-004. Triển khai tên sự kiện ngắn gọn, thời gian bắt đầu/kết thúc, nội dung chi tiết, và chức năng upload hình ảnh với validation (JPG, PNG, GIF, tối đa 10MB). Thêm các API routes thiếu (PUT, DELETE) và validation thời gian kết thúc phải sau thời gian bắt đầu.
- **August 8, 2025**: Loại bỏ menu "Quản lý sự kiện" khỏi category "Quản lý danh mục" trong sidebar để tránh trùng lặp với chức năng "Sự kiện khác" ở menu "Quản trị lịch". Giữ lại chỉ một menu "Sự kiện khác" để quản lý tất cả các sự kiện.
- **August 8, 2025**: Khắc phục lỗi định tuyến menu "Sự kiện khác". Thêm case thiếu trong switch statement của Dashboard component để xử lý section "other-events", đảm bảo click vào menu "Sự kiện khác" sẽ hiển thị EventManagement component thay vì quay về Dashboard.
- **August 8, 2025**: Khắc phục lỗi xác định trạng thái cuộc họp trong màn hình công cộng. Sửa logic phân tích datetime để xử lý đúng múi giờ địa phương, đảm bảo trạng thái "Đang sử dụng" hiển thị chính xác cho các cuộc họp đang diễn ra. Triển khai hàm parseLocalDateTime để đồng nhất xử lý datetime giữa các component.
- **August 8, 2025**: Thiết kế lại màn hình công cộng phần lịch phòng họp theo mẫu bảng chuyên nghiệp. Bảng hiển thị 6 cột: Thứ tự, Thời gian, Địa điểm, Nội dung cuộc họp, Trạng thái, Đầu mối. Sắp xếp theo thời gian bắt đầu gần nhất, hiển thị tối đa 20 lịch với font Roboto dễ đọc. Header màu cam, hàng dữ liệu màu teal theo thiết kế BIDV.
- **August 8, 2025**: Khắc phục hoàn toàn các lỗi lịch phòng họp. Sửa lỗi validation schema để chấp nhận cả string và Date object cho startDateTime/endDateTime với xử lý múi giờ đúng. Thêm các API routes thiếu: DELETE và PUT cho meeting-schedules. Khắc phục lỗi "Expected date, received string" khi thêm lịch và lỗi không thể xóa lịch phòng họp.
- **August 8, 2025**: Sửa lỗi validation schema cho lịch phòng họp. Cập nhật insertMeetingScheduleSchema để chấp nhận cả string và Date object cho startDateTime/endDateTime, và tự động chuyển đổi string thành Date. Sửa function getScheduleStatus để chấp nhận cả string và Date parameters. Khắc phục lỗi "Expected date, received string" khi thêm lịch phòng họp.
- **August 8, 2025**: Tối ưu hoàn chỉnh màn hình công cộng không cần thanh cuộn. Triển khai font Roboto và layout responsive với height: 100vh để đảm bảo toàn bộ nội dung hiển thị vừa trong màn hình. Sử dụng flexbox để phân chia không gian đều, giảm padding/margin và điều chỉnh font size xuống 8px để tối ưu không gian. Giới hạn hiển thị tối đa 6 lịch công tác mỗi ô và loại bỏ overflow để đảm bảo không cần cuộn.
- **August 8, 2025**: Optimized public display screen for better readability and space efficiency. Enhanced schedule content formatting to display maximum 2 lines with structure "[Main content] - (Time)" and "Detailed content". Increased text size from 6-7px to 9px. Compacted color legend section with abbreviated labels and smaller indicators to reduce screen space usage.
- **August 8, 2025**: Enhanced work schedule validation to prevent past date/time selection at browser level using HTML input constraints (min attributes). Users can no longer select past dates or times in schedule forms.
- **August 8, 2025**: Added real-time weekend and holiday prevention. Users can no longer select Saturdays, Sundays, or holidays when entering work schedules. Invalid selections are immediately reset with error messages.
- **August 8, 2025**: Implemented comprehensive daily schedule limit validation for date ranges. System now enforces maximum 5 work schedules per day per board member across entire date ranges, providing specific error messages indicating which date would exceed the limit.

# System Architecture

## Frontend Architecture

The client-side application is built with React 18 and TypeScript, utilizing a component-based architecture with shadcn/ui for consistent design patterns. The application uses Wouter for lightweight routing and TanStack Query for server state management and caching.

**Key architectural decisions:**
- **Component Library**: Uses shadcn/ui with Radix UI primitives for accessible, customizable components
- **State Management**: TanStack Query handles server state, eliminating need for global state management
- **Styling**: Tailwind CSS with CSS custom properties for theming, including BIDV brand colors
- **Routing**: Wouter provides client-side routing with role-based route protection
- **Build Tool**: Vite for fast development and optimized production builds

## Backend Architecture

The server follows a layered Express.js architecture with clear separation of concerns across routing, business logic, and data access layers.

**Core components:**
- **API Layer**: RESTful endpoints organized by feature domains (staff, departments, schedules, etc.)
- **Authentication**: OpenID Connect integration with Replit authentication service
- **Session Management**: PostgreSQL-backed sessions with connect-pg-simple
- **File Handling**: Multer middleware for image uploads with validation
- **Database Layer**: Drizzle ORM provides type-safe database operations

**Business Logic Organization:**
- Storage abstraction layer in `server/storage.ts` encapsulates all database operations
- Route handlers focus on HTTP concerns and delegate to storage layer
- Consistent error handling and logging throughout the application

## Database Architecture

The system uses PostgreSQL with Drizzle ORM for type-safe database operations and migrations.

**Schema Design:**
- **Core Entities**: Users, Staff, Departments, Meeting Rooms, Event Categories
- **Scheduling**: Work Schedules, Meeting Schedules, Other Events with datetime ranges
- **Access Control**: System Users, User Groups, Schedule Permissions for granular access
- **Session Storage**: Database-backed sessions for authentication state

**Key Features:**
- UUID primary keys for all entities
- Proper foreign key relationships with cascading deletes
- Audit fields (createdAt, updatedAt) on all major entities
- Flexible permission system linking users to staff members

## Authentication and Authorization

The application implements a multi-layered security approach:

**Authentication Flow:**
- OpenID Connect integration with Replit's authentication service
- Database-backed session management with automatic cleanup
- Secure cookie configuration with httpOnly and secure flags

**Authorization Model:**
- Role-based access through SystemUser and Staff relationship
- Permission-based access control for schedule management
- Route-level protection with authentication middleware
- Public display route accessible without authentication

## Development and Deployment

**Development Environment:**
- Hot module replacement with Vite development server
- TypeScript compilation with strict mode enabled
- ESLint and TypeScript checking for code quality
- Replit-specific development tools and error overlays

**Build Process:**
- Frontend builds to optimized static assets
- Backend bundles with esbuild for Node.js deployment
- Environment-specific configuration for development vs production
- Database migrations managed through Drizzle Kit

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle ORM**: Type-safe database toolkit with migration support

## Authentication Services
- **Replit Authentication**: OpenID Connect provider for user authentication
- **Passport.js**: Authentication middleware with OpenID Connect strategy

## Frontend Libraries
- **React Query (@tanstack/react-query)**: Server state management and caching
- **shadcn/ui**: Component library built on Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Wouter**: Lightweight client-side routing
- **React Hook Form**: Form state management with validation

## Backend Dependencies
- **Express.js**: Web application framework
- **Multer**: File upload handling middleware
- **bcrypt**: Password hashing for local authentication
- **connect-pg-simple**: PostgreSQL session store
- **memoizee**: Function memoization for performance optimization

## Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Static type checking
- **ESBuild**: JavaScript bundler for backend
- **PostCSS**: CSS processing with Tailwind
- **Drizzle Kit**: Database migration and introspection tools

## Cloud Services
- **Replit**: Development environment and hosting platform
- **Neon**: Managed PostgreSQL database service