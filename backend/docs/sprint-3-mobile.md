# Handoff Mobile — Văn Kim

Backend đã có HTTPS bridge. Workspace này chưa có mã nguồn Mobile; handler dưới đây là phần bàn giao tham khảo, **chưa phải app đã tích hợp/nghiệm thu**.

1. Cấu hình custom scheme `glowup` trong app config; Expo dùng development build, không nghiệm thu scheme bằng Expo Go.
2. Khi create payment gửi `platform: "MOBILE"`. Lưu paymentId cục bộ trước mở ví/browser; không lưu secret cổng.
3. MoMo: thử `walletDeeplink` thực; `Linking.canOpenURL`/`openURL` có thể lỗi hoặc ví không có, khi đó mở `paymentUrl`. ZaloPay dùng paymentUrl/order_url. Nếu URL hết hạn thì gọi status, không mở lại cổng.
4. Nhận link lúc app mở và lúc cold start; khi foreground gọi status với pending paymentId. Route link chỉ cung cấp ID, ownership vẫn do backend kiểm tra bằng access token. Không suy trạng thái từ resultCode/query trên link.
5. Hiển thị trạng thái từ backend, polling 1–2 giây trong màn hình return; dừng polling khi rời màn hình, khi order đã confirm/cancel và không còn verification pending, hoặc quá verificationDeadline. Dùng expiresAt countdown gốc; không reset 15 phút.

Handler React Native tham khảo, gắn một lần ở root đã hoàn thành khôi phục auth. Với cold start, giữ link trong hàng đợi cho tới khi access token sẵn sàng; dùng API client hiện có để tự refresh/retry 401. Hàm `openPaymentReturn` điều hướng màn hình gọi status. `checkPendingPayment` đọc ID đã lưu và gọi status; không tạo payment mới khi foreground.

```tsx
import { useEffect } from 'react';
import { AppState, Linking } from 'react-native';

export function usePaymentReturn(
  authReady: boolean,
  openPaymentReturn: (id: string) => void,
  checkPendingPayment: () => void,
) {
  useEffect(() => {
    if (!authReady) return;
    let disposed = false;
    const handle = (raw: string | null) => {
      if (!raw || disposed) return;
      try {
        const url = new URL(raw);
        const id = url.searchParams.get('paymentId');
        if (url.protocol === 'glowup:' && url.hostname === 'payment'
            && url.pathname === '/return'
            && id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
          openPaymentReturn(id);
        }
      } catch { /* Ignore links outside this contract. */ }
    };
    const links = Linking.addEventListener('url', ({ url }) => handle(url));
    void Linking.getInitialURL().then(handle).catch(() => {});
    const foreground = AppState.addEventListener('change', state => {
      if (state === 'active') checkPendingPayment();
    });
    checkPendingPayment();
    return () => { disposed = true; links.remove(); foreground.remove(); };
  }, [authReady, openPaymentReturn, checkPendingPayment]);
}
```

Giữ callbacks bằng `useCallback` để tránh đăng ký handler lại và mở initial link nhiều lần. Nếu app nhận nhiều link trước authReady, root linking provider cần giữ link gần nhất; `getInitialURL()` chỉ xử lý cold-start link. Khi thiếu app GlowUp, HTTPS bridge vẫn có nút tiếp tục Web.

Nghiệm thu trên development build: app đang mở/đã đóng; đang logout rồi login sau link; ví cài/chưa cài; GlowUp chưa cài; app foreground không có callback link; browser return tới trước IPN; xác minh 60 giây; canceled + paid + refundPending; ZaloPay còn dưới 5 phút có URL/không URL/UNKNOWN. Lưu build/version/device và screenshot; universal links/FCM còn ở sprint sau.
