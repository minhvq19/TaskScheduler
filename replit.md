# Tổng quan

Hệ thống này cung cấp giải pháp quản lý lịch làm việc toàn diện cho CN Sở Giao Dịch 1, bao gồm sắp xếp lịch cho nhân viên, đặt phòng họp, quản lý sự kiện và hiển thị dữ liệu nội bộ. Nó hỗ trợ cả các hoạt động hành chính và phổ biến thông tin công cộng với khả năng hiển thị kép: độ phân giải tiêu chuẩn (1920x1080) và độ phân giải 4K (3840x2160) được tối ưu hóa cho màn hình TV lớn. Dự án nhằm mục đích hợp lý hóa các quy trình lập lịch trong tổ chức, nâng cao hiệu quả hoạt động và cung cấp cái nhìn rõ ràng về các hoạt động hàng ngày thông qua các bố cục thích ứng.

## Những thay đổi gần đây (Tháng 8 năm 2025)

- **Hệ thống hiển thị công cộng trên di động**: Xây dựng hoàn chỉnh hệ thống hiển thị công cộng cho mobile
- Tạo component `PublicDisplayMobile` với thiết kế responsive tối ưu cho điện thoại
- Hỗ trợ các độ phân giải phổ biến: iPhone (2868x1320, 2622x1206), Samsung (3120x1440, 2340x1080)
- Layout dọc tối ưu với header cố định, tabs điều hướng touch-friendly
- CSS responsive riêng biệt với media queries cho từng loại device
- Routing mới: `/display-mobile`, `/public-display-mobile`, `/public-mobile`, `/mobile`
- Cập nhật Display Selection để bao gồm option cho mobile với icon Smartphone
- **Thiết kế lại lịch phòng họp mobile**: Cải thiện UX bằng cách hiển thị tình trạng phòng họp theo thời gian thực
- Hiển thị trạng thái phòng (Đang sử dụng/Trống) với màu sắc trực quan (đỏ/xanh)
- Thông tin cuộc họp hiện tại và cuộc họp tiếp theo cho mỗi phòng
- Lịch chi tiết trong ngày với highlight cuộc họp đang diễn ra
- Layout theo từng phòng thay vì theo ngày để dễ theo dõi tình trạng sử dụng
- **Nhập dữ liệu quá khứ**: Đã gỡ bỏ các hạn chế về ngày/giờ trong quản lý lịch làm việc để cho phép sửa đổi các ngày đã qua
- Xóa `min` attribute trong datetime inputs và validation logic cho ngày giờ quá khứ
- Sửa `isValidWorkTime` function để cho phép chọn giờ quá khứ
- Cập nhật cả `add-schedule-modal.tsx` và `enhanced-schedule-modal.tsx`
- **Mobile meeting room display cleanup**: Đã loại bỏ bộ lọc "Lọc theo cán bộ" khỏi mobile work schedule và xóa phần "Lịch hôm nay" khỏi mobile meeting room display để tránh hiển thị thông tin không chính xác
- **Sửa lỗi timezone mobile meeting rooms**: Áp dụng logic xử lý thời gian giống 4K display sử dụng getUTCHours/getUTCMinutes và logic xử lý cuộc họp kéo dài qua nhiều ngày (00:00-23:59 cho ngày giữa)
- **Hoàn thiện logic phát hiện phòng bận**: Đã cập nhật logic so sánh thời gian với offset UTC+7 để phát hiện chính xác trạng thái phòng họp, đảm bảo hiển thị đúng "Đang sử dụng"/"Trống" dựa trên thời gian thực
- **Thêm điều hướng ngày cho mobile meeting rooms**: Tạo tính năng xem lịch họp các ngày khác với navigation buttons và quick access (Hôm qua/Hôm nay/Ngày mai), hiển thị danh sách meetings theo ngày được chọn với thời gian chính xác
- **Sửa lỗi tải ảnh và mã hóa URL**: Đã khắc phục các vấn đề tải ảnh trong môi trường sản xuất cho mục Sự kiện khác
- Nâng cấp cấu hình multer với tính năng làm sạch tên tệp để ngăn chặn các khoảng trống và ký tự đặc biệt
- Tạo hàm tiện ích `createImageUrl` để mã hóa URL đúng cách cho cả màn hình 4K và màn hình tiêu chuẩn
- Bổ sung chức năng gỡ lỗi toàn diện để xử lý các vấn đề tải ảnh trong môi trường sản xuất
- Sửa các đường dẫn tệp trong cơ sở dữ liệu cho các sự kiện có tên tệp chứa khoảng trắng
- **Cấu hình thời gian hiển thị**: Thay thế một khoảng thời gian xoay màn hình duy nhất bằng các tùy chọn thời gian riêng biệt cho từng loại màn hình:
- `display.work_schedule_display_time`: Thời gian hiển thị cho màn hình lịch làm việc
- `display.meeting_schedule_display_time`: Thời gian hiển thị cho màn hình lịch họp
- `display.events_display_time`: Thời gian hiển thị cho màn hình sự kiện khác
- **Nội địa hóa tiếng Việt**: Đã chuyển đổi các tin nhắn và thông báo giao diện sang tiếng Việt
- **Hiển thị lịch làm việc nhiều ngày**: Đã cải tiến logic hiển thị thời gian cho các lịch làm việc nhiều ngày trên cả hai chế độ hiển thị công cộng

