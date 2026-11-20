import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  Clipboard,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { orderApi } from '../../api/orderApi';

export interface ShipmentPackageItem {
  quantity: number;
  variant?: {
    sku?: string;
    option1Value?: string;
    option2Value?: string;
    product?: {
      name?: string;
    };
  };
}

export interface ShipmentPackage {
  package: {
    id: string;
    packageCode?: string;
    actualWeightGrams?: number | null;
    items?: ShipmentPackageItem[];
  };
}

export interface ShipmentAttempt {
  id: string;
  attemptNumber: number;
  attemptedAt: string;
  failureReasonCode?: string;
  failureReasonDetail?: string;
}

export interface ShipmentEvent {
  id?: string;
  status: string;
  occurredAt?: string;
  receivedAt?: string;
  timestamp?: string;
  description?: string;
  location?: string;
}

export interface Shipment {
  id: string;
  shipmentCode?: string;
  carrierCode?: string;
  carrierServiceCode?: string;
  trackingCode?: string | null;
  trackingUrl?: string | null;
  status?: string;
  failedAttempts?: number;
  packages?: ShipmentPackage[];
  attempts?: ShipmentAttempt[];
  events?: ShipmentEvent[];
  handedOverAt?: string;
  deliveredAt?: string;
  updatedAt?: string;
}

export interface TrackingData {
  id: string;
  status?: string;
  updatedAt?: string;
  shipments?: Shipment[];
  statusHistories?: Array<{
    status: string;
    changedAt?: string;
    createdAt?: string;
    note?: string;
  }>;
}

function getShipmentStatusMeta(status?: string) {
  switch (status?.toUpperCase()) {
    case 'DELIVERED':
    case 'COMPLETED':
      return { label: 'Giao hàng thành công', color: '#2E7D32', bg: '#E8F5E9' };
    case 'OUT_FOR_DELIVERY':
      return { label: 'Đang giao hàng', color: '#E65100', bg: '#FFF3E0' };
    case 'IN_TRANSIT':
      return { label: 'Đang vận chuyển', color: '#1565C0', bg: '#E3F2FD' };
    case 'PICKED_UP':
    case 'HANDED_OVER':
      return { label: 'Đã bàn giao cho shipper', color: '#0277BD', bg: '#E1F5FE' };
    case 'DRIVER_ASSIGNED':
      return { label: 'Đã có tài xế nhận đơn', color: '#6A1B9A', bg: '#F3E5F5' };
    case 'DELIVERY_FAILED':
      return { label: 'Giao không thành công', color: '#C62828', bg: '#FFEBEE' };
    case 'RETURNING':
    case 'RETURNED':
      return { label: 'Chuyển hoàn về kho (RTO)', color: '#AD1457', bg: '#FCE4EC' };
    case 'CANCELLED':
      return { label: 'Đã hủy', color: '#757575', bg: '#EEEEEE' };
    default:
      return { label: status || 'Đang chuẩn bị', color: '#455A64', bg: '#ECEFF1' };
  }
}

