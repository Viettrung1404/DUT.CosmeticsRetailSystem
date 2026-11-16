import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { DistanceCalculatorService, Coordinates } from '../services/distance-calculator.service';
import { InventoryBalanceService } from '@modules/inventory/application/services/inventory-balance.service';
import { LocationService } from '@modules/inventory/application/services/location.service';

export interface RoutingItemInput {
  variantId: string;
  quantity: number;
  unitPrice?: number;
}

export interface RoutingOrderInput {
  orderType?: 'ONLINE' | 'POS';
  shippingServiceCode: 'EXPRESS_2H' | 'STANDARD';
  shippingAddress: {
    provinceCity: string;
    district: string;
    ward?: string;
    addressLine?: string;
    latitude?: number;
    longitude?: number;
  };
  items: RoutingItemInput[];
  netMerchandiseAmount: number; // Giá trị hàng hóa thực tế sau giảm giá (DEC-02)
  sourceLocationId?: string; // Nếu chỉ định location cụ thể (ví dụ POS)
}

export interface PlannedFulfillmentOrderItem {
  variantId: string;
  quantity: number;
}

export interface PlannedFulfillmentOrder {
  sourceLocationId: string;
  sourceLocationName: string;
  sourceLocationType: 'WAREHOUSE' | 'STORE';
  shippingServiceCode: string;
  items: PlannedFulfillmentOrderItem[];
  estimatedShippingFee: number;
  distanceKm?: number;
}

export interface InternalTransferDetails {
  fromLocationId: string;
  fromLocationName: string;
  toLocationId: string;
  toLocationName: string;
  items: PlannedFulfillmentOrderItem[];
  reason: string;
}

export interface RoutingPlanResult {
  planType: 'SINGLE_FULFILLMENT' | 'SPLIT_FULFILLMENT' | 'INTERNAL_TRANSFER_REQUIRED';
  isSplit: boolean;
  fulfillmentOrders: PlannedFulfillmentOrder[];
  totalShippingFee: number;
  companySubsidizedFee: number; // GlowUp trợ giá cước phát sinh (tối đa 35.000đ theo DEC-02)
  customerShippingFee: number;
  transferDetails?: InternalTransferDetails;
  notes?: string;
}

@Injectable()
export class HybridOrderRouter {
  private readonly logger = new Logger(HybridOrderRouter.name);

  // DEC-02: Các hằng số quy chuẩn chia đơn hàng (Split Fulfillment Policy)
  public static readonly SPLIT_MIN_ORDER_VALUE = 500000; // Đơn tối thiểu 500.000đ mới xét chia đơn
  public static readonly SPLIT_MAX_SHIPPING_SUBSIDY = 35000; // Trần trợ giá vận chuyển tối đa 35.000đ
  public static readonly SPLIT_MAX_LOCATIONS = 2; // Tối đa 2 Fulfillment Orders (Kho tổng + 1 Showroom)

