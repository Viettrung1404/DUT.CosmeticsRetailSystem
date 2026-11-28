export const RMA_STATUS_MAP: Record<
  string,
  {
    label: string;
    description: string;
    color: string;
    bg: string;
    icon: string;
    stepIndex: number;
  }
> = {
  DRAFT: {
    label: 'Bản nháp',
    description: 'Hồ sơ đổi trả đang được soạn thảo.',
    color: '#757575',
    bg: '#EEEEEE',
    icon: 'document-text-outline',
    stepIndex: 0,
  },
  SUBMITTED: {
    label: 'Đã nộp yêu cầu',
    description: 'Yêu cầu đổi trả đã được gửi lên hệ thống và đang chờ xét duyệt.',
    color: '#0288D1',
    bg: '#E1F5FE',
    icon: 'paper-plane-outline',
    stepIndex: 0,
  },
  REQUESTED: {
    label: 'Chờ thẩm định',
    description: 'Chuyên viên GlowUp Care đang thẩm định hồ sơ và bằng chứng unboxing.',
    color: '#F57C00',
    bg: '#FFF3E0',
    icon: 'hourglass-outline',
    stepIndex: 1,
  },
  APPROVED: {
    label: 'Đã phê duyệt',
    description: 'Hồ sơ đã được phê duyệt hợp lệ. Vui lòng gửi hàng về theo hướng dẫn bên dưới.',
    color: '#388E3C',
    bg: '#E8F5E9',
    icon: 'checkmark-circle-outline',
    stepIndex: 1,
  },
  SHIPPED: {
    label: 'Đang gửi trả hàng',
    description: 'Kiện hàng hoàn trả đang trên đường luân chuyển về kho thẩm định.',
    color: '#1976D2',
    bg: '#E3F2FD',
    icon: 'bicycle-outline',
    stepIndex: 2,
  },
  RECEIVED: {
    label: 'Đã tiếp nhận hàng',
    description: 'GlowUp đã tiếp nhận sản phẩm hoàn trả và chuẩn bị kiểm định KCS.',
    color: '#512DA8',
    bg: '#EDE7F6',
    icon: 'cube-outline',
    stepIndex: 2,
  },
  INSPECTING: {
    label: 'Đang kiểm định KCS',
    description: 'Chuyên viên QC đang kiểm tra tem niêm phong, dung tích và chất lượng sản phẩm.',
    color: '#7B1FA2',
    bg: '#F3E5F5',
    icon: 'search-outline',
    stepIndex: 3,
  },
  INSPECTED: {
    label: 'Đã kiểm định',
    description: 'Hoàn tất biên bản kiểm định chất lượng, chuyển sang bước quyết toán tài chính.',
    color: '#00796B',
    bg: '#E0F2F1',
    icon: 'shield-checkmark-outline',
    stepIndex: 3,
  },
  RESOLUTION_PENDING: {
    label: 'Chờ quyết toán hoàn tiền',
    description: 'Bộ phận tài chính đang xử lý hoàn tiền hoặc chuẩn bị đơn đổi hàng.',
    color: '#E65100',
    bg: '#FFF3E0',
    icon: 'cash-outline',
    stepIndex: 4,
  },
  DISPUTED: {
    label: 'Đang xử lý tranh chấp',
    description: 'Phát hiện sự sai khác giữa sản phẩm gửi trả và hồ sơ đăng ký. CSKH đang liên hệ.',
    color: '#D32F2F',
    bg: '#FFEBEE',
    icon: 'alert-circle-outline',
    stepIndex: 3,
  },
  COMPLETED: {
    label: 'Hoàn tất đổi trả',
    description: 'Đã hoàn tất quyết toán tiền hoàn trả / hàng đổi mới và đóng hồ sơ thành công.',
    color: '#2E7D32',
    bg: '#E8F5E9',
    icon: 'checkmark-done-circle-outline',
    stepIndex: 4,
  },
  REJECTED: {
    label: 'Bị từ chối',
    description: 'Yêu cầu đổi trả bị từ chối do không thỏa mãn điều kiện chính sách bảo hành.',
    color: '#C62828',
    bg: '#FFEBEE',
    icon: 'close-circle-outline',
    stepIndex: 1,
  },
  CANCELLED: {
    label: 'Đã hủy',
    description: 'Yêu cầu đổi trả đã được hủy bỏ theo yêu cầu của khách hàng.',
    color: '#616161',
    bg: '#F5F5F5',
    icon: 'ban-outline',
    stepIndex: 0,
  },
};

export function getRmaStatusMeta(status?: string) {
  const key = (status || 'SUBMITTED').toUpperCase();
  return RMA_STATUS_MAP[key] || RMA_STATUS_MAP.SUBMITTED;
}