---

# Kiến trúc hệ thống

## Kiến trúc giao diện người dùng (Frontend Architecture)

Ứng dụng phía người dùng được xây dựng với React 18 và TypeScript, tận dụng kiến trúc dựa trên component với `shadcn/ui` để có thiết kế nhất quán. Nó sử dụng Wouter cho việc định tuyến nhẹ và TanStack Query để quản lý và lưu trữ dữ liệu từ máy chủ. Hệ thống có ba chế độ hiển thị:

- **Màn hình tiêu chuẩn (1920x1080)**: Tối ưu cho màn hình máy tính thông thường và laptop
- **Màn hình 4K (3840x2160)**: Được thiết kế đặc biệt cho màn hình TV 65-inch với phông chữ lớn hơn, khoảng cách tăng và bố cục tối ưu
- **Màn hình di động (Responsive)**: Tối ưu cho điện thoại với layout dọc, touch-friendly controls và responsive design

Các đường dẫn hiển thị công cộng bao gồm:
- `/select-display`: Giao diện chọn chế độ hiển thị
- `/public-display`: Hiển thị độ phân giải tiêu chuẩn
- `/public-display-4k`: Hiển thị độ phân giải 4K
- `/public-display-mobile`: Hiển thị tối ưu cho di động (responsive)
- `/mobile`: Đường dẫn thay thế cho di động

Phong cách được quản lý với Tailwind CSS, sử dụng các thuộc tính tùy chỉnh cho màu sắc thương hiệu ngân hàng B.... Vite được dùng để phát triển nhanh và tối ưu hóa bản dựng sản phẩm.

## Kiến trúc máy chủ (Backend Architecture)

Máy chủ sử dụng kiến trúc Express.js nhiều lớp, phân tách các mối quan tâm qua định tuyến, logic nghiệp vụ và truy cập dữ liệu. Nó có các API RESTful, tích hợp OpenID Connect với xác thực của Replit, quản lý phiên bằng PostgreSQL và Multer để tải tệp. Logic nghiệp vụ được sắp xếp với một lớp trừu tượng hóa lưu trữ (`server/storage.ts`) cho tất cả các hoạt động cơ sở dữ liệu, đảm bảo sự phân công rõ ràng từ các trình xử lý định tuyến. Quản lý lỗi và ghi nhật ký được thực hiện nhất quán trên toàn hệ thống.

## Kiến trúc cơ sở dữ liệu (Database Architecture)

Hệ thống sử dụng PostgreSQL với Drizzle ORM cho các hoạt động và di chuyển dữ liệu an toàn về kiểu. Sơ đồ bao gồm các đối tượng cốt lõi như Users, Staff, Departments, Meeting Rooms và Event Categories. Nó hỗ trợ Lịch làm việc, Lịch họp và các Sự kiện khác với các khoảng thời gian, và triển khai một hệ thống phân quyền linh hoạt liên kết người dùng với nhân viên. Các tính năng chính bao gồm khóa chính UUID, các mối quan hệ khóa ngoại với xóa theo chuỗi, và các trường theo dõi thay đổi.

## Xác thực và ủy quyền (Authentication and Authorization)

Một phương pháp bảo mật nhiều lớp được triển khai bằng cách tích hợp OpenID Connect với dịch vụ xác thực của Replit và quản lý phiên bằng cơ sở dữ liệu. Ủy quyền được dựa trên các vai trò (`SystemUser` và `Staff`) và các quyền chi tiết hơn để quản lý lịch. Bảo vệ ở cấp độ đường dẫn được thực thi bằng phần mềm trung gian xác thực, trong khi các đường dẫn hiển thị công cộng có thể truy cập mà không cần xác thực.

---

# Các dịch vụ và thư viện bên ngoài

## Dịch vụ cơ sở dữ liệu
- **Neon Database**: Dịch vụ lưu trữ PostgreSQL không máy chủ.
- **Drizzle ORM**: Bộ công cụ cơ sở dữ liệu an toàn về kiểu.

## Dịch vụ xác thực
- **Replit Authentication**: Nhà cung cấp OpenID Connect.
- **Passport.js**: Phần mềm trung gian xác thực.

## Các thư viện giao diện người dùng
- **React Query (@tanstack/react-query)**: Quản lý trạng thái máy chủ.
- **shadcn/ui**: Thư viện component.
- **Tailwind CSS**: Tạo kiểu giao diện.
- **Wouter**: Định tuyến phía người dùng.
- **React Hook Form**: Quản lý trạng thái biểu mẫu.

## Các thư viện phía máy chủ
- **Express.js**: Khung ứng dụng web.
- **Multer**: Xử lý tải tệp.
- **bcrypt**: Băm mật khẩu.
- **connect-pg-simple**: Kho lưu trữ phiên PostgreSQL.
- **memoizee**: Ghi nhớ chức năng.

## Dịch vụ đám mây
- **Replit**: Nền tảng phát triển và lưu trữ.
- **Neon**: Dịch vụ cơ sở dữ liệu PostgreSQL được quản lý.