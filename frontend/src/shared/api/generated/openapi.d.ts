// Generated from backend/docs/api/openapi.json. Do not edit.
// SHA256: ad7bb1d95849aca11a57f109df0b02b449aefd3d0d6acc74b8711672670f493f
export interface paths {
    "/api/v1/auth/register": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Đăng ký tài khoản khách hàng mới */
        post: operations["AuthController_register"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Đăng nhập vào hệ thống */
        post: operations["AuthController_login"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/verify-email": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Xác thực tài khoản qua email token */
        post: operations["AuthController_verifyEmail"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/resend-verification": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Gửi lại email xác thực (giới hạn 3 lần/giờ) */
        post: operations["AuthController_resendVerification"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/refresh-token": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Làm mới Access Token bằng Refresh Token (Token Rotation) */
        post: operations["AuthController_refreshToken"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Đăng xuất khỏi phiên hiện tại */
        post: operations["AuthController_logout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/forgot-password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Yêu cầu link đặt lại mật khẩu qua email */
        post: operations["AuthController_forgotPassword"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/reset-password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Đặt lại mật khẩu mới bằng token xác nhận */
        post: operations["AuthController_resetPassword"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Lấy thông tin tài khoản hiện tại */
        get: operations["AuthController_getMe"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/oauth/google": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Exchange verified Google ID token for a GlowUp session or an onboarding/link challenge */
        post: operations["OAuthController_google"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/oauth/facebook": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Exchange classic Facebook user access token; Limited Login is unsupported */
        post: operations["OAuthController_facebook"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/oauth/email": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Send one-time verification code for bound challenge; existing target email cannot be changed */
        post: operations["OAuthController_email"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/oauth/complete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create a new verified customer from challenge; existing email requires authenticated /link */
        post: operations["OAuthController_complete"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/oauth/link": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Link identity to current account using fresh email proof; never merges accounts or POS history */
        post: operations["OAuthController_link"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/uploads/images": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Admin - Tải một ảnh lên kho, trả về link để gắn vào sản phẩm / thương hiệu / danh mục */
        post: operations["UploadAdminController_uploadImage"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/pos/sessions/current": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** POS - Ca đang mở của cửa hàng (data = null nếu chưa có ca) */
        get: operations["PosSessionController_getCurrent"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/pos/sessions/open": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** POS - Mở ca, khai báo tiền mặt đầu ca (mỗi cửa hàng chỉ một ca mở) */
        post: operations["PosSessionController_open"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/pos/sessions/{id}/close": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** POS - Đóng ca: nhập tiền mặt đếm được, hệ thống tính chênh lệch */
        post: operations["PosSessionController_close"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/pos/sessions/{id}/reconcile": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** POS - Quản lý / kế toán chốt ca đã đóng (không tự chốt ca của mình) */
        post: operations["PosSessionController_reconcile"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/pos/sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Admin - Danh sách ca POS, tự lọc theo phạm vi dữ liệu (ALL / STORE) */
        get: operations["PosSessionAdminController_getSessions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/inventory": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Admin - Xem tồn kho (thực tế / giữ chỗ / khả dụng), tự lọc theo phạm vi dữ liệu */
        get: operations["InventoryAdminController_getInventory"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/inventory/receive": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Admin - Nhận hàng theo đơn đặt hàng NCC: ghi lô + hạn dùng, cộng tồn, cập nhật giá vốn */
        post: operations["InventoryAdminController_receive"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/inventory/adjust": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Admin - Điều chỉnh tồn kho có lý do: số âm xuất theo FEFO, số dương nhập vào lô */
        post: operations["InventoryAdminController_adjust"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/pos/inventory": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** POS - Xem tồn kho tại cửa hàng đang trực */
        get: operations["InventoryPosController_getInventory"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/customer/products": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Lấy danh sách sản phẩm hiển thị trên Web/Mobile (phân trang, lọc, sắp xếp) */
        get: operations["ProductCustomerController_getProducts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/customer/products/search": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Tìm kiếm sản phẩm theo từ khóa (Elasticsearch + fallback DB) */
        get: operations["ProductCustomerController_searchProducts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/customer/products/suggest": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Gợi ý tìm kiếm nhanh / autocomplete (tối đa 20 kết quả) */
        get: operations["ProductCustomerController_suggestProducts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/customer/products/{slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Xem chi tiết sản phẩm theo slug (URL thân thiện SEO) */
        get: operations["ProductCustomerController_getProductBySlug"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/customer/products/{id}/related": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Lấy danh sách sản phẩm liên quan (cùng danh mục hoặc thương hiệu) */
        get: operations["ProductCustomerController_getRelatedProducts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/products": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Admin - Danh sách sản phẩm (gồm cả đã ẩn; tìm theo tên/SKU, lọc danh mục, thương hiệu, trạng thái) */
        get: operations["ProductAdminController_getProducts"];
        put?: never;
        /** Admin - Thêm sản phẩm kèm biến thể và ảnh (lưu trong một transaction) */
        post: operations["ProductAdminController_createProduct"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/products/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Admin - Chi tiết sản phẩm kèm biến thể và ảnh */
        get: operations["ProductAdminController_getProductById"];
        put?: never;
        post?: never;
        /** Admin - Xóa mềm sản phẩm (chuyển sang ngừng kinh doanh) */
        delete: operations["ProductAdminController_deleteProduct"];
        options?: never;
        head?: never;
        /** Admin - Sửa sản phẩm (gửi images sẽ thay toàn bộ ảnh; biến thể sửa ở API riêng) */
        patch: operations["ProductAdminController_updateProduct"];
        trace?: never;
    };
    "/api/v1/admin/products/{productId}/variants": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Admin - Danh sách biến thể của sản phẩm (gồm cả đã ẩn) */
        get: operations["ProductVariantAdminController_getVariants"];
        put?: never;
        /** Admin - Thêm biến thể (kiểm tra tổ hợp thuộc tính không trùng) */
        post: operations["ProductVariantAdminController_createVariant"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/variants/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Admin - Xóa mềm biến thể (chuyển sang ngừng bán) */
        delete: operations["ProductVariantAdminController_deleteVariant"];
        options?: never;
        head?: never;
        /** Admin - Sửa biến thể (giá, SKU, mã vạch, thuộc tính, trạng thái) */
        patch: operations["ProductVariantAdminController_updateVariant"];
        trace?: never;
    };
    "/api/v1/returns": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Danh sách yêu cầu đổi trả của tôi */
        get: operations["CommerceController_listReturns"];
        put?: never;
        /** Tạo yêu cầu REFUND/EXCHANGE cho đơn của tôi trong 7 ngày từ COMPLETED */
        post: operations["CommerceController_createReturn"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/returns/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Chi tiết đổi trả, quote, settlement và trạng thái hoàn tiền */
        get: operations["CommerceController_returnDetail"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/returns/{id}/exchange/accept": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Chấp nhận quote đổi hàng đã kiểm định; giữ tồn và tạo đơn thay thế */
        post: operations["CommerceController_accept"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders/{id}/tracking": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Theo dõi nhiều kiện hàng của đơn thuộc khách hàng */
        get: operations["CommerceController_track"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/uploads/return-images": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Upload bằng chứng vào private bucket; tối đa 5 MB, trả attachmentId */
        post: operations["CommerceController_upload"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/uploads/return-images/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Lấy URL ảnh có hạn 5 phút, chỉ chủ ảnh */
        get: operations["CommerceController_image"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/customers/me/loyalty": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Số dư, hạng, quyền lợi và lịch sử điểm phân trang */
        get: operations["CommerceController_getLoyalty"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/customers/me/loyalty/rewards": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Phần thưởng cấu hình; thiếu policy trả 503 */
        get: operations["CommerceController_rewards"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/customers/me/loyalty/redeem": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Đổi rewardCode lấy voucher riêng trong transaction */
        post: operations["CommerceController_redeem"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/wishlists/toggle": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Đảo trạng thái yêu thích; retry cùng key không đảo lại */
        post: operations["CommerceController_toggle"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/wishlists/{productId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Đặt trạng thái yêu thích đích */
        put: operations["CommerceController_select"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/wishlists": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Danh sách sản phẩm yêu thích còn hiển thị */
        get: operations["CommerceController_listWishlist"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/notifications": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Thông báo của tôi và số chưa đọc */
        get: operations["CommerceController_listNotifications"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/notifications/{id}/read": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Đánh dấu thông báo của tôi đã đọc */
        put: operations["CommerceController_read"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/users/me/devices": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Đăng ký/rotate FCM token cho tài khoản hiện tại */
        post: operations["CommerceController_register"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/users/me/devices/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Hủy đăng ký thiết bị và ngừng delivery trước logout */
        delete: operations["CommerceController_unregister"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/categories/tree": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Lấy cây danh mục sản phẩm đa cấp phục vụ menu điều hướng Web/Mobile */
        get: operations["CategoryCustomerController_getCategoryTree"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/categories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Admin - Danh sách danh mục dạng phẳng (phân trang, tìm, lọc) */
        get: operations["CategoryAdminController_getCategories"];
        put?: never;
        /** Admin - Thêm danh mục */
        post: operations["CategoryAdminController_createCategory"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/categories/tree": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Admin - Cây danh mục đầy đủ, gồm cả danh mục đã ẩn */
        get: operations["CategoryAdminController_getCategoryTree"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/categories/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Admin - Xem chi tiết danh mục */
        get: operations["CategoryAdminController_getCategoryById"];
        put?: never;
        post?: never;
        /** Admin - Xóa mềm danh mục (chuyển sang ngừng hoạt động) */
        delete: operations["CategoryAdminController_deleteCategory"];
        options?: never;
        head?: never;
        /** Admin - Sửa danh mục (đổi cha, đổi thứ tự, bật/tắt hoạt động) */
        patch: operations["CategoryAdminController_updateCategory"];
        trace?: never;
    };
    "/api/v1/admin/brands": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Admin - Danh sách thương hiệu (phân trang, tìm theo tên, lọc trạng thái) */
        get: operations["BrandAdminController_getBrands"];
        put?: never;
        /** Admin - Thêm thương hiệu */
        post: operations["BrandAdminController_createBrand"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/brands/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Admin - Xem chi tiết thương hiệu */
        get: operations["BrandAdminController_getBrandById"];
        put?: never;
        post?: never;
        /** Admin - Xóa thương hiệu (chỉ khi chưa có sản phẩm nào) */
        delete: operations["BrandAdminController_deleteBrand"];
        options?: never;
        head?: never;
        /** Admin - Sửa thương hiệu (gửi isActive = false để ngừng kinh doanh) */
        patch: operations["BrandAdminController_updateBrand"];
        trace?: never;
    };
    "/api/v1/cart/items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Thêm sản phẩm biến thể vào giỏ hàng (Guest hoặc Customer) */
        post: operations["CartController_addToCart"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cart": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Xem giỏ hàng hiện tại kèm thông tin tồn kho, giá realtime, và trạng thái sản phẩm */
        get: operations["CartController_getCart"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cart/items/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Cập nhật số lượng hoặc trạng thái chọn (Partial Checkout) của sản phẩm trong giỏ */
        put: operations["CartController_updateCartItem"];
        post?: never;
        /** Xóa sản phẩm khỏi giỏ hàng */
        delete: operations["CartController_removeCartItem"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/cart/merge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Gộp giỏ hàng khách vãng lai (Guest session) vào tài khoản Customer khi đăng nhập */
        post: operations["CartController_mergeCart"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/customers/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Xem hồ sơ cá nhân của khách hàng (hạng thành viên, điểm thưởng, tổng chi tiêu) */
        get: operations["CustomerController_getProfile"];
        /** Cập nhật thông tin hồ sơ cá nhân khách hàng */
        put: operations["CustomerController_updateProfile"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/customers/me/addresses": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Xem danh sách địa chỉ nhận hàng của khách hàng */
        get: operations["CustomerController_getAddresses"];
        put?: never;
        /** Thêm mới địa chỉ nhận hàng (tối đa 10 địa chỉ) */
        post: operations["CustomerController_createAddress"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/customers/me/addresses/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Cập nhật địa chỉ nhận hàng */
        put: operations["CustomerController_updateAddress"];
        post?: never;
        /** Xóa địa chỉ nhận hàng */
        delete: operations["CustomerController_deleteAddress"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/customers/me/addresses/{id}/default": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Đặt một địa chỉ làm địa chỉ nhận hàng mặc định */
        patch: operations["CustomerController_setDefaultAddress"];
        trace?: never;
    };
    "/api/v1/admin/customers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Admin - Danh sách khách hàng: tìm theo tên/SĐT/email, lọc hạng và cửa hàng, tự lọc theo phạm vi dữ liệu */
        get: operations["CustomerAdminController_getCustomers"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Xem trước chi phí đơn hàng, khuyến mãi, điểm thưởng và kho xử lý */
        post: operations["CustomerOrderController_previewOrder"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Khởi tạo đơn hàng mới */
        post: operations["CustomerOrderController_createOrder"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/customers/me/orders": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Lấy danh sách lịch sử đơn hàng của khách hàng */
        get: operations["CustomerOrderController_getCustomerOrders"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Xem chi tiết đơn hàng (có bảo vệ IDOR) */
        get: operations["CustomerOrderController_getOrderDetail"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders/{id}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Hủy đơn hàng đang ở trạng thái PENDING */
        put: operations["CustomerOrderController_cancelOrder"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/orders": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Admin - Danh sách đơn hàng, tự lọc theo phạm vi dữ liệu (ALL / STORE / SELF) */
        get: operations["OrderAdminController_getOrders"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/orders/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Admin - Chi tiết đơn: khách, sản phẩm, giá, thanh toán, vận đơn, dòng thời gian trạng thái */
        get: operations["OrderAdminController_getOrderDetail"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/orders/{id}/confirm": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Admin - Xác nhận đơn PENDING → CONFIRMED (kiểm tra tồn kho tại cửa hàng xử lý đơn) */
        put: operations["OrderAdminController_confirmOrder"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/orders/{id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Admin - Đổi trạng thái CONFIRMED → PROCESSING → SHIPPING → DELIVERED → COMPLETED. SHIPPING: trừ kho (FEFO); DELIVERED: thu tiền COD; COMPLETED: tích điểm, cộng tổng chi tiêu, xét hạng, hoa hồng */
        put: operations["OrderAdminController_updateOrderStatus"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/orders/{id}/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Admin - Hủy đơn ở PENDING / CONFIRMED / PROCESSING: trả hàng đang giữ, hoàn coupon, hoàn điểm, tạo phiếu hoàn tiền nếu đã thu */
        put: operations["OrderAdminController_cancelOrder"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/reviews": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Đánh giá sản phẩm đã mua trong đơn COMPLETED; một review/product/customer */
        post: operations["ExperienceController_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/customer/products/{id}/reviews": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Review đã duyệt, histogram và aggregate, không trả thông tin riêng của khách */
        get: operations["ExperienceController_list"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/pages/{slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Trang đã xuất bản, nội dung HTML an toàn */
        get: operations["ExperienceController_page"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/blog/posts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Bài viết PUBLISHED đã tới thời điểm xuất bản */
        get: operations["ExperienceController_posts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/blog/posts/{slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Chi tiết bài viết và tăng một lượt xem thành công */
        get: operations["ExperienceController_post"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/blog/categories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Danh mục có bài đã xuất bản */
        get: operations["ExperienceController_categories"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/faqs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** FAQ đang hoạt động, nhóm theo category */
        get: operations["ExperienceController_faqs"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/banners": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Banner đúng lịch, vị trí và URL hợp lệ */
        get: operations["ExperienceController_banners"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/promotions/active": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Campaign đang hoạt động và điều kiện áp dụng, không trả mã coupon riêng */
        get: operations["PromotionController_active"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/promotions/flash-sale": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Flash Sale và quota còn lại; checkout xác nhận lại giá và giữ quota */
        get: operations["PromotionController_flash"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/coupons/validate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Kiểm tra coupon bằng cùng pricing engine; không giữ quota/điểm/lượt coupon */
        post: operations["PromotionController_validate"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/sitemap.xml": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Sitemap index; proxy this and /sitemaps/* at the website origin */
        get: operations["SeoController_index"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/sitemaps/{source}/{page}.xml": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["SeoController_part"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/robots.txt": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["SeoController_robots"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/health/live": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["HealthController_live"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/health/ready": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["HealthController_ready"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        RegisterDto: {
            /**
             * @description Địa chỉ email người dùng
             * @example customer@example.com
             */
            email: string;
            /**
             * @description Mật khẩu tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và chữ số
             * @example GlowUp@2026
             */
            password: string;
            /**
             * @description Họ và tên người dùng
             * @example Nguyễn Văn A
             */
            fullName: string;
            /**
             * @description Số điện thoại liên hệ
             * @example 0901234567
             */
            phone?: string;
        };
        MessageResponseDto: {
            /** @example Thao tác thành công */
            message: string;
        };
        LoginDto: {
            /**
             * @description Email đăng nhập
             * @example customer@example.com
             */
            email: string;
            /**
             * @description Mật khẩu
             * @example GlowUp@2026
             */
            password: string;
        };
        AuthUserDto: {
            /** @example a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11 */
            id: string;
            /** @example customer@example.com */
            email: string;
            /** @example Nguyễn Văn A */
            fullName: string;
            /** @example https://example.com/avatar.jpg */
            avatarUrl?: Record<string, never>;
            /** @example CUSTOMER */
            roleName?: string;
        };
        LoginResponseDto: {
            /** @description GlowUp JWT access token; TTL follows JWT_EXPIRES_IN */
            accessToken: string;
            /** @description Opaque refresh token; TTL follows JWT_REFRESH_EXPIRES_IN */
            refreshToken: string;
            user: components["schemas"]["AuthUserDto"];
        };
        VerifyEmailDto: {
            /** @description Mã xác thực email gửi qua đường dẫn */
            token: string;
        };
        ResendOtpDto: {
            /**
             * @description Email cần gửi lại mã xác thực
             * @example customer@example.com
             */
            email: string;
        };
        RefreshTokenDto: {
            /** @description Refresh token để lấy access token mới */
            refreshToken: string;
        };
        RefreshTokenResponseDto: {
            /** @description JWT Access Token mới */
            accessToken: string;
            /** @description Refresh Token mới */
            refreshToken: string;
        };
        LogoutDto: {
            /** @description Refresh token của phiên đăng nhập cần đăng xuất */
            refreshToken: string;
        };
        ForgotPasswordDto: {
            /**
             * @description Email tài khoản cần đặt lại mật khẩu
             * @example customer@example.com
             */
            email: string;
        };
        ResetPasswordDto: {
            /** @description Token đặt lại mật khẩu nhận qua email */
            token: string;
            /**
             * @description Mật khẩu mới tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và chữ số
             * @example NewPassword@2026
             */
            newPassword: string;
        };
        GoogleOAuthDto: {
            /** @description Client-generated random binding secret; retain for this onboarding flow only */
            clientNonce: string;
            idToken: string;
        };
        FacebookOAuthDto: {
            /** @description Client-generated random binding secret; retain for this onboarding flow only */
            clientNonce: string;
            /** @description Classic Facebook user access token; Limited Login JWT is not supported */
            accessToken: string;
        };
        OAuthEmailDto: {
            /** @description Client-generated random binding secret; retain for this onboarding flow only */
            clientNonce: string;
            challenge: string;
            email: string;
        };
        OAuthCompleteDto: {
            /** @description Client-generated random binding secret; retain for this onboarding flow only */
            clientNonce: string;
            challenge: string;
            /** @description One-time token delivered by email; expires with challenge in 10 minutes */
            verificationToken: string;
        };
        UploadImageResponseDto: {
            /** @example https://abcd1234.supabase.co/storage/v1/object/public/glowup-images/products/0b6f2c1e-7d0a-4a4e-9a57-3f1c2b9d8e10.webp */
            url: string;
        };
        OpenPosSessionDto: {
            /** @description Cửa hàng mở ca */
            storeId: string;
            /**
             * @description Tiền mặt đầu ca có trong két (đồng)
             * @example 2000000
             */
            openingCash: number;
            note?: string;
        };
        ClosePosSessionDto: {
            /**
             * @description Tiền mặt đếm được trong két khi kết ca (đồng)
             * @example 5350000
             */
            countedCash: number;
            /** @description Giải trình nếu két lệch */
            note?: string;
        };
        PosSessionResponseDto: {
            id: string;
            /** @example POS-STORE-01-20261007-01 */
            sessionCode: string;
            store: Record<string, never>;
            cashier: Record<string, never>;
            /** Format: date-time */
            openedAt: string;
            closedAt?: Record<string, never>;
            openingCash: number;
            /** @description Tiền mặt hệ thống ghi nhận từ các đơn trong ca */
            systemCash: number;
            countedCash?: Record<string, never>;
            /** @description Tiền đếm được - (đầu ca + hệ thống); âm là thiếu, dương là dư */
            difference?: Record<string, never>;
            /** @enum {string} */
            status: "OPEN" | "CLOSED" | "RECONCILED";
            note?: Record<string, never>;
            approvedBy?: Record<string, never>;
        };
        ReconcilePosSessionDto: {
            /** @description Ghi chú của người chốt; bắt buộc khi ca lệch tiền mà thu ngân chưa giải trình */
            note?: string;
        };
        ReceiveItemDto: {
            /** @description Dòng hàng trong đơn đặt hàng (purchase_order_items.id) */
            purchaseOrderItemId: string;
            /** @example 50 */
            quantity: number;
            /** @example LOT2610A */
            batchNumber: string;
            /**
             * @description Hạn sử dụng, dạng YYYY-MM-DD
             * @example 2028-06-30
             */
            expiryDate: string;
            /**
             * @description Ngày sản xuất, dạng YYYY-MM-DD
             * @example 2026-06-30
             */
            manufactureDate?: string;
        };
        ReceivePurchaseOrderDto: {
            /** @description Đơn đặt hàng nhà cung cấp cần nhận */
            purchaseOrderId: string;
            /** @description Một dòng hàng có thể chia nhiều lô */
            items: components["schemas"]["ReceiveItemDto"][];
            /** @description Ghi chú kiểm hàng (hàng móp, thiếu...) */
            note?: string;
        };
        AdjustInventoryDto: {
            /** @description Cửa hàng / kho điều chỉnh */
            storeId: string;
            productVariantId: string;
            /**
             * @description Số âm = xuất (hủy hàng hết hạn, mất mát); số dương = nhập hàng 0 đồng (mẫu thử, giao bù)
             * @example -3
             */
            quantity: number;
            /** @example Hủy 3 hộp hết hạn */
            reason: string;
            /** @description Chọn đúng lô; bỏ trống thì hệ thống tự chọn theo FEFO khi xuất */
            batchId?: string;
            /** @description Khi nhập thêm vào lô mới: số lô */
            batchNumber?: string;
            /** @description Khi nhập thêm vào lô mới: hạn sử dụng YYYY-MM-DD */
            expiryDate?: string;
            /** @description Khi nhập thêm vào lô mới: ngày sản xuất YYYY-MM-DD */
            manufactureDate?: string;
        };
        PageMetaDto: {
            page: number;
            limit: number;
            itemCount: number;
            pageCount: number;
            hasPreviousPage: boolean;
            hasNextPage: boolean;
        };
        PageDto: {
            data: unknown[][];
            meta: components["schemas"]["PageMetaDto"];
        };
        ProductSuggestionDto: {
            /** @example a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11 */
            id: string;
            /** @example Son kem lì Black Rouge Air Fit Velvet Tint */
            name: string;
            /** @example son-kem-li-black-rouge-air-fit-velvet-tint */
            slug: string;
            /** @example https://example.com/product.jpg */
            imageUrl?: Record<string, never>;
            /** @example 179000 */
            price: number;
        };
        ProductVariantResponseDto: {
            id: string;
            productId: string;
            /** @example BR-VELVET-A01 */
            sku: string;
            barcode?: Record<string, never>;
            /** @example A01 Đỏ gạch */
            option1Value?: Record<string, never>;
            option2Value?: Record<string, never>;
            option3Value?: Record<string, never>;
            /** @example 179000 */
            price: number;
            /** @example 95000 */
            costPrice: number;
            weight?: Record<string, never>;
            unit?: Record<string, never>;
            /**
             * @description Chỉ đọc — tồn kho cập nhật qua module Inventory
             * @example 0
             */
            stockQuantity: number;
            /** @example true */
            isActive: boolean;
            /** Format: date-time */
            createdAt?: string;
            /** Format: date-time */
            updatedAt?: string;
        };
        ProductImageResponseDto: {
            /** @example img-uuid-1 */
            id?: string;
            /** @example https://example.com/product-1.jpg */
            imageUrl: string;
            /** @example Ảnh chi tiết son */
            altText?: Record<string, never>;
            /** @example 0 */
            sortOrder: number;
            /** @example true */
            isPrimary: boolean;
            /** @example v1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11 */
            productVariantId?: Record<string, never>;
        };
        ProductIngredientResponseDto: {
            /** @example ing-uuid-1 */
            id?: string;
            /** @example Dimethicone */
            ingredientName: string;
            /** @example 15% */
            percentage?: Record<string, never>;
            /** @example true */
            isKeyIngredient: boolean;
        };
        ProductResponseDto: {
            /** @description Giá thấp nhất của variant active, một đơn vị chưa áp điều kiện giỏ */
            effectivePrice?: Record<string, never>;
            effectivePriceMax?: Record<string, never>;
            /** @description Điều kiện campaign; campaign có minOrderAmount chỉ được xác nhận tại preview/checkout */
            promotions?: Record<string, never>[];
            /** @enum {string} */
            priceBasis?: "SINGLE_UNIT_WITHOUT_CART_CONDITIONS";
            /** @example false */
            reservation?: boolean;
            /** @default false */
            isWishlisted: boolean;
            /** @example a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11 */
            id: string;
            /** @example c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22 */
            categoryId: string;
            /** @example b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33 */
            brandId?: Record<string, never>;
            /** @example Black Rouge */
            brandName?: Record<string, never>;
            /** @example Trang điểm môi */
            categoryName?: string;
            /** @example https://example.com/primary.jpg */
            primaryImage?: Record<string, never>;
            /** @example Son kem lì Black Rouge Air Fit Velvet Tint */
            name: string;
            /** @example son-kem-li-black-rouge-air-fit-velvet-tint */
            slug: string;
            /** @example BR-VELVET-TINT */
            sku: string;
            /** @example Dòng son kem lì đình đám... */
            description?: Record<string, never>;
            shortDescription?: Record<string, never>;
            /** @example 199000 */
            basePrice: number;
            /** @example 179000 */
            salePrice?: Record<string, never>;
            /** @example true */
            isActive: boolean;
            /** @example false */
            isFeatured: boolean;
            /** @example 4.8 */
            avgRating: number;
            /** @example 120 */
            totalReviews: number;
            /** @example 500 */
            totalSold: number;
            /** @example Màu sắc */
            option1Name?: Record<string, never>;
            /** @example Dung tích */
            option2Name?: Record<string, never>;
            option3Name?: Record<string, never>;
            variants: components["schemas"]["ProductVariantResponseDto"][];
            images?: components["schemas"]["ProductImageResponseDto"][];
            ingredients?: components["schemas"]["ProductIngredientResponseDto"][];
            /**
             * @example [
             *       "son lì",
             *       "hot trend"
             *     ]
             */
            tags?: string[];
            /** Format: date-time */
            createdAt?: string;
            /** Format: date-time */
            updatedAt?: string;
        };
        CreateProductVariantRequestDto: {
            /** @example BR-VELVET-A01 */
            sku: string;
            /** @example 8809551234567 */
            barcode?: Record<string, never>;
            /** @example A01 Đỏ gạch */
            option1Value?: Record<string, never>;
            /** @example 4g */
            option2Value?: Record<string, never>;
            option3Value?: Record<string, never>;
            /** @example 179000 */
            price: number;
            /** @example 95000 */
            costPrice: number;
            /**
             * @description Khối lượng
             * @example 4
             */
            weight?: Record<string, never>;
            /** @example g */
            unit?: Record<string, never>;
            /**
             * @default true
             * @example true
             */
            isActive: boolean;
        };
        ProductImageRequestDto: {
            /** @example https://cdn.glowup.vn/products/velvet-tint-1.jpg */
            imageUrl: string;
            /** @example Son Black Rouge A01 */
            altText?: Record<string, never>;
            /** @example 0 */
            sortOrder?: number;
            /** @example true */
            isPrimary?: boolean;
        };
        ProductIngredientRequestDto: {
            /** @example Niacinamide */
            ingredientName: string;
            /** @example 5% */
            percentage?: Record<string, never>;
            /**
             * @default false
             * @example true
             */
            isKeyIngredient: boolean;
        };
        CreateProductRequestDto: {
            /**
             * @description ID danh mục
             * @example c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22
             */
            categoryId: string;
            /**
             * @description ID thương hiệu
             * @example b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33
             */
            brandId?: Record<string, never>;
            /** @example Son kem lì Black Rouge Air Fit Velvet Tint */
            name: string;
            /** @example son-kem-li-black-rouge-air-fit-velvet-tint */
            slug: string;
            /** @example BR-VELVET-TINT */
            sku: string;
            description?: Record<string, never>;
            shortDescription?: Record<string, never>;
            /** @example 199000 */
            basePrice: number;
            /** @example 179000 */
            salePrice?: Record<string, never>;
            /** @example Màu sắc */
            option1Name?: Record<string, never>;
            /** @example Dung tích */
            option2Name?: Record<string, never>;
            option3Name?: Record<string, never>;
            /** @default true */
            isActive: boolean;
            /** @default false */
            isFeatured: boolean;
            metaTitle?: Record<string, never>;
            metaDescription?: Record<string, never>;
            metaKeywords?: Record<string, never>;
            /** @description Ít nhất 1 biến thể */
            variants: components["schemas"]["CreateProductVariantRequestDto"][];
            images?: components["schemas"]["ProductImageRequestDto"][];
            /**
             * @description Gửi lên khi sửa = thay toàn bộ tag cũ
             * @example [
             *       "bestseller",
             *       "organic"
             *     ]
             */
            tags?: string[];
            /** @description Gửi lên khi sửa = thay toàn bộ thành phần cũ */
            ingredients?: components["schemas"]["ProductIngredientRequestDto"][];
        };
        UpdateProductRequestDto: {
            /**
             * @description ID danh mục
             * @example c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22
             */
            categoryId?: string;
            /**
             * @description ID thương hiệu
             * @example b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33
             */
            brandId?: Record<string, never>;
            /** @example Son kem lì Black Rouge Air Fit Velvet Tint */
            name?: string;
            /** @example son-kem-li-black-rouge-air-fit-velvet-tint */
            slug?: string;
            /** @example BR-VELVET-TINT */
            sku?: string;
            description?: Record<string, never>;
            shortDescription?: Record<string, never>;
            /** @example 199000 */
            basePrice?: number;
            /** @example 179000 */
            salePrice?: Record<string, never>;
            /** @example Màu sắc */
            option1Name?: Record<string, never>;
            /** @example Dung tích */
            option2Name?: Record<string, never>;
            option3Name?: Record<string, never>;
            /** @default true */
            isActive: boolean;
            /** @default false */
            isFeatured: boolean;
            metaTitle?: Record<string, never>;
            metaDescription?: Record<string, never>;
            metaKeywords?: Record<string, never>;
            images?: components["schemas"]["ProductImageRequestDto"][];
            /**
             * @description Gửi lên khi sửa = thay toàn bộ tag cũ
             * @example [
             *       "bestseller",
             *       "organic"
             *     ]
             */
            tags?: string[];
            /** @description Gửi lên khi sửa = thay toàn bộ thành phần cũ */
            ingredients?: components["schemas"]["ProductIngredientRequestDto"][];
        };
        UpdateProductVariantRequestDto: {
            /** @example BR-VELVET-A01 */
            sku?: string;
            /** @example 8809551234567 */
            barcode?: Record<string, never>;
            /** @example A01 Đỏ gạch */
            option1Value?: Record<string, never>;
            /** @example 4g */
            option2Value?: Record<string, never>;
            option3Value?: Record<string, never>;
            /** @example 179000 */
            price?: number;
            /** @example 95000 */
            costPrice?: number;
            /**
             * @description Khối lượng
             * @example 4
             */
            weight?: Record<string, never>;
            /** @example g */
            unit?: Record<string, never>;
            /**
             * @default true
             * @example true
             */
            isActive: boolean;
        };
        ReturnItemDto: {
            orderItemId: string;
            quantity: number;
        };
        ExchangeItemDto: {
            productVariantId: string;
            quantity: number;
        };
        CreateReturnDto: {
            orderId: string;
            /** @enum {string} */
            type: "REFUND" | "EXCHANGE";
            /** @enum {string} */
            reason: "WRONG_ITEM" | "DEFECTIVE" | "EXPIRED" | "ALLERGIC" | "CUSTOMER_CHANGE_MIND";
            items: components["schemas"]["ReturnItemDto"][];
            attachmentIds?: string[];
            replacements?: components["schemas"]["ExchangeItemDto"][];
        };
        AcceptExchangeDto: {
            quoteVersion: number;
            /** @enum {string} */
            paymentMethod?: "COD" | "VNPAY" | "MOMO" | "ZALOPAY";
        };
        RedeemDto: {
            rewardCode: string;
        };
        WishlistDto: {
            productId: string;
        };
        WishlistStateDto: {
            selected: boolean;
        };
        DeviceDto: {
            /** @description Native FCM registration token, not ExpoPushToken/ExponentPushToken or an APNs token */
            deviceToken: string;
            /** @enum {string} */
            platform: "IOS" | "ANDROID" | "WEB";
            deviceName?: string;
            appVersion?: string;
        };
        CategoryTreeResponseDto: {
            /** @example c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22 */
            id: string;
            /** @example null */
            parentId?: Record<string, never>;
            /** @example Chăm sóc da */
            name: string;
            /** @example cham-soc-da */
            slug: string;
            /** @example https://example.com/cat-skincare.jpg */
            imageUrl?: Record<string, never>;
            /** @example 1 */
            sortOrder: number;
            children: components["schemas"]["CategoryTreeResponseDto"][];
        };
        CategoryResponseDto: {
            /** @example c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22 */
            id: string;
            /** @example null */
            parentId?: Record<string, never>;
            /** @example Kem chống nắng */
            name: string;
            /** @example kem-chong-nang */
            slug: string;
            description?: Record<string, never>;
            imageUrl?: Record<string, never>;
            /** @example 0 */
            sortOrder: number;
            /** @example true */
            isActive: boolean;
            metaTitle?: Record<string, never>;
            metaDescription?: Record<string, never>;
            /** Format: date-time */
            createdAt?: string;
            /** Format: date-time */
            updatedAt?: string;
            /** @description Chỉ có ở API dạng cây */
            children?: components["schemas"]["CategoryResponseDto"][];
        };
        CreateCategoryRequestDto: {
            /** @description ID danh mục cha; bỏ trống hoặc null nếu là danh mục gốc */
            parentId?: Record<string, never>;
            /** @example Kem chống nắng */
            name: string;
            /**
             * @description Chữ thường không dấu, nối bằng dấu gạch ngang
             * @example kem-chong-nang
             */
            slug: string;
            description?: Record<string, never>;
            /** @example https://cdn.glowup.vn/categories/kem-chong-nang.jpg */
            imageUrl?: Record<string, never>;
            /**
             * @default 0
             * @example 0
             */
            sortOrder: number;
            /**
             * @default true
             * @example true
             */
            isActive: boolean;
            metaTitle?: Record<string, never>;
            metaDescription?: Record<string, never>;
        };
        UpdateCategoryRequestDto: {
            /** @description ID danh mục cha; bỏ trống hoặc null nếu là danh mục gốc */
            parentId?: Record<string, never>;
            /** @example Kem chống nắng */
            name?: string;
            /**
             * @description Chữ thường không dấu, nối bằng dấu gạch ngang
             * @example kem-chong-nang
             */
            slug?: string;
            description?: Record<string, never>;
            /** @example https://cdn.glowup.vn/categories/kem-chong-nang.jpg */
            imageUrl?: Record<string, never>;
            /**
             * @default 0
             * @example 0
             */
            sortOrder: number;
            /**
             * @default true
             * @example true
             */
            isActive: boolean;
            metaTitle?: Record<string, never>;
            metaDescription?: Record<string, never>;
        };
        BrandResponseDto: {
            /** @example b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33 */
            id: string;
            /** @example Innisfree */
            name: string;
            /** @example innisfree */
            slug: string;
            logoUrl?: Record<string, never>;
            bannerUrl?: Record<string, never>;
            description?: Record<string, never>;
            /** @example Hàn Quốc */
            countryOfOrigin?: Record<string, never>;
            websiteUrl?: Record<string, never>;
            /** @example 0 */
            sortOrder: number;
            /** @example false */
            isFeatured: boolean;
            /** @example true */
            isActive: boolean;
            metaTitle?: Record<string, never>;
            metaDescription?: Record<string, never>;
            /** Format: date-time */
            createdAt?: string;
            /** Format: date-time */
            updatedAt?: string;
        };
        CreateBrandRequestDto: {
            /** @example Innisfree */
            name: string;
            /**
             * @description Chữ thường không dấu, nối bằng dấu gạch ngang
             * @example innisfree
             */
            slug: string;
            /** @example https://cdn.glowup.vn/brands/innisfree-logo.png */
            logoUrl?: Record<string, never>;
            /** @example https://cdn.glowup.vn/brands/innisfree-banner.jpg */
            bannerUrl?: Record<string, never>;
            /** @example Thương hiệu mỹ phẩm thiên nhiên đến từ đảo Jeju */
            description?: Record<string, never>;
            /** @example Hàn Quốc */
            countryOfOrigin?: Record<string, never>;
            /** @example https://www.innisfree.com */
            websiteUrl?: Record<string, never>;
            /**
             * @default 0
             * @example 0
             */
            sortOrder: number;
            /**
             * @default false
             * @example false
             */
            isFeatured: boolean;
            /**
             * @default true
             * @example true
             */
            isActive: boolean;
            /** @example Innisfree chính hãng - GlowUp */
            metaTitle?: Record<string, never>;
            metaDescription?: Record<string, never>;
        };
        UpdateBrandRequestDto: {
            /** @example Innisfree */
            name?: string;
            /**
             * @description Chữ thường không dấu, nối bằng dấu gạch ngang
             * @example innisfree
             */
            slug?: string;
            /** @example https://cdn.glowup.vn/brands/innisfree-logo.png */
            logoUrl?: Record<string, never>;
            /** @example https://cdn.glowup.vn/brands/innisfree-banner.jpg */
            bannerUrl?: Record<string, never>;
            /** @example Thương hiệu mỹ phẩm thiên nhiên đến từ đảo Jeju */
            description?: Record<string, never>;
            /** @example Hàn Quốc */
            countryOfOrigin?: Record<string, never>;
            /** @example https://www.innisfree.com */
            websiteUrl?: Record<string, never>;
            /**
             * @default 0
             * @example 0
             */
            sortOrder: number;
            /**
             * @default false
             * @example false
             */
            isFeatured: boolean;
            /**
             * @default true
             * @example true
             */
            isActive: boolean;
            /** @example Innisfree chính hãng - GlowUp */
            metaTitle?: Record<string, never>;
            metaDescription?: Record<string, never>;
        };
        AddToCartDto: {
            /** @description ID của biến thể sản phẩm (product_variant_id) */
            productVariantId: string;
            /**
             * @description Số lượng thêm vào giỏ (1 - 99)
             * @example 1
             */
            quantity: number;
            /** @description Session ID dành cho khách vãng lai (Guest) chưa đăng nhập */
            sessionId?: string;
            /** @description ID chi nhánh nếu khách chọn click-and-collect */
            storeId?: string;
        };
        UpdateCartItemDto: {
            /**
             * @description Số lượng mới cập nhật (1 - 99)
             * @example 2
             */
            quantity?: number;
            /**
             * @description Trạng thái chọn để thanh toán (Partial Checkout)
             * @example true
             */
            isSelected?: boolean;
            /** @description Session ID dành cho khách vãng lai nếu chưa login */
            sessionId?: string;
        };
        MergeCartDto: {
            /** @description Session ID của khách vãng lai cần gộp vào tài khoản hiện tại */
            sessionId: string;
        };
        UpdateCustomerProfileDto: {
            /** @description Họ và tên khách hàng */
            fullName?: string;
            /**
             * @description Số điện thoại
             * @example 0901234567
             */
            phone?: string;
            /**
             * @description Giới tính (MALE, FEMALE, OTHER)
             * @enum {string}
             */
            gender?: "MALE" | "FEMALE" | "OTHER";
            /**
             * @description Ngày sinh (YYYY-MM-DD)
             * @example 1995-10-25
             */
            dateOfBirth?: string;
        };
        CreateCustomerAddressDto: {
            /** @description Nhãn gợi nhớ (VD: Nhà riêng, Công ty) */
            label?: string;
            /** @description Họ và tên người nhận hàng */
            recipientName: string;
            /**
             * @description Số điện thoại người nhận hàng
             * @example 0901234567
             */
            phone: string;
            /** @description Địa chỉ cụ thể (Số nhà, tên đường) */
            addressLine: string;
            /** @description Tỉnh / Thành phố */
            city: string;
            /** @description Quận / Huyện */
            district: string;
            /** @description Phường / Xã */
            ward: string;
            /**
             * @description Đặt làm địa chỉ nhận hàng mặc định
             * @default false
             */
            isDefault: boolean;
        };
        UpdateCustomerAddressDto: {
            /** @description Nhãn gợi nhớ */
            label?: string;
            /** @description Họ và tên người nhận hàng */
            recipientName?: string;
            /** @description Số điện thoại người nhận hàng */
            phone?: string;
            /** @description Địa chỉ cụ thể */
            addressLine?: string;
            /** @description Tỉnh / Thành phố */
            city?: string;
            /** @description Quận / Huyện */
            district?: string;
            /** @description Phường / Xã */
            ward?: string;
            /** @description Đặt làm địa chỉ nhận hàng mặc định */
            isDefault?: boolean;
        };
        OrderItemDto: {
            /** Format: uuid */
            variantId: string;
            quantity: number;
        };
        PreviewOrderDto: {
            /** @description If omitted, uses selected cart items */
            items?: components["schemas"]["OrderItemDto"][];
            couponCode?: string;
            usePoints?: number;
            /** Format: uuid */
            storeId?: string;
        };
        ShippingAddressDto: {
            recipientName: string;
            phone: string;
            addressLine: string;
            ward?: string;
            district?: string;
            city: string;
        };
        CreateOrderDto: {
            /** @description SHA256 quoteVersion từ POST /orders/preview; cần xác nhận lại nếu giá đổi */
            quoteVersion: string;
            shippingAddress: components["schemas"]["ShippingAddressDto"];
            /**
             * @description Only COD is enabled; online payments require the payment module
             * @default COD
             */
            paymentMethod: string;
            /** @description If omitted, uses selected cart items */
            items?: components["schemas"]["OrderItemDto"][];
            couponCode?: string;
            usePoints?: number;
            /** Format: uuid */
            storeId?: string;
            note?: string;
        };
        CancelOrderDto: {
            reason?: string;
        };
        OrderSalesStaffDto: {
            id: string;
            employeeCode: string;
            fullName: string;
        };
        OrderCustomerSummaryDto: {
            id: string;
            fullName?: Record<string, never> | null;
            phone?: Record<string, never> | null;
            email?: Record<string, never> | null;
        };
        OrderStoreSummaryDto: {
            id: string;
            name: string;
            code: string;
        };
        AdminOrderItemDto: {
            id: string;
            productVariantId: string;
            sku: string;
            productName: string;
            variantName: string;
            imageUrl?: Record<string, never> | null;
            quantity: number;
            unitPrice: number;
            discountAmount: number;
            totalPrice: number;
        };
        AdminOrderPaymentDto: {
            id: string;
            /** @example COD */
            paymentMethod: string;
            amount: number;
            /** @example PENDING */
            status: string;
            transactionId?: Record<string, never> | null;
            paidAt?: Record<string, never> | null;
            /** Format: date-time */
            createdAt: string;
        };
        AdminOrderRefundDto: {
            id: string;
            paymentId?: Record<string, never> | null;
            amount: number;
            reason: string;
            /** @example PENDING */
            status: string;
            processedAt?: Record<string, never> | null;
            /** Format: date-time */
            createdAt: string;
        };
        AdminOrderShipmentDto: {
            id: string;
            shipmentCode: string;
            carrierCode: string;
            trackingCode?: Record<string, never> | null;
            status: string;
            /** Format: date-time */
            createdAt: string;
        };
        OrderUserSummaryDto: {
            id: string;
            fullName: string;
        };
        AdminOrderStatusHistoryDto: {
            id: string;
            /** @example CONFIRMED */
            status: string;
            note?: Record<string, never> | null;
            /** @description Người đổi trạng thái; null nếu do khách hoặc hệ thống */
            changedBy?: components["schemas"]["OrderUserSummaryDto"] | null;
            /** Format: date-time */
            createdAt: string;
        };
        AdminOrderActionsDto: {
            /** @description Hiện nút "Xác nhận" */
            canConfirm: boolean;
            /** @description Trạng thái kế tiếp hợp lệ cho dropdown đổi trạng thái (rỗng nếu không đổi được) */
            nextStatuses: ("PROCESSING" | "SHIPPING" | "DELIVERED" | "COMPLETED")[];
            /** @description Hiện nút "Hủy đơn" (PENDING, CONFIRMED, PROCESSING) */
            canCancel: boolean;
        };
        AdminOrderDetailDto: {
            id: string;
            orderNumber: string;
            /** @example ONLINE */
            orderType: string;
            /** @example PENDING */
            status: string;
            subtotal: number;
            discountAmount: number;
            shippingFee: number;
            taxAmount: number;
            totalAmount: number;
            loyaltyPointsUsed: number;
            shippingAddress?: Record<string, never> | null;
            note?: Record<string, never> | null;
            couponCode?: Record<string, never> | null;
            salesStaff?: components["schemas"]["OrderSalesStaffDto"] | null;
            customer?: components["schemas"]["OrderCustomerSummaryDto"] | null;
            store: components["schemas"]["OrderStoreSummaryDto"];
            items: components["schemas"]["AdminOrderItemDto"][];
            payments: components["schemas"]["AdminOrderPaymentDto"][];
            refunds: components["schemas"]["AdminOrderRefundDto"][];
            shipments: components["schemas"]["AdminOrderShipmentDto"][];
            /** @description Dòng thời gian trạng thái, cũ trước mới sau */
            statusHistory: components["schemas"]["AdminOrderStatusHistoryDto"][];
            /** @description Các thao tác hợp lệ với trạng thái hiện tại */
            actions: components["schemas"]["AdminOrderActionsDto"];
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
        ConfirmOrderDto: {
            /**
             * @description Ghi chú lưu vào lịch sử trạng thái
             * @example Đã gọi xác nhận với khách
             */
            note?: string;
        };
        UpdateOrderStatusDto: {
            /**
             * @example PROCESSING
             * @enum {string}
             */
            status: "PROCESSING" | "SHIPPING" | "DELIVERED" | "COMPLETED";
            /**
             * @description Ghi chú lưu vào lịch sử trạng thái
             * @example Đã bàn giao cho GHN
             */
            note?: string;
        };
        CancelOrderByAdminDto: {
            /**
             * @description Lý do hủy, lưu vào lịch sử trạng thái và phiếu hoàn tiền
             * @example Khách đổi ý, gọi điện xin hủy
             */
            reason: string;
        };
        CreateReviewDto: {
            productId: string;
            orderId?: string;
            rating: number;
            title?: string;
            content?: string;
        };
        SelectionItemDto: {
            variantId: string;
            quantity: number;
        };
        CouponValidationDto: {
            code: string;
            items: components["schemas"]["SelectionItemDto"][];
            usePoints?: number;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    AuthController_register: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RegisterDto"];
            };
        };
        responses: {
            /** @description Đăng ký thành công, vui lòng kiểm tra email */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 201 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["MessageResponseDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    AuthController_login: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LoginDto"];
            };
        };
        responses: {
            /** @description Đăng nhập thành công */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["LoginResponseDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    AuthController_verifyEmail: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["VerifyEmailDto"];
            };
        };
        responses: {
            /** @description Xác thực thành công */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["MessageResponseDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    AuthController_resendVerification: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ResendOtpDto"];
            };
        };
        responses: {
            /** @description Đã gửi lại email xác thực */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["MessageResponseDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    AuthController_refreshToken: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RefreshTokenDto"];
            };
        };
        responses: {
            /** @description Lấy token mới thành công */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["RefreshTokenResponseDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    AuthController_logout: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LogoutDto"];
            };
        };
        responses: {
            /** @description Đăng xuất thành công */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["MessageResponseDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    AuthController_forgotPassword: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ForgotPasswordDto"];
            };
        };
        responses: {
            /** @description Nếu email tồn tại, link đã được gửi */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["MessageResponseDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    AuthController_resetPassword: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ResetPasswordDto"];
            };
        };
        responses: {
            /** @description Đổi mật khẩu thành công */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["MessageResponseDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    AuthController_getMe: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Thông tin tài khoản đang đăng nhập */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: {
                            [key: string]: unknown;
                        };
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    OAuthController_google: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GoogleOAuthDto"];
            };
        };
        responses: {
            /** @description GlowUp session or bound onboarding/link challenge; never treat a challenge as login */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["LoginResponseDto"] | {
                            /** @enum {string} */
                            code: "ACCOUNT_LINK_REQUIRED" | "EMAIL_VERIFICATION_REQUIRED";
                            challenge: string;
                            /** @example 600 */
                            expiresIn: number;
                        };
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description DTO invalid, unsupported fields or email mismatch */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Invalid provider token, expired/replayed challenge or invalid verification code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Account inactive, account login required or challenge belongs to another account */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Identity already owned by another account or email already sent */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After header contains seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Provider, email or distributed rate-limit store unavailable/unconfigured */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    OAuthController_facebook: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["FacebookOAuthDto"];
            };
        };
        responses: {
            /** @description GlowUp session or bound onboarding/link challenge; never treat a challenge as login */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["LoginResponseDto"] | {
                            /** @enum {string} */
                            code: "ACCOUNT_LINK_REQUIRED" | "EMAIL_VERIFICATION_REQUIRED";
                            challenge: string;
                            /** @example 600 */
                            expiresIn: number;
                        };
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description DTO invalid, unsupported fields or email mismatch */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Invalid provider token, expired/replayed challenge or invalid verification code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Account inactive, account login required or challenge belongs to another account */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Identity already owned by another account or email already sent */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After header contains seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Provider, email or distributed rate-limit store unavailable/unconfigured */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    OAuthController_email: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OAuthEmailDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: {
                            [key: string]: unknown;
                        };
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description DTO invalid, unsupported fields or email mismatch */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Invalid provider token, expired/replayed challenge or invalid verification code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Account inactive, account login required or challenge belongs to another account */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Identity already owned by another account or email already sent */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After header contains seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Provider, email or distributed rate-limit store unavailable/unconfigured */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    OAuthController_complete: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OAuthCompleteDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["LoginResponseDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description DTO invalid, unsupported fields or email mismatch */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Invalid provider token, expired/replayed challenge or invalid verification code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Account inactive, account login required or challenge belongs to another account */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Identity already owned by another account or email already sent */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After header contains seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Provider, email or distributed rate-limit store unavailable/unconfigured */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    OAuthController_link: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OAuthCompleteDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["LoginResponseDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description DTO invalid, unsupported fields or email mismatch */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Invalid provider token, expired/replayed challenge or invalid verification code */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Account inactive, account login required or challenge belongs to another account */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Identity already owned by another account or email already sent */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After header contains seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Provider, email or distributed rate-limit store unavailable/unconfigured */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    UploadAdminController_uploadImage: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * Format: binary
                     * @description Ảnh JPG, PNG hoặc WEBP, tối đa 5 MB
                     */
                    file: string;
                    /** @enum {string} */
                    folder: "products" | "brands" | "categories";
                };
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 201 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["UploadImageResponseDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Thiếu ảnh, sai định dạng hoặc sai folder */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Ảnh vượt quá 5 MB */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Kho lưu ảnh chưa cấu hình hoặc đang lỗi */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    PosSessionController_getCurrent: {
        parameters: {
            query: {
                /** @description Cửa hàng cần xem ca đang mở */
                storeId: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Cửa hàng ngoài phạm vi của bạn */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    PosSessionController_open: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OpenPosSessionDto"];
            };
        };
        responses: {
            /** @description Cửa hàng ngừng hoạt động hoặc là kho tổng */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Cửa hàng hoặc bạn đang có ca chưa đóng */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    PosSessionController_close: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ClosePosSessionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["PosSessionResponseDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Không tìm thấy ca */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Ca đã đóng */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    PosSessionController_reconcile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReconcilePosSessionDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["PosSessionResponseDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Ca lệch tiền mà chưa có giải trình */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Ca chưa đóng hoặc đã chốt */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    PosSessionAdminController_getSessions: {
        parameters: {
            query?: {
                order?: "ASC" | "DESC";
                page?: number;
                limit?: number;
                storeId?: string;
                /** @description Lọc theo thu ngân (id tài khoản) */
                cashierId?: string;
                status?: "OPEN" | "CLOSED" | "RECONCILED";
                /** @description Mở ca từ ngày (giờ Việt Nam), dạng YYYY-MM-DD */
                fromDate?: string;
                /** @description Mở ca đến hết ngày (giờ Việt Nam), dạng YYYY-MM-DD */
                toDate?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Thiếu quyền PAYMENT_RECONCILE */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    InventoryAdminController_getInventory: {
        parameters: {
            query?: {
                order?: "ASC" | "DESC";
                page?: number;
                limit?: number;
                /** @description Lọc một cửa hàng / kho (phải thuộc phạm vi của bạn) */
                storeId?: string;
                categoryId?: string;
                brandId?: string;
                /** @description Tìm theo tên sản phẩm, SKU hoặc mã vạch */
                search?: string;
                /** @description LOW_STOCK: tồn ≤ ngưỡng tối thiểu; OUT_OF_STOCK: hết hàng khả dụng; IN_STOCK: còn hàng khả dụng */
                status?: "LOW_STOCK" | "OUT_OF_STOCK" | "IN_STOCK";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Cửa hàng ngoài phạm vi của bạn */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    InventoryAdminController_receive: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReceivePurchaseOrderDto"];
            };
        };
        responses: {
            /** @description Đơn chưa duyệt / đã nhận đủ, nhận vượt số đặt, lô hết hạn */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Không tìm thấy đơn đặt hàng */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Số lô trùng nhưng khác hạn dùng, hoặc đơn vừa được người khác nhận */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    InventoryAdminController_adjust: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AdjustInventoryDto"];
            };
        };
        responses: {
            /** @description Không đủ hàng, thiếu lý do hoặc thiếu thông tin lô */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Đụng phần đang giữ chỗ cho đơn online */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    InventoryPosController_getInventory: {
        parameters: {
            query: {
                order?: "ASC" | "DESC";
                page?: number;
                limit?: number;
                /** @description Cửa hàng đang trực */
                storeId: string;
                /** @description Tìm theo tên sản phẩm, SKU hoặc mã vạch */
                search?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Cửa hàng ngoài phạm vi của bạn */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    ProductCustomerController_getProducts: {
        parameters: {
            query?: {
                order?: "ASC" | "DESC";
                page?: number;
                limit?: number;
                /** @description Lọc theo ID danh mục (UUID) */
                categoryId?: string;
                /** @description Lọc theo ID thương hiệu (UUID) */
                brandId?: string;
                /** @description Giá tối thiểu (VNĐ) */
                minPrice?: number;
                /** @description Giá tối đa (VNĐ) */
                maxPrice?: number;
                /** @description Đánh giá tối thiểu (1 - 5 sao) */
                rating?: number;
                /** @description Lọc theo tag sản phẩm */
                tag?: string;
                /** @description Sắp xếp kết quả */
                sortBy?: "price_asc" | "price_desc" | "newest" | "bestseller" | "rating";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Danh sách sản phẩm thành công */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["PageDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    ProductCustomerController_searchProducts: {
        parameters: {
            query: {
                order?: "ASC" | "DESC";
                page?: number;
                limit?: number;
                /** @description Lọc theo ID danh mục (UUID) */
                categoryId?: string;
                /** @description Lọc theo ID thương hiệu (UUID) */
                brandId?: string;
                /** @description Giá tối thiểu (VNĐ) */
                minPrice?: number;
                /** @description Giá tối đa (VNĐ) */
                maxPrice?: number;
                /** @description Đánh giá tối thiểu (1 - 5 sao) */
                rating?: number;
                /** @description Lọc theo tag sản phẩm */
                tag?: string;
                /** @description Sắp xếp kết quả */
                sortBy?: "price_asc" | "price_desc" | "newest" | "bestseller" | "rating";
                /** @description Từ khóa tìm kiếm (tên, thương hiệu, thành phần, danh mục, tag...) */
                q: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Kết quả tìm kiếm sản phẩm */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["PageDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    ProductCustomerController_suggestProducts: {
        parameters: {
            query: {
                /** @description Từ khóa bắt đầu gõ để tìm kiếm gợi ý */
                q: string;
                /** @description Số lượng kết quả gợi ý trả về */
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Danh sách gợi ý sản phẩm */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["ProductSuggestionDto"][];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    ProductCustomerController_getProductBySlug: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Chi tiết sản phẩm */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["ProductResponseDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    ProductCustomerController_getRelatedProducts: {
        parameters: {
            query?: {
                /** @description Số lượng sản phẩm liên quan (1 - 20) */
                limit?: number;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Danh sách sản phẩm liên quan */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["ProductResponseDto"][];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    ProductAdminController_getProducts: {
        parameters: {
            query?: {
                order?: "ASC" | "DESC";
                page?: number;
                limit?: number;
                /** @description Tìm theo tên hoặc SKU */
                search?: string;
                categoryId?: string;
                brandId?: string;
                /** @description Lọc theo trạng thái kinh doanh */
                isActive?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: {
                            [key: string]: unknown;
                        };
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    ProductAdminController_createProduct: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateProductRequestDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 201 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["ProductResponseDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Sai giá, sai thuộc tính biến thể, trùng tổ hợp, danh mục đang ẩn */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Không tìm thấy danh mục hoặc thương hiệu */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Trùng slug, SKU hoặc mã vạch */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    ProductAdminController_getProductById: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["ProductResponseDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Không tìm thấy sản phẩm */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    ProductAdminController_deleteProduct: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Không tìm thấy sản phẩm */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    ProductAdminController_updateProduct: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateProductRequestDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["ProductResponseDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Không tìm thấy sản phẩm, danh mục hoặc thương hiệu */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Trùng slug hoặc SKU */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    ProductVariantAdminController_getVariants: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                productId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["ProductVariantResponseDto"][];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Không tìm thấy sản phẩm */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    ProductVariantAdminController_createVariant: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                productId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateProductVariantRequestDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 201 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["ProductVariantResponseDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Giá trị thuộc tính không khớp với tên thuộc tính của sản phẩm */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Không tìm thấy sản phẩm */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Trùng tổ hợp thuộc tính, SKU hoặc mã vạch */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    ProductVariantAdminController_deleteVariant: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Không tìm thấy biến thể */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    ProductVariantAdminController_updateVariant: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateProductVariantRequestDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["ProductVariantResponseDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Không tìm thấy biến thể */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Trùng tổ hợp thuộc tính, SKU hoặc mã vạch */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    CommerceController_listReturns: {
        parameters: {
            query?: {
                order?: "ASC" | "DESC";
                page?: number;
                limit?: number;
                status?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode?: number;
                        /** @example true */
                        success?: boolean;
                        message?: string;
                        data?: {
                            items?: {
                                /** Format: uuid */
                                id?: string;
                                returnCode?: string;
                                /** Format: uuid */
                                orderId?: string;
                                /** @enum {string} */
                                returnType?: "REFUND" | "EXCHANGE";
                                status?: string;
                                reason?: string;
                                /**
                                 * @description Decimal tiền VND, không chuyển qua float
                                 * @example 100000
                                 */
                                refundAmount?: string;
                                /** Format: date-time */
                                createdAt?: string;
                            }[];
                            page?: number;
                            limit?: number;
                            total?: number;
                        };
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Thiếu policy hoặc provider cần thiết; chưa phát sinh giao dịch */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
        };
    };
    CommerceController_createReturn: {
        parameters: {
            query?: never;
            header: {
                "idempotency-key": string;
                /** @description 8–128 ký tự; retry cùng payload trả cùng kết quả; payload khác trả 409 */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateReturnDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 201 */
                        statusCode?: number;
                        /** @example true */
                        success?: boolean;
                        message?: string;
                        data?: {
                            /** Format: uuid */
                            id: string;
                            returnCode: string;
                            /** @example REQUESTED */
                            status: string;
                        };
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Thiếu policy hoặc provider cần thiết; chưa phát sinh giao dịch */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
        };
    };
    CommerceController_returnDetail: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode?: number;
                        /** @example true */
                        success?: boolean;
                        message?: string;
                        data?: {
                            /** Format: uuid */
                            id?: string;
                            returnCode?: string;
                            /** Format: uuid */
                            orderId?: string;
                            /** @enum {string} */
                            returnType?: "REFUND" | "EXCHANGE";
                            status?: string;
                            reason?: string;
                            /**
                             * @description Decimal tiền VND, không chuyển qua float
                             * @example 100000
                             */
                            refundAmount?: string;
                            /** Format: date-time */
                            createdAt?: string;
                            items?: {
                                /** Format: uuid */
                                id?: string;
                                /** Format: uuid */
                                orderItemId?: string;
                                /** Format: uuid */
                                productVariantId?: string;
                                quantity?: number;
                                condition?: string | null;
                                /**
                                 * @description Decimal tiền VND, không chuyển qua float
                                 * @example 100000
                                 */
                                refundAmount?: string;
                                pointsToRestore?: number;
                            }[];
                            quoteVersion?: number;
                            /** Format: date-time */
                            quoteExpiresAt?: string | null;
                            /** @description Báo giá public gồm lines, fee, credit, payable; không có cost */
                            quoteSnapshot?: Record<string, never> | null;
                            /** @description replacementOrderId, creditApplied, additionalDue, refundDue, status; tiền là Decimal string */
                            settlement?: Record<string, never> | null;
                            refunds?: {
                                /** Format: uuid */
                                id?: string;
                                /**
                                 * @description Decimal tiền VND, không chuyển qua float
                                 * @example 100000
                                 */
                                amount?: string;
                                status?: string;
                            }[];
                            history?: {
                                status?: string;
                                note?: string | null;
                                /** Format: date-time */
                                createdAt?: string;
                            }[];
                            attachments?: {
                                /** Format: uuid */
                                id?: string;
                                mimeType?: string;
                                size?: number;
                            }[];
                        };
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Thiếu policy hoặc provider cần thiết; chưa phát sinh giao dịch */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
        };
    };
    CommerceController_accept: {
        parameters: {
            query?: never;
            header: {
                "idempotency-key": string;
                /** @description 8–128 ký tự; retry cùng payload trả cùng kết quả; payload khác trả 409 */
                "Idempotency-Key": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AcceptExchangeDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 201 */
                        statusCode?: number;
                        /** @example true */
                        success?: boolean;
                        message?: string;
                        data?: {
                            /** Format: uuid */
                            replacementOrderId?: string;
                            settlement?: {
                                /** Format: uuid */
                                id?: string;
                                /** Format: uuid */
                                returnOrderId?: string;
                                /** Format: uuid */
                                replacementOrderId?: string;
                                /**
                                 * @description Decimal tiền VND, không chuyển qua float
                                 * @example 100000
                                 */
                                returnCredit?: string;
                                /**
                                 * @description Decimal tiền VND, không chuyển qua float
                                 * @example 100000
                                 */
                                replacementPayable?: string;
                                /**
                                 * @description Decimal tiền VND, không chuyển qua float
                                 * @example 100000
                                 */
                                creditApplied?: string;
                                /**
                                 * @description Decimal tiền VND, không chuyển qua float
                                 * @example 100000
                                 */
                                additionalDue?: string;
                                /**
                                 * @description Decimal tiền VND, không chuyển qua float
                                 * @example 100000
                                 */
                                refundDue?: string;
                                /** @example ACTIVE */
                                status?: string;
                            };
                        };
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Thiếu policy hoặc provider cần thiết; chưa phát sinh giao dịch */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
        };
    };
    CommerceController_track: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode?: number;
                        /** @example true */
                        success?: boolean;
                        message?: string;
                        data?: {
                            /** Format: uuid */
                            id?: string;
                            status?: string;
                            shipments?: {
                                /** Format: uuid */
                                id?: string;
                                carrierCode?: string;
                                trackingCode?: string | null;
                                trackingUrl?: string | null;
                                status?: string;
                                events?: Record<string, never>[];
                            }[];
                            statusHistories?: Record<string, never>[];
                        };
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Thiếu policy hoặc provider cần thiết; chưa phát sinh giao dịch */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
        };
    };
    CommerceController_upload: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /** Format: binary */
                    file: string;
                };
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 201 */
                        statusCode?: number;
                        /** @example true */
                        success?: boolean;
                        message?: string;
                        data?: {
                            /** Format: uuid */
                            attachmentId?: string;
                            mimeType?: string;
                            size?: number;
                        };
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Thiếu policy hoặc provider cần thiết; chưa phát sinh giao dịch */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
        };
    };
    CommerceController_image: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode?: number;
                        /** @example true */
                        success?: boolean;
                        message?: string;
                        data?: {
                            /** Format: uri */
                            url?: string;
                            /** @example 300 */
                            expiresIn?: number;
                        };
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Thiếu policy hoặc provider cần thiết; chưa phát sinh giao dịch */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
        };
    };
    CommerceController_getLoyalty: {
        parameters: {
            query?: {
                order?: "ASC" | "DESC";
                page?: number;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode?: number;
                        /** @example true */
                        success?: boolean;
                        message?: string;
                        data?: {
                            balance?: number;
                            tier?: Record<string, never> | null;
                            nextTier?: Record<string, never> | null;
                            history?: {
                                /** Format: uuid */
                                id?: string;
                                /** Format: uuid */
                                orderId?: string | null;
                                points?: number;
                                type?: string;
                                description?: string | null;
                                /** Format: date-time */
                                createdAt?: string;
                            }[];
                            page?: number;
                            limit?: number;
                            total?: number;
                        };
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Thiếu policy hoặc provider cần thiết; chưa phát sinh giao dịch */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
        };
    };
    CommerceController_rewards: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode?: number;
                        /** @example true */
                        success?: boolean;
                        message?: string;
                        data?: {
                            code?: string;
                            version?: string;
                            pointsCost?: number;
                            discountType?: string;
                            discountValue?: number;
                            minOrderAmount?: number;
                            validityDays?: number;
                        }[];
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Thiếu policy hoặc provider cần thiết; chưa phát sinh giao dịch */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
        };
    };
    CommerceController_redeem: {
        parameters: {
            query?: never;
            header: {
                "idempotency-key": string;
                /** @description 8–128 ký tự; retry cùng payload trả cùng kết quả; payload khác trả 409 */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RedeemDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 201 */
                        statusCode?: number;
                        /** @example true */
                        success?: boolean;
                        message?: string;
                        data?: {
                            /** Format: uuid */
                            redemptionId?: string;
                            balance?: number;
                            coupon?: {
                                /** Format: uuid */
                                id?: string;
                                code?: string;
                                discountType?: string;
                                /**
                                 * @description Decimal tiền VND, không chuyển qua float
                                 * @example 100000
                                 */
                                discountValue?: string;
                                /** Format: date-time */
                                endDate?: string;
                            };
                        };
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Thiếu policy hoặc provider cần thiết; chưa phát sinh giao dịch */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
        };
    };
    CommerceController_toggle: {
        parameters: {
            query?: never;
            header: {
                "idempotency-key": string;
                /** @description 8–128 ký tự; retry cùng payload trả cùng kết quả; payload khác trả 409 */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WishlistDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 201 */
                        statusCode?: number;
                        /** @example true */
                        success?: boolean;
                        message?: string;
                        data?: {
                            /** Format: uuid */
                            productId?: string;
                            isWishlisted?: boolean;
                        };
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Thiếu policy hoặc provider cần thiết; chưa phát sinh giao dịch */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
        };
    };
    CommerceController_select: {
        parameters: {
            query?: never;
            header: {
                "idempotency-key": string;
                /** @description 8–128 ký tự; retry cùng payload trả cùng kết quả; payload khác trả 409 */
                "Idempotency-Key": string;
            };
            path: {
                productId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WishlistStateDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode?: number;
                        /** @example true */
                        success?: boolean;
                        message?: string;
                        data?: {
                            /** Format: uuid */
                            productId?: string;
                            isWishlisted?: boolean;
                        };
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Thiếu policy hoặc provider cần thiết; chưa phát sinh giao dịch */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
        };
    };
    CommerceController_listWishlist: {
        parameters: {
            query?: {
                order?: "ASC" | "DESC";
                page?: number;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode?: number;
                        /** @example true */
                        success?: boolean;
                        message?: string;
                        data?: {
                            items?: Record<string, never>[];
                            page?: number;
                            limit?: number;
                            total?: number;
                        };
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Thiếu policy hoặc provider cần thiết; chưa phát sinh giao dịch */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
        };
    };
    CommerceController_listNotifications: {
        parameters: {
            query?: {
                order?: "ASC" | "DESC";
                page?: number;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode?: number;
                        /** @example true */
                        success?: boolean;
                        message?: string;
                        data?: {
                            items?: Record<string, never>[];
                            page?: number;
                            limit?: number;
                            total?: number;
                            unreadCount?: number;
                        };
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Thiếu policy hoặc provider cần thiết; chưa phát sinh giao dịch */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
        };
    };
    CommerceController_read: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode?: number;
                        /** @example true */
                        success?: boolean;
                        message?: string;
                        data?: {
                            /** Format: uuid */
                            id?: string;
                            isRead?: boolean;
                        };
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Thiếu policy hoặc provider cần thiết; chưa phát sinh giao dịch */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
        };
    };
    CommerceController_register: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DeviceDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 201 */
                        statusCode?: number;
                        /** @example true */
                        success?: boolean;
                        message?: string;
                        data?: {
                            /** Format: uuid */
                            id?: string;
                            platform?: string;
                            isActive?: boolean;
                        };
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Thiếu policy hoặc provider cần thiết; chưa phát sinh giao dịch */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
        };
    };
    CommerceController_unregister: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode?: number;
                        /** @example true */
                        success?: boolean;
                        message?: string;
                        data?: {
                            /** Format: uuid */
                            id?: string;
                            platform?: string;
                            isActive?: boolean;
                        };
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Thiếu policy hoặc provider cần thiết; chưa phát sinh giao dịch */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
        };
    };
    CategoryCustomerController_getCategoryTree: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Cây danh mục đa cấp */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["CategoryTreeResponseDto"][];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    CategoryAdminController_getCategories: {
        parameters: {
            query?: {
                order?: "ASC" | "DESC";
                page?: number;
                limit?: number;
                /** @description Tìm theo tên danh mục */
                search?: string;
                /** @description Lọc theo trạng thái hoạt động */
                isActive?: boolean;
                /** @description Chỉ lấy các danh mục con trực tiếp của danh mục này */
                parentId?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: {
                            [key: string]: unknown;
                        };
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    CategoryAdminController_createCategory: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateCategoryRequestDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 201 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["CategoryResponseDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Không tìm thấy danh mục cha */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Slug đã tồn tại */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    CategoryAdminController_getCategoryTree: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["CategoryResponseDto"][];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    CategoryAdminController_getCategoryById: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["CategoryResponseDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Không tìm thấy danh mục */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    CategoryAdminController_deleteCategory: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Không tìm thấy danh mục */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Còn danh mục con đang hoạt động */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    CategoryAdminController_updateCategory: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateCategoryRequestDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["CategoryResponseDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Đổi cha tạo thành vòng lặp */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Không tìm thấy danh mục hoặc danh mục cha */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Slug đã tồn tại */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    BrandAdminController_getBrands: {
        parameters: {
            query?: {
                order?: "ASC" | "DESC";
                page?: number;
                limit?: number;
                /** @description Tìm theo tên thương hiệu */
                search?: string;
                /** @description Lọc theo trạng thái kinh doanh */
                isActive?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: {
                            [key: string]: unknown;
                        };
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    BrandAdminController_createBrand: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateBrandRequestDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 201 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["BrandResponseDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Slug đã tồn tại */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    BrandAdminController_getBrandById: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["BrandResponseDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Không tìm thấy thương hiệu */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    BrandAdminController_deleteBrand: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Không tìm thấy thương hiệu */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Thương hiệu đang có sản phẩm */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    BrandAdminController_updateBrand: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateBrandRequestDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["BrandResponseDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Không tìm thấy thương hiệu */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Slug đã tồn tại */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    CartController_addToCart: {
        parameters: {
            query?: never;
            header?: {
                /** @description Session ID dành cho khách vãng lai */
                "x-session-id"?: string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AddToCartDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 201 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: {
                            [key: string]: unknown;
                        };
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    CartController_getCart: {
        parameters: {
            query?: never;
            header?: {
                /** @description Session ID dành cho khách vãng lai */
                "x-session-id"?: string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: {
                            [key: string]: unknown;
                        };
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    CartController_updateCartItem: {
        parameters: {
            query?: never;
            header?: {
                /** @description Session ID dành cho khách vãng lai */
                "x-session-id"?: string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateCartItemDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: {
                            [key: string]: unknown;
                        };
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    CartController_removeCartItem: {
        parameters: {
            query?: never;
            header?: {
                /** @description Session ID dành cho khách vãng lai */
                "x-session-id"?: string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: {
                            [key: string]: unknown;
                        };
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    CartController_mergeCart: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MergeCartDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 201 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: {
                            [key: string]: unknown;
                        };
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    CustomerController_getProfile: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: {
                            [key: string]: unknown;
                        };
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    CustomerController_updateProfile: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateCustomerProfileDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: {
                            [key: string]: unknown;
                        };
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    CustomerController_getAddresses: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: {
                            [key: string]: unknown;
                        };
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    CustomerController_createAddress: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateCustomerAddressDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 201 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: {
                            [key: string]: unknown;
                        };
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    CustomerController_updateAddress: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateCustomerAddressDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: {
                            [key: string]: unknown;
                        };
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    CustomerController_deleteAddress: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: {
                            [key: string]: unknown;
                        };
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    CustomerController_setDefaultAddress: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: {
                            [key: string]: unknown;
                        };
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    CustomerAdminController_getCustomers: {
        parameters: {
            query?: {
                order?: "ASC" | "DESC";
                page?: number;
                limit?: number;
                /** @description Tìm theo tên, số điện thoại hoặc email */
                search?: string;
                /** @description Lọc theo hạng thành viên */
                loyaltyTierId?: string;
                /** @description Khách từng có đơn tại cửa hàng này */
                storeId?: string;
                sortBy?: "createdAt" | "totalSpent" | "totalPoints";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Thiếu quyền CUSTOMER_VIEW */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    CustomerOrderController_previewOrder: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PreviewOrderDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: {
                            [key: string]: unknown;
                        };
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    CustomerOrderController_createOrder: {
        parameters: {
            query?: never;
            header: {
                "idempotency-key": string;
                /** @description 8–128 ký tự, retry cùng payload trả cùng đơn hàng */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateOrderDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 201 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: {
                            [key: string]: unknown;
                        };
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    CustomerOrderController_getCustomerOrders: {
        parameters: {
            query?: {
                page?: number;
                limit?: number;
                status?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: {
                            [key: string]: unknown;
                        };
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    CustomerOrderController_getOrderDetail: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: {
                            [key: string]: unknown;
                        };
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    CustomerOrderController_cancelOrder: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CancelOrderDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: {
                            [key: string]: unknown;
                        };
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    OrderAdminController_getOrders: {
        parameters: {
            query?: {
                order?: "ASC" | "DESC";
                page?: number;
                limit?: number;
                /** @description Tìm theo mã đơn */
                search?: string;
                status?: "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPING" | "DELIVERED" | "COMPLETED" | "CANCELLED" | "RETURNED";
                orderType?: "ONLINE" | "POS";
                storeId?: string;
                /** @description Lọc đơn của một khách (xem lịch sử mua hàng) */
                customerId?: string;
                /** @description Từ ngày (giờ Việt Nam), dạng YYYY-MM-DD */
                fromDate?: string;
                /** @description Đến hết ngày (giờ Việt Nam), dạng YYYY-MM-DD */
                toDate?: string;
                /** @description Sắp theo ngày tạo hoặc giá trị đơn; chiều sắp dùng tham số order */
                sortBy?: "createdAt" | "totalAmount";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Thiếu quyền ORDER_ONLINE_VIEW */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    OrderAdminController_getOrderDetail: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["AdminOrderDetailDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Thiếu quyền hoặc đơn thuộc cửa hàng khác */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Không tìm thấy đơn hàng */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    OrderAdminController_confirmOrder: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConfirmOrderDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["AdminOrderDetailDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Đơn không ở trạng thái PENDING hoặc không đủ tồn kho */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Thiếu quyền ORDER_STATUS_UPDATE hoặc đơn thuộc cửa hàng khác */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Không tìm thấy đơn hàng */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    OrderAdminController_updateOrderStatus: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateOrderStatusDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["AdminOrderDetailDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Chuyển sai thứ tự hoặc không đủ hàng còn hạn để xuất */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Thiếu quyền ORDER_STATUS_UPDATE hoặc đơn thuộc cửa hàng khác */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Không tìm thấy đơn hàng */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    OrderAdminController_cancelOrder: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CancelOrderByAdminDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: components["schemas"]["AdminOrderDetailDto"];
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Đơn đã giao/hoàn tất/đã hủy, hoặc thiếu lý do */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Thiếu quyền ORDER_CANCEL hoặc đơn thuộc cửa hàng khác */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Không tìm thấy đơn hàng */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    ExperienceController_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateReviewDto"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 201 */
                        statusCode?: number;
                        /** @example true */
                        success?: boolean;
                        message?: string;
                        data?: {
                            /** Format: uuid */
                            id?: string;
                            /** Format: uuid */
                            productId?: string;
                            rating?: number;
                            title?: string;
                            content?: string;
                            isApproved?: boolean;
                            isVerifiedPurchase?: boolean;
                            reviewerName?: string;
                            adminReply?: string;
                            /** Format: date-time */
                            createdAt?: string;
                        };
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Thiếu policy hoặc provider cần thiết; chưa phát sinh giao dịch */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
        };
    };
    ExperienceController_list: {
        parameters: {
            query?: {
                rating?: number;
                sort?: "newest" | "rating_asc" | "rating_desc";
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode?: number;
                        /** @example true */
                        success?: boolean;
                        message?: string;
                        data?: {
                            items?: {
                                /** Format: uuid */
                                id?: string;
                                /** Format: uuid */
                                productId?: string;
                                rating?: number;
                                title?: string;
                                content?: string;
                                isApproved?: boolean;
                                isVerifiedPurchase?: boolean;
                                reviewerName?: string;
                                adminReply?: string;
                                /** Format: date-time */
                                createdAt?: string;
                            }[];
                            total?: number;
                            page?: number;
                            limit?: number;
                            histogram?: {
                                [key: string]: number;
                            };
                            avgRating?: number;
                            totalReviews?: number;
                        };
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Thiếu policy hoặc provider cần thiết; chưa phát sinh giao dịch */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
        };
    };
    ExperienceController_page: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode?: number;
                        /** @example true */
                        success?: boolean;
                        message?: string;
                        data?: {
                            title?: string;
                            slug?: string;
                            content?: string;
                            metaTitle?: string;
                            metaDescription?: string;
                            /** Format: date-time */
                            updatedAt?: string;
                        };
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Thiếu policy hoặc provider cần thiết; chưa phát sinh giao dịch */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
        };
    };
    ExperienceController_posts: {
        parameters: {
            query?: {
                categoryId?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode?: number;
                        /** @example true */
                        success?: boolean;
                        message?: string;
                        data?: {
                            items?: {
                                /** Format: uuid */
                                id?: string;
                                title?: string;
                                slug?: string;
                                /** @description HTML sanitized by the shared allowlist */
                                content?: string;
                                excerpt?: string;
                                featuredImage?: string;
                                metaTitle?: string;
                                metaDescription?: string;
                                /** Format: date-time */
                                publishedAt?: string;
                                viewsCount?: number;
                                author?: {
                                    fullName?: string;
                                };
                                category?: {
                                    /** Format: uuid */
                                    id?: string;
                                    name?: string;
                                    slug?: string;
                                };
                            }[];
                            total?: number;
                            page?: number;
                            limit?: number;
                        };
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Thiếu policy hoặc provider cần thiết; chưa phát sinh giao dịch */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
        };
    };
    ExperienceController_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                slug: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode?: number;
                        /** @example true */
                        success?: boolean;
                        message?: string;
                        data?: {
                            /** Format: uuid */
                            id?: string;
                            title?: string;
                            slug?: string;
                            /** @description HTML sanitized by the shared allowlist */
                            content?: string;
                            excerpt?: string;
                            featuredImage?: string;
                            metaTitle?: string;
                            metaDescription?: string;
                            /** Format: date-time */
                            publishedAt?: string;
                            viewsCount?: number;
                            author?: {
                                fullName?: string;
                            };
                            category?: {
                                /** Format: uuid */
                                id?: string;
                                name?: string;
                                slug?: string;
                            };
                        };
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Thiếu policy hoặc provider cần thiết; chưa phát sinh giao dịch */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
        };
    };
    ExperienceController_categories: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode?: number;
                        /** @example true */
                        success?: boolean;
                        message?: string;
                        data?: {
                            /** Format: uuid */
                            id?: string;
                            name?: string;
                            slug?: string;
                            description?: string;
                        }[];
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Thiếu policy hoặc provider cần thiết; chưa phát sinh giao dịch */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
        };
    };
    ExperienceController_faqs: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode?: number;
                        /** @example true */
                        success?: boolean;
                        message?: string;
                        data?: {
                            category?: string;
                            items?: {
                                /** Format: uuid */
                                id?: string;
                                question?: string;
                                answer?: string;
                            }[];
                        }[];
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Thiếu policy hoặc provider cần thiết; chưa phát sinh giao dịch */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
        };
    };
    ExperienceController_banners: {
        parameters: {
            query?: {
                position?: "HOME_HERO" | "HOME_SECONDARY" | "CATEGORY" | "PRODUCT" | "SIDEBAR";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode?: number;
                        /** @example true */
                        success?: boolean;
                        message?: string;
                        data?: {
                            /** Format: uuid */
                            id?: string;
                            title?: string;
                            imageUrl?: string;
                            linkUrl?: string | null;
                            position?: string;
                        }[];
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Thiếu policy hoặc provider cần thiết; chưa phát sinh giao dịch */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
        };
    };
    PromotionController_active: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode?: number;
                        /** @example true */
                        success?: boolean;
                        message?: string;
                        data?: {
                            items?: {
                                /** Format: uuid */
                                id?: string;
                                name?: string;
                                description?: string;
                                /** @enum {string} */
                                type?: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";
                                /** @description Prisma Decimal encoded as a JSON string */
                                value?: string;
                                minOrderAmount?: string;
                                maxDiscountAmount?: string | null;
                                /** Format: date-time */
                                startDate?: string;
                                /** Format: date-time */
                                endDate?: string;
                                isFlashSale?: boolean;
                                applicableProducts?: string[];
                                applicableCategories?: string[];
                                variants?: {
                                    /** Format: uuid */
                                    variantId?: string;
                                    remaining?: number;
                                    effectivePrice?: number;
                                    conditional?: boolean;
                                }[];
                            }[];
                            page?: number;
                            limit?: number;
                            /** Format: date-time */
                            serverTime?: string;
                            /** @example false */
                            reservation?: boolean;
                        };
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Thiếu policy hoặc provider cần thiết; chưa phát sinh giao dịch */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
        };
    };
    PromotionController_flash: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode?: number;
                        /** @example true */
                        success?: boolean;
                        message?: string;
                        data?: {
                            items?: {
                                /** Format: uuid */
                                id?: string;
                                name?: string;
                                description?: string;
                                /** @enum {string} */
                                type?: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";
                                /** @description Prisma Decimal encoded as a JSON string */
                                value?: string;
                                minOrderAmount?: string;
                                maxDiscountAmount?: string | null;
                                /** Format: date-time */
                                startDate?: string;
                                /** Format: date-time */
                                endDate?: string;
                                isFlashSale?: boolean;
                                applicableProducts?: string[];
                                applicableCategories?: string[];
                                variants?: {
                                    /** Format: uuid */
                                    variantId?: string;
                                    remaining?: number;
                                    effectivePrice?: number;
                                    conditional?: boolean;
                                }[];
                            }[];
                            page?: number;
                            limit?: number;
                            /** Format: date-time */
                            serverTime?: string;
                            /** @example false */
                            reservation?: boolean;
                        };
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Thiếu policy hoặc provider cần thiết; chưa phát sinh giao dịch */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
        };
    };
    PromotionController_validate: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CouponValidationDto"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode?: number;
                        /** @example true */
                        success?: boolean;
                        message?: string;
                        data?: {
                            valid?: boolean;
                            reasonCode?: string | null;
                            subtotal?: number;
                            lineDiscount?: number;
                            couponDiscount?: number;
                            pointsDiscount?: number;
                            pointsUsed?: number;
                            shippingFee?: number;
                            taxAmount?: number;
                            totalAmount?: number;
                            /** Format: uuid */
                            couponId?: string | null;
                            quoteVersion?: string;
                            /** Format: date-time */
                            calculatedAt?: string;
                            /** @example false */
                            reservation?: boolean;
                            items?: {
                                /** Format: uuid */
                                variantId?: string;
                                quantity?: number;
                                originalPrice?: number;
                                effectivePrice?: number;
                                tierDiscount?: number;
                                promotionDiscount?: number;
                                /** Format: uuid */
                                promotionId?: string | null;
                                couponDiscount?: number;
                                pointsValue?: number;
                                pointsUsed?: number;
                                cashValue?: number;
                            }[];
                        };
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Lỗi xác thực, dữ liệu, ownership hoặc xung đột nghiệp vụ */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
            /** @description Thiếu policy hoặc provider cần thiết; chưa phát sinh giao dịch */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode?: number;
                        success?: boolean;
                        /** @description Mã nghiệp vụ ổn định nếu có */
                        code?: string;
                        message?: string;
                    };
                };
            };
        };
    };
    SeoController_index: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Raw XML sitemap index */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/xml": string;
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    SeoController_part: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                source: string;
                page: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Raw XML; at most 1000 URLs */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/xml": string;
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    SeoController_robots: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Raw robots.txt for website root */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/plain": string;
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    HealthController_live: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Process is accepting HTTP requests */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: {
                            [key: string]: unknown;
                        };
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Required dependency unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
    HealthController_ready: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Database and required rate-limit store are available */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @example 200 */
                        statusCode: number;
                        /** @example true */
                        success: boolean;
                        message: string;
                        data: {
                            [key: string]: unknown;
                        };
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Validation failed */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Authentication or active session required */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Access denied */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description Rate limited; Retry-After is seconds */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
            /** @description A required dependency is unavailable; contains no connection details */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        statusCode: number;
                        /** @example false */
                        success: boolean;
                        message: string;
                        code?: string;
                        details?: {
                            [key: string]: unknown;
                        };
                        path: string;
                        /** Format: date-time */
                        timestamp: string;
                    };
                };
            };
        };
    };
}