export default function ShipmentTrackingScreen({ route, navigation }: any) {
  const { orderId = '' } = route.params || {};

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTracking = useCallback(async (isRefresh = false) => {
    if (!orderId) {
      setError('Không tìm thấy mã đơn hàng.');
      setLoading(false);
      return;
    }
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await orderApi.getOrderTracking(orderId);
      const data: TrackingData = res?.data ?? res;
      setTrackingData(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Không thể tải thông tin vận chuyển. Vui lòng kiểm tra lại kết nối.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchTracking();
  }, [fetchTracking]);

  const handleCopy = (code: string) => {
    if (!code) return;
    Clipboard.setString(code);
    setCopiedCode(code);
    Alert.alert('Đã sao chép', `Mã vận đơn: ${code}`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleOpenLiveMap = (url?: string | null) => {
    if (!url) return;
    Linking.openURL(url).catch(() => {
      Alert.alert('Lỗi', 'Không thể mở liên kết bản đồ trực tiếp trên thiết bị.');
    });
  };

  const shipments = trackingData?.shipments || [];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Hành trình Vận chuyển</Text>
          <Text style={styles.headerSubtitle}>Mã đơn #{orderId}</Text>
        </View>
        <TouchableOpacity
          style={styles.headActionBtn}
          onPress={() => fetchTracking(true)}
          disabled={loading || refreshing}
        >
          <Ionicons
            name="refresh-outline"
            size={22}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Đang tải thông tin vận chuyển...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={52} color={theme.colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchTracking()}>
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchTracking(true)}
              colors={[theme.colors.primary]}
            />
          }
        >
          {/* Hero Overview */}
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.statusBadge}>
                <Ionicons name="cube-outline" size={14} color={theme.colors.primary} />
                <Text style={styles.statusBadgeText}>
                  {trackingData?.status || 'ĐANG XỬ LÝ'}
                </Text>
              </View>
              {shipments.length > 1 && (
                <View style={styles.multiPkgBadge}>
                  <Text style={styles.multiPkgBadgeText}>
                    📦 Đơn chia {shipments.length} kiện
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.heroStatus}>Theo dõi tiến trình kiện hàng</Text>
            <Text style={styles.heroSub}>
              {shipments.length > 1
                ? 'Đơn hàng được phân bổ và đóng gói thành nhiều kiện hàng từ các kho/cửa hàng khác nhau.'
                : 'Thông tin hành trình được cập nhật thời gian thực từ đối tác giao vận.'}
            </Text>
          </View>

          {/* Render All Shipments */}
          {shipments.length > 0 ? (
            shipments.map((sh, sIdx) => {
              const statusMeta = getShipmentStatusMeta(sh.status);
              const isAhamove =
                sh.carrierCode === 'AHAMOVE' ||
                sh.carrierServiceCode === 'EXPRESS_2H';
              const carrierName = isAhamove ? 'Ahamove Express 2H' : (sh.carrierCode || 'GHN Standard');
              const trackingCode = sh.trackingCode || '';
              const attempts = sh.attempts || [];
              const failedCount = sh.failedAttempts || attempts.length;

              // Packages list
              const packages = sh.packages || [];

              // Timeline events for this shipment
              const events = (sh.events || []).map((ev, idx) => ({
                title: ev.description || ev.status,
                time: ev.occurredAt || ev.receivedAt || ev.timestamp
                  ? new Date(ev.occurredAt || ev.receivedAt || ev.timestamp || '').toLocaleString('vi-VN')
                  : '',
                location: ev.location,
                isCurrent: idx === 0,
              }));

              return (
                <View key={sh.id || sIdx} style={styles.shipmentCard}>
                  {/* Shipment Header */}
                  <View style={styles.shipmentHeader}>
                    <View style={styles.rowAlign}>
                      <View
                        style={[
                          styles.carrierTag,
                          isAhamove && styles.carrierTagAhamove,
                        ]}
                      >
                        <Text
                          style={[
                            styles.carrierTagText,
                            isAhamove && { color: '#E65100' },
                          ]}
                        >
                          {carrierName}
                        </Text>
                      </View>
                      <Text style={styles.shipmentIndexTitle}>
                        Kiện #{sIdx + 1}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.shipmentStatusPill,
                        { backgroundColor: statusMeta.bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.shipmentStatusPillText,
                          { color: statusMeta.color },
                        ]}
                      >
                        {statusMeta.label}
                      </Text>
                    </View>
                  </View>

                  {/* Tracking Code & Actions */}
                  {trackingCode ? (
                    <View style={styles.trackingBox}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.trackingLabel}>MÃ VẬN ĐƠN</Text>
                        <Text style={styles.trackingCodeText}>{trackingCode}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.copyBtn}
                        onPress={() => handleCopy(trackingCode)}
                      >
                        <Ionicons
                          name={copiedCode === trackingCode ? 'checkmark' : 'copy-outline'}
                          size={15}
                          color={theme.colors.primary}
                        />
                        <Text style={styles.copyBtnText}>
                          {copiedCode === trackingCode ? 'Đã chép' : 'Sao chép'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.noTrackingBox}>
                      <Text style={styles.noTrackingText}>
                        Mã vận đơn đang được hệ thống điều phối từ đơn vị vận chuyển.
                      </Text>
                    </View>
                  )}

                  {/* Ahamove Live Tracking Map Button */}
                  {isAhamove && sh.trackingUrl && (
                    <TouchableOpacity
                      style={styles.liveMapBtn}
                      onPress={() => handleOpenLiveMap(sh.trackingUrl)}
                    >
                      <Ionicons name="navigate-circle" size={20} color="#FFF" />
                      <Text style={styles.liveMapBtnText}>
                        Xem Vị Trí Tài Xế Trực Tiếp (Live Map)
                      </Text>
                      <Ionicons name="open-outline" size={16} color="#FFF" />
                    </TouchableOpacity>
                  )}

                  {/* Package Items & Weight */}
                  {packages.length > 0 && (
                    <View style={styles.packageItemsBox}>
                      <Text style={styles.packageBoxTitle}>
                        Sản phẩm trong kiện hàng:
                      </Text>
                      {packages.map((pkgWrapper, pIdx) => {
                        const pkg = pkgWrapper.package;
                        const weightKg = pkg?.actualWeightGrams
                          ? (pkg.actualWeightGrams / 1000).toFixed(2)
                          : null;

                        return (
                          <View key={pkg?.id || pIdx} style={styles.pkgRow}>
                            {weightKg && (
                              <View style={styles.weightBadge}>
                                <Ionicons name="scale-outline" size={12} color="#555" />
                                <Text style={styles.weightBadgeText}>{weightKg} kg</Text>
                              </View>
                            )}
                            {(pkg?.items || []).map((it, iIdx) => {
                              const pName = it.variant?.product?.name || 'Sản phẩm mỹ phẩm';
                              const vName = [it.variant?.option1Value, it.variant?.option2Value]
                                .filter(Boolean)
                                .join(' - ');

                              return (
                                <View key={iIdx} style={styles.itemLine}>
                                  <Text style={styles.bulletDot}>•</Text>
                                  <Text style={styles.itemLineName} numberOfLines={1}>
                                    {pName} {vName ? `(${vName})` : ''}
                                  </Text>
                                  <Text style={styles.itemLineQty}>x{it.quantity}</Text>
                                </View>
                              );
                            })}
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* Delivery Attempts / Failed Attempts History */}
                  {failedCount > 0 && (
                    <View style={styles.failedAttemptsBox}>
                      <View style={styles.failedAttemptsHeader}>
                        <Ionicons name="warning-outline" size={16} color="#C62828" />
                        <Text style={styles.failedAttemptsTitle}>
                          Lịch sử giao hàng ({failedCount} lần chưa thành công)
                        </Text>
                      </View>
                      {attempts.map((att, aIdx) => (
                        <View key={att.id || aIdx} style={styles.attemptLine}>
                          <Text style={styles.attemptNum}>Lần {att.attemptNumber}:</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.attemptReason}>
                              {att.failureReasonDetail || att.failureReasonCode || 'Không thể liên lạc được người nhận'}
                            </Text>
                            <Text style={styles.attemptTime}>
                              {new Date(att.attemptedAt).toLocaleString('vi-VN')}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Shipment Event Timeline */}
                  <View style={styles.timelineSection}>
                    <Text style={styles.timelineTitle}>Lịch sử hành trình kiện</Text>
                    {events.length > 0 ? (
                      <View style={styles.timelineList}>
                        {events.map((ev, eIdx) => {
                          const isLast = eIdx === events.length - 1;
                          return (
                            <View key={eIdx} style={styles.timelineItem}>
                              <View style={styles.timelineCol}>
                                <View
                                  style={[
                                    styles.dot,
                                    ev.isCurrent ? styles.dotActive : styles.dotDone,
                                  ]}
                                >
                                  {ev.isCurrent ? (
                                    <View style={styles.dotPulse} />
                                  ) : (
                                    <Ionicons name="checkmark" size={10} color="#FFF" />
                                  )}
                                </View>
                                {!isLast && <View style={styles.line} />}
                              </View>
                              <View style={styles.timelineContent}>
                                <Text
                                  style={[
                                    styles.evTitle,
                                    ev.isCurrent && styles.evTitleActive,
                                  ]}
                                >
                                  {ev.title}
                                </Text>
                                {ev.time ? <Text style={styles.evTime}>{ev.time}</Text> : null}
                                {ev.location ? (
                                  <Text style={styles.evLocation}>{ev.location}</Text>
                                ) : null}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <Text style={styles.noEventsText}>
                        Đang chờ bưu tá quét mã xác nhận tại kho trung chuyển.
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            /* Fallback: Order-level Status Timeline */
            <View style={styles.shipmentCard}>
              <Text style={styles.timelineTitle}>Trạng thái đơn hàng</Text>
              {trackingData?.statusHistories && trackingData.statusHistories.length > 0 ? (
                <View style={styles.timelineList}>
                  {trackingData.statusHistories.map((h, idx) => {
                    const isLast = idx === (trackingData.statusHistories?.length || 0) - 1;
                    const dateStr = h.changedAt || h.createdAt;
                    return (
                      <View key={idx} style={styles.timelineItem}>
                        <View style={styles.timelineCol}>
                          <View style={[styles.dot, idx === 0 ? styles.dotActive : styles.dotDone]}>
                            {idx === 0 ? (
                              <View style={styles.dotPulse} />
                            ) : (
                              <Ionicons name="checkmark" size={10} color="#FFF" />
                            )}
                          </View>
                          {!isLast && <View style={styles.line} />}
                        </View>
                        <View style={styles.timelineContent}>
                          <Text style={[styles.evTitle, idx === 0 && styles.evTitleActive]}>
                            {h.status}
                          </Text>
                          {dateStr && (
                            <Text style={styles.evTime}>
                              {new Date(dateStr).toLocaleString('vi-VN')}
                            </Text>
                          )}
                          {h.note ? <Text style={styles.evLocation}>{h.note}</Text> : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={{ paddingVertical: 14 }}>
                  <Text style={styles.noTrackingText}>
                    Chưa có thông tin vận chuyển chi tiết cho đơn hàng này.
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.backgroundCanvas,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  headerSubtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  headActionBtn: {
    padding: 6,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  errorText: {
    marginTop: 10,
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  heroCard: {
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.rounded.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  multiPkgBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  multiPkgBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
  },
  heroStatus: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textDark,
    marginTop: 4,
  },
  heroSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },

  /* Shipment Card */
  shipmentCard: {
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.rounded.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    gap: 12,
  },
  shipmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  carrierTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  carrierTagAhamove: {
    backgroundColor: '#FFF3E0',
  },
  carrierTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1565C0',
  },
  shipmentIndexTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  shipmentStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  shipmentStatusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  trackingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceSubtle,
    padding: 12,
    borderRadius: 8,
  },
  trackingLabel: {
    fontSize: 9,
    color: theme.colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  trackingCodeText: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textDark,
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  noTrackingBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    padding: 12,
    borderRadius: 8,
  },
  noTrackingText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },

  /* Live Map Button */
  liveMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E65100',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  liveMapBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Packages */
  packageItemsBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  packageBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textDark,
    marginBottom: 4,
  },
  pkgRow: {
    gap: 4,
  },
  weightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#FFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    marginBottom: 4,
  },
  weightBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#555',
  },
  itemLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bulletDot: {
    fontSize: 14,
    color: theme.colors.primary,
  },
  itemLineName: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textDark,
  },
  itemLineQty: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },

  /* Failed attempts */
  failedAttemptsBox: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    gap: 6,
  },
  failedAttemptsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  failedAttemptsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C62828',
  },
  attemptLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  attemptNum: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B71C1C',
  },
  attemptReason: {
    fontSize: 11,
    color: '#B71C1C',
    fontWeight: '500',
  },
  attemptTime: {
    fontSize: 10,
    color: '#777',
    marginTop: 1,
  },

  /* Timeline */
  timelineSection: {
    marginTop: 4,
    gap: 8,
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textDark,
  },
  timelineList: {
    paddingLeft: 6,
    marginTop: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 46,
  },
  timelineCol: {
    alignItems: 'center',
    width: 20,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotDone: {
    backgroundColor: theme.colors.primary,
  },
  dotActive: {
    backgroundColor: theme.colors.primary,
  },
  dotPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: theme.colors.borderSubtle,
    marginVertical: 2,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 12,
  },
  evTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textDark,
  },
  evTitleActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  evTime: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  evLocation: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  noEventsText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: 6,
  },
});
