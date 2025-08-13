import { Monitor, Tv } from 'lucide-react';
import { useLocation } from 'wouter';

export default function DisplaySelection() {
  const [, setLocation] = useLocation();

  const navigateToDisplay = (type: string) => {
    if (type === '4k') {
      setLocation('/public-display-4k');
    } else {
      setLocation('/public-display');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-800 to-teal-900 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black py-6 px-8 rounded-lg mb-8">
            <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
              NGÂN HÀNG TMCP ĐẦU TƯ VÀ PHÁT TRIỂN VIỆT NAM
            </h1>
            <p className="text-2xl font-semibold">CHI NHÁNH SỞ GIAO DỊCH 1</p>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">CHỌN LOẠI MÀN HÌNH HIỂN THỊ</h2>
          <p className="text-xl text-gray-300">Vui lòng chọn màn hình phù hợp với thiết bị của bạn</p>
        </div>

        {/* Display Options */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Standard Display */}
          <div 
            onClick={() => navigateToDisplay('standard')}
            className="bg-white rounded-xl shadow-2xl p-8 cursor-pointer hover:scale-105 transition-all duration-300 hover:shadow-3xl border-4 border-transparent hover:border-blue-400"
          >
            <div className="text-center">
              <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Monitor size={40} className="text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">MÀN HÌNH TIÊU CHUẨN</h3>
              <div className="text-lg text-gray-600 mb-6">
                <p className="mb-2"><strong>Độ phân giải:</strong> 1920 x 1080 (Full HD)</p>
                <p className="mb-2"><strong>Thiết bị:</strong> Màn hình LCD/LED thường</p>
                <p className="mb-4"><strong>Kích thước:</strong> 19" - 32"</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <p className="text-gray-700">
                  Phù hợp với các màn hình máy tính, laptop và TV nhỏ thông thường
                </p>
              </div>
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200">
                CHỌN MÀN HÌNH NÀY
              </button>
            </div>
          </div>

          {/* 4K Display */}
          <div 
            onClick={() => navigateToDisplay('4k')}
            className="bg-white rounded-xl shadow-2xl p-8 cursor-pointer hover:scale-105 transition-all duration-300 hover:shadow-3xl border-4 border-transparent hover:border-purple-400"
          >
            <div className="text-center">
              <div className="bg-purple-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Tv size={40} className="text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">MÀN HÌNH 4K</h3>
              <div className="text-lg text-gray-600 mb-6">
                <p className="mb-2"><strong>Độ phân giải:</strong> 3840 x 2160 (4K Ultra HD)</p>
                <p className="mb-2"><strong>Thiết bị:</strong> TV 4K, màn hình lớn</p>
                <p className="mb-4"><strong>Kích thước:</strong> 55" - 85"</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg mb-6">
                <p className="text-gray-700">
                  Tối ưu cho TV 65 inch và màn hình lớn độ phân giải cao
                </p>
              </div>
              <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200">
                CHỌN MÀN HÌNH NÀY
              </button>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <div className="bg-black bg-opacity-30 rounded-lg p-6">
            <h4 className="text-xl font-bold text-white mb-4">HƯỚNG DẪN SỬ DỤNG</h4>
            <div className="grid md:grid-cols-2 gap-6 text-gray-300">
              <div>
                <p className="mb-2"><strong>Điều khiển:</strong></p>
                <ul className="text-left space-y-1">
                  <li>• Nút ◀ ▶ : Chuyển màn hình</li>
                  <li>• Nút ⏸ ▶ : Tạm dừng/Tiếp tục</li>
                  <li>• Tự động chuyển sau 15 giây</li>
                </ul>
              </div>
              <div>
                <p className="mb-2"><strong>Nội dung hiển thị:</strong></p>
                <ul className="text-left space-y-1">
                  <li>• Lịch công tác lãnh đạo</li>
                  <li>• Lịch họp trong ngày</li>
                  <li>• Sự kiện và thông báo</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}