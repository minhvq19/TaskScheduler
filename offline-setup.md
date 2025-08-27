# Hướng dẫn thiết lập offline cho ứng dụng

## Font Files cần tải

Để ứng dụng hoạt động hoàn toàn offline, bạn cần tải các file font Roboto sau và đặt vào thư mục `client/src/fonts/`:

### Download từ Google Fonts Helper:
Truy cập: https://google-webfonts-helper.herokuapp.com/fonts/roboto

1. **roboto-v30-latin-300.woff2** (Light)
2. **roboto-v30-latin-300.woff** (Light fallback)
3. **roboto-v30-latin-regular.woff2** (Regular)
4. **roboto-v30-latin-regular.woff** (Regular fallback)
5. **roboto-v30-latin-500.woff2** (Medium)
6. **roboto-v30-latin-500.woff** (Medium fallback)
7. **roboto-v30-latin-700.woff2** (Bold)
8. **roboto-v30-latin-700.woff** (Bold fallback)

### Cách tải nhanh:
```bash
cd client/src/fonts/

# Download tất cả font files cần thiết
wget https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmSU5fBBc4.woff2 -O roboto-v30-latin-300.woff2
wget https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmSU5fABc4EsA.woff -O roboto-v30-latin-300.woff
wget https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2 -O roboto-v30-latin-regular.woff2
wget https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu7mxKOzY.woff -O roboto-v30-latin-regular.woff
wget https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmEU9fBBc4.woff2 -O roboto-v30-latin-500.woff2
wget https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmEU9fABc4EsA.woff -O roboto-v30-latin-500.woff
wget https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc4.woff2 -O roboto-v30-latin-700.woff2
wget https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfABc4EsA.woff -O roboto-v30-latin-700.woff
```

## Xác nhận setup thành công

Sau khi tải font, cấu trúc thư mục sẽ như sau:
```
client/src/fonts/
├── fonts.css
├── roboto-v30-latin-300.woff2
├── roboto-v30-latin-300.woff
├── roboto-v30-latin-regular.woff2
├── roboto-v30-latin-regular.woff
├── roboto-v30-latin-500.woff2
├── roboto-v30-latin-500.woff
├── roboto-v30-latin-700.woff2
└── roboto-v30-latin-700.woff
```

## Test offline

1. Build ứng dụng: `npm run build`
2. Ngắt internet
3. Chạy ứng dụng: `npm start`
4. Kiểm tra xem font hiển thị đúng hay không