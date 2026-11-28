import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { COLORS, SHADOWS } from '../constants/theme';

export interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  badge?: string | number;
  centerComponent?: React.ReactNode;
  rightActions?: React.ReactNode;
  onLogoPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const GLOWUP_LOGO = require('../../assets/glowup-logo.webp');

export default function AppHeader({
  title = 'GlowUp',
  subtitle = 'MỸ PHẨM CHÍNH HÃNG',
  badge,
  centerComponent,
  rightActions,
  onLogoPress,
  style,
}: AppHeaderProps) {
  return (
    <View style={[styles.headerContainer, style]}>
      {/* Khối bên trái: Logo + Tiêu đề thương hiệu đồng bộ */}
      <TouchableOpacity
        style={styles.brandContainer}
        onPress={onLogoPress}
        activeOpacity={onLogoPress ? 0.75 : 1}
      >
        <Image source={GLOWUP_LOGO} style={styles.logoImage} resizeMode="cover" />
        <View style={styles.titleColumn}>
          <View style={styles.titleRow}>
            <Text style={styles.brandTitle} numberOfLines={1}>
              {title}
            </Text>
            {badge !== undefined && badge !== null && (
              <View style={styles.badgeWrapper}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            )}
          </View>
          {subtitle ? (
            <Text style={styles.brandSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>

      {/* Phần trung tâm (Ví dụ: Thanh tìm kiếm trên HomeScreen) */}
      {centerComponent && (
        <View style={styles.centerSection}>{centerComponent}</View>
      )}

      {/* Khối hành động bên phải */}
      {rightActions ? (
        <View style={styles.rightSection}>{rightActions}</View>
      ) : (
        <View style={{ width: 8 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    height: 58,
    width: '100%',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE6',
    zIndex: 20,
    ...SHADOWS.soft,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  logoImage: {
    width: 34,
    height: 34,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#F3E8EB',
  },
  titleColumn: {
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2D2424',
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 8.5,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.8,
    marginTop: 1,
    textTransform: 'uppercase',
  },
  badgeWrapper: {
    backgroundColor: '#FFF0F3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
    borderWidth: 0.5,
    borderColor: '#FFCCD5',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },
  centerSection: {
    flex: 1,
    marginHorizontal: 10,
    justifyContent: 'center',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
});