  // Standard shipping fee benchmarks
  public static readonly FEE_STANDARD_INTRA_PROVINCE = 22000;
  public static readonly FEE_STANDARD_INTER_PROVINCE = 35000;
  public static readonly FEE_EXPRESS_BASE = 25000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly distanceCalculator: DistanceCalculatorService,
    private readonly inventoryBalanceService: InventoryBalanceService,
    private readonly locationService: LocationService,
  ) {}

  /**
   * Đánh giá và lập kế hoạch phân tuyến hoàn tất đơn hàng (Routing Engine Core)
   */
  async routeOrder(input: RoutingOrderInput): Promise<RoutingPlanResult> {
    if (!input.items || input.items.length === 0) {
      throw new BadRequestException('Danh sách mặt hàng trống');
    }

    // 1. Tải danh sách Store / Warehouse đang hoạt động
    const stores = await this.prisma.store.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        city: true,
        district: true,
        latitude: true,
        longitude: true,
        openingHours: true,
        fulfillmentCapacityPerDay: true,
      },
    });

    if (stores.length === 0) {
      throw new NotFoundException('Không có địa điểm nào đang hoạt động trong hệ thống');
    }

    // 2. Phân tuyến theo chiến lược dịch vụ vận chuyển
    if (input.shippingServiceCode === 'EXPRESS_2H') {
      return this.routeExpressOrder(input, stores);
    } else {
      return this.routeStandardOrder(input, stores);
    }
  }

  /**
   * CHIẾN LƯỢC 1: Phân tuyến Hỏa Tốc 2H (Ahamove - DEC-01)
   * Tuyệt đối không tự động chia đơn hỏa tốc (Cấm Split Fulfillment cho Hỏa tốc).
   */
  private async routeExpressOrder(
    input: RoutingOrderInput,
    stores: Array<any>,
  ): Promise<RoutingPlanResult> {
    const showrooms = stores.filter((s) => s.type === 'STORE');
    const destCoords = this.distanceCalculator.resolveCoordinates(input.shippingAddress);

    if (!destCoords) {
      throw new BadRequestException(
        'Không thể xác định tọa độ giao hàng để phân tuyến hỏa tốc 2H',
      );
    }

    const customerCity = (input.shippingAddress.provinceCity || '').toLowerCase();
    const cityShowrooms = showrooms.filter(
      (s) =>
        s.city.toLowerCase().includes(customerCity) ||
        customerCity.includes(s.city.toLowerCase()),
    );

    const candidates = cityShowrooms.length > 0 ? cityShowrooms : showrooms;

    interface StoreEvaluation {
      store: any;
      distanceKm: number;
      isOpen: boolean;
      hasCapacity: boolean;
      hasStock: boolean;
      fee: number;
    }

    const evaluations: StoreEvaluation[] = [];

    for (const showroom of candidates) {
      if (!showroom.latitude || !showroom.longitude) continue;

      const storeCoords: Coordinates = {
        latitude: Number(showroom.latitude),
        longitude: Number(showroom.longitude),
      };

      const dist = await this.distanceCalculator.calculateDistance(
        storeCoords,
        destCoords,
      );

      const operatingStatus = this.locationService.checkIsOpenNow(showroom.openingHours);
      const isOpen = operatingStatus.isOpenNow;

      const capacityInfo = await this.locationService.getLocationCapacity(showroom.id);
      const hasCapacity = capacityInfo.isCapacityAvailable;

      const stockCheck = await this.inventoryBalanceService.checkAvailability(
        showroom.id,
        input.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      );
      const hasStock = stockCheck.isAvailable;

      let fee = HybridOrderRouter.FEE_EXPRESS_BASE;
      if (dist.distanceKm > 3.0) {
        fee += Math.ceil((dist.distanceKm - 3.0) * 5000);
      }
      fee = Math.round(fee / 1000) * 1000;

      evaluations.push({
        store: showroom,
        distanceKm: dist.distanceKm,
        isOpen,
        hasCapacity,
        hasStock,
        fee,
      });
    }

    evaluations.sort((a, b) => a.distanceKm - b.distanceKm);

    // Tìm showroom thỏa mãn mọi điều kiện cự ly <= 10km, mở cửa, capacity và 100% giỏ hàng
    const validCandidate = evaluations.find(
      (e) =>
        e.distanceKm <= 10.0 &&
        e.isOpen &&
        e.hasCapacity &&
        e.hasStock,
    );

    if (!validCandidate) {
      const closest = evaluations[0];
      let reason = 'Không tìm thấy chi nhánh thỏa mãn điều kiện giao hỏa tốc 2H';
      if (closest && closest.distanceKm > 10.0) {
        reason = `Chi nhánh gần nhất vượt quá 10 km (${closest.distanceKm} km)`;
      } else if (closest && !closest.hasStock) {
        reason = 'Không chi nhánh nào có đủ 100% tồn kho khả dụng (Cấm chia đơn hỏa tốc 2H)';
      }

      throw new BadRequestException(reason);
    }

    return {
      planType: 'SINGLE_FULFILLMENT',
      isSplit: false,
      fulfillmentOrders: [
        {
          sourceLocationId: validCandidate.store.id,
          sourceLocationName: validCandidate.store.name,
          sourceLocationType: 'STORE',
          shippingServiceCode: 'EXPRESS_2H',
          items: input.items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
          })),
          estimatedShippingFee: validCandidate.fee,
          distanceKm: validCandidate.distanceKm,
        },
      ],
      totalShippingFee: validCandidate.fee,
      companySubsidizedFee: 0,
      customerShippingFee: validCandidate.fee,
      notes: `Phân tuyến hỏa tốc 2H thành công từ ${validCandidate.store.name} (${validCandidate.distanceKm} km)`,
    };
  }

  /**
   * CHIẾN LƯỢC 2: Phân tuyến Tiêu Chuẩn (GHN Standard - DEC-02)
   * Kết hợp Kho Tổng Trung Tâm (Central DC) và Chuỗi cửa hàng.
   * Áp dụng quy chuẩn chia đơn có kiểm soát theo DEC-02.
   */
  private async routeStandardOrder(
    input: RoutingOrderInput,
    stores: Array<any>,
  ): Promise<RoutingPlanResult> {
    const customerCity = (input.shippingAddress.provinceCity || '').toLowerCase();
    const warehouses = stores.filter((s) => s.type === 'WAREHOUSE');
    const showrooms = stores.filter((s) => s.type === 'STORE');

    // Xác định Kho Tổng ưu tiên theo vùng miền (Tân Bình cho miền Nam, Hà Nội cho miền Bắc)
    let centralWarehouse = warehouses.find((w) => {
      const isSouth =
        customerCity.includes('hồ chí minh') ||
        customerCity.includes('bình dương') ||
        customerCity.includes('đồng nai') ||
        customerCity.includes('cần thơ');
      return isSouth ? w.code === 'WH-TB' : w.code === 'WH-HN';
    });

    if (!centralWarehouse) {
      centralWarehouse = warehouses[0] || stores[0];
    }

    const isIntraProvince =
      centralWarehouse.city.toLowerCase().includes(customerCity) ||
      customerCity.includes(centralWarehouse.city.toLowerCase());

    const standardBaseFee = isIntraProvince
      ? HybridOrderRouter.FEE_STANDARD_INTRA_PROVINCE
      : HybridOrderRouter.FEE_STANDARD_INTER_PROVINCE;

    // BƯỚC 2.1: KIỂM TRA XEM KHO TỔNG CÓ ĐỦ 100% TỒN KHO KHÔNG
    const centralStockCheck = await this.inventoryBalanceService.checkAvailability(
      centralWarehouse.id,
      input.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
    );

    if (centralStockCheck.isAvailable) {
      return {
        planType: 'SINGLE_FULFILLMENT',
        isSplit: false,
        fulfillmentOrders: [
          {
            sourceLocationId: centralWarehouse.id,
            sourceLocationName: centralWarehouse.name,
            sourceLocationType: 'WAREHOUSE',
            shippingServiceCode: 'STANDARD',
            items: input.items.map((i) => ({
              variantId: i.variantId,
              quantity: i.quantity,
            })),
            estimatedShippingFee: standardBaseFee,
          },
        ],
        totalShippingFee: standardBaseFee,
        companySubsidizedFee: 0,
        customerShippingFee: standardBaseFee,
        notes: `Phân tuyến hoàn tất đơn lẻ tối ưu từ Kho Tổng ${centralWarehouse.name}`,
      };
    }

    // BƯỚC 2.2: KHO TỔNG THIẾU HÀNG -> TÌM XEM CÓ SHOWROOM NÀO CÓ ĐỦ 100% TỒN KHO KHÔNG (Tránh tách đơn)
    const destCoords = this.distanceCalculator.resolveCoordinates(input.shippingAddress);
    const candidateSingleStores: Array<{ store: any; distanceKm: number }> = [];

    for (const showroom of showrooms) {
      const check = await this.inventoryBalanceService.checkAvailability(
        showroom.id,
        input.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      );

      if (check.isAvailable) {
        let distanceKm = 999;
        if (destCoords && showroom.latitude && showroom.longitude) {
          const dist = await this.distanceCalculator.calculateDistance(
            { latitude: Number(showroom.latitude), longitude: Number(showroom.longitude) },
            destCoords,
          );
          distanceKm = dist.distanceKm;
        }
        candidateSingleStores.push({ store: showroom, distanceKm });
      }
    }

    if (candidateSingleStores.length > 0) {
      candidateSingleStores.sort((a, b) => a.distanceKm - b.distanceKm);
      const bestSingleStore = candidateSingleStores[0].store;

      const isStoreIntraProvince =
        bestSingleStore.city.toLowerCase().includes(customerCity) ||
        customerCity.includes(bestSingleStore.city.toLowerCase());

      const storeFee = isStoreIntraProvince
        ? HybridOrderRouter.FEE_STANDARD_INTRA_PROVINCE
        : HybridOrderRouter.FEE_STANDARD_INTER_PROVINCE;

      return {
        planType: 'SINGLE_FULFILLMENT',
        isSplit: false,
        fulfillmentOrders: [
          {
            sourceLocationId: bestSingleStore.id,
            sourceLocationName: bestSingleStore.name,
            sourceLocationType: 'STORE',
            shippingServiceCode: 'STANDARD',
            items: input.items.map((i) => ({
              variantId: i.variantId,
              quantity: i.quantity,
            })),
            estimatedShippingFee: storeFee,
            distanceKm: candidateSingleStores[0].distanceKm,
          },
        ],
        totalShippingFee: storeFee,
        companySubsidizedFee: 0,
        customerShippingFee: storeFee,
        notes: `Kho tổng thiếu hàng nhưng tìm thấy Showroom ${bestSingleStore.name} đáp ứng 100% giỏ hàng (Không cần tách đơn)`,
      };
    }

    // BƯỚC 2.3: KHÔNG CÓ ĐỊA ĐIỂM NÀO ĐÁP ỨNG 100% GIỎ HÀNG -> ĐÁNH GIÁ CHIA ĐƠN (SPLIT FULFILLMENT - DEC-02)
    // Phân loại các mặt hàng có sẵn tại Kho Tổng và các mặt hàng thiếu
    const centralBulkAtp = await this.inventoryBalanceService.getBulkAtp(
      centralWarehouse.id,
      input.items.map((i) => i.variantId),
    );

    const centralItems: PlannedFulfillmentOrderItem[] = [];
    const missingItems: PlannedFulfillmentOrderItem[] = [];

    for (const item of input.items) {
      const atp = centralBulkAtp.get(item.variantId) || 0;
      if (atp >= item.quantity) {
        centralItems.push({ variantId: item.variantId, quantity: item.quantity });
      } else if (atp > 0) {
        // Kho tổng có 1 phần
        centralItems.push({ variantId: item.variantId, quantity: atp });
        missingItems.push({ variantId: item.variantId, quantity: item.quantity - atp });
      } else {
        // Kho tổng hoàn toàn không có SKU này
        missingItems.push({ variantId: item.variantId, quantity: item.quantity });
      }
    }

    // Tìm 1 Showroom gần khách nhất có đủ toàn bộ missingItems
    interface ShowroomSplitCandidate {
      store: any;
      distanceKm: number;
    }

    const splitCandidates: ShowroomSplitCandidate[] = [];

    for (const showroom of showrooms) {
      const check = await this.inventoryBalanceService.checkAvailability(
        showroom.id,
        missingItems,
      );

      if (check.isAvailable) {
        let distanceKm = 999;
        if (destCoords && showroom.latitude && showroom.longitude) {
          const dist = await this.distanceCalculator.calculateDistance(
            { latitude: Number(showroom.latitude), longitude: Number(showroom.longitude) },
            destCoords,
          );
          distanceKm = dist.distanceKm;
        }
        splitCandidates.push({ store: showroom, distanceKm });
      }
    }

    splitCandidates.sort((a, b) => a.distanceKm - b.distanceKm);

    // QUY TẮC CHIA ĐƠN DEC-02:
    // 1. Chỉ xem xét khi netMerchandiseAmount >= 500.000đ
    // 2. Chi phí vận chuyển phát sinh thêm <= 35.000đ
    // 3. Tách tối đa thành 2 FulfillmentOrders (Kho tổng + 1 Showroom)

    const canSplitByThreshold =
      input.netMerchandiseAmount >= HybridOrderRouter.SPLIT_MIN_ORDER_VALUE;

    if (!canSplitByThreshold || splitCandidates.length === 0) {
      // TIÊU CHÍ NGHIỆM THU AC1: Đơn hàng 450.000đ thiếu hàng tại Central WH
      // => Không chia đơn, chuyển sang trạng thái chờ điều chuyển gom hàng nội bộ
      const targetStoreForTransfer = splitCandidates[0]?.store || showrooms[0];

      return {
        planType: 'INTERNAL_TRANSFER_REQUIRED',
        isSplit: false,
        fulfillmentOrders: [],
        totalShippingFee: standardBaseFee,
        companySubsidizedFee: 0,
        customerShippingFee: standardBaseFee,
        transferDetails: {
          fromLocationId: targetStoreForTransfer?.id || 'UNKNOWN',
          fromLocationName: targetStoreForTransfer?.name || 'Chi nhánh lưu kho',
          toLocationId: centralWarehouse.id,
          toLocationName: centralWarehouse.name,
          items: missingItems,
          reason: !canSplitByThreshold
            ? `Giá trị đơn hàng (${input.netMerchandiseAmount.toLocaleString()}đ) dưới ngưỡng cho phép chia đơn 500.000đ (DEC-02). Yêu cầu gom hàng về Kho tổng trước khi xuất.`
            : 'Không có chi nhánh đơn lẻ nào có đủ phần hàng còn thiếu để chia tối đa 2 kiện.',
        },
        notes: 'Đơn hàng yêu cầu điều chuyển gom hàng nội bộ (Consolidation Transfer)',
      };
    }

    // Đã thỏa mãn ngưỡng 500.000đ và tìm thấy 1 showroom có đủ missingItems
    const partnerShowroom = splitCandidates[0].store;
    const isPartnerIntra =
      partnerShowroom.city.toLowerCase().includes(customerCity) ||
      customerCity.includes(partnerShowroom.city.toLowerCase());

    const extraShippingFee = isPartnerIntra
      ? HybridOrderRouter.FEE_STANDARD_INTRA_PROVINCE
      : HybridOrderRouter.FEE_STANDARD_INTER_PROVINCE;

    // Kiểm tra trần trợ giá vận chuyển: cước phát sinh thêm <= 35.000đ
    if (extraShippingFee > HybridOrderRouter.SPLIT_MAX_SHIPPING_SUBSIDY) {
      return {
        planType: 'INTERNAL_TRANSFER_REQUIRED',
        isSplit: false,
        fulfillmentOrders: [],
        totalShippingFee: standardBaseFee,
        companySubsidizedFee: 0,
        customerShippingFee: standardBaseFee,
        transferDetails: {
          fromLocationId: partnerShowroom.id,
          fromLocationName: partnerShowroom.name,
          toLocationId: centralWarehouse.id,
          toLocationName: centralWarehouse.name,
          items: missingItems,
          reason: `Chi phí vận chuyển phát sinh (${extraShippingFee.toLocaleString()}đ) vượt trần trợ giá 35.000đ theo quyết định DEC-02. Chuyển sang gom hàng nội bộ.`,
        },
        notes: 'Cước phát sinh vượt trần trợ giá chia đơn -> Chuyển sang gom hàng',
      };
    }

    // TIÊU CHÍ NGHIỆM THU AC2: Đơn hàng >= 500.000đ, cước phát sinh <= 35.000đ
    // => Tách thành 2 Fulfillment Orders hợp lệ: Central WH + 1 Showroom
    const fo1: PlannedFulfillmentOrder = {
      sourceLocationId: centralWarehouse.id,
      sourceLocationName: centralWarehouse.name,
      sourceLocationType: 'WAREHOUSE',
      shippingServiceCode: 'STANDARD',
      items: centralItems,
      estimatedShippingFee: standardBaseFee,
    };

    const fo2: PlannedFulfillmentOrder = {
      sourceLocationId: partnerShowroom.id,
      sourceLocationName: partnerShowroom.name,
      sourceLocationType: 'STORE',
      shippingServiceCode: 'STANDARD',
      items: missingItems,
      estimatedShippingFee: extraShippingFee,
      distanceKm: splitCandidates[0].distanceKm,
    };

    return {
      planType: 'SPLIT_FULFILLMENT',
      isSplit: true,
      fulfillmentOrders: [fo1, fo2],
      totalShippingFee: standardBaseFee + extraShippingFee,
      companySubsidizedFee: extraShippingFee, // GlowUp chịu toàn bộ phí phát sinh cho kiện thứ 2
      customerShippingFee: standardBaseFee, // Khách hàng chỉ trả 1 lần phí chuẩn
      notes: `Tách đơn thành công thành 2 kiện: Kiện 1 xuất từ ${centralWarehouse.name}, Kiện 2 xuất từ ${partnerShowroom.name}. GlowUp trợ giá cước phát sinh ${extraShippingFee.toLocaleString()}đ (DEC-02).`,
    };
  }
}
