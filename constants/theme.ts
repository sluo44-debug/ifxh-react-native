/**
 * Color Foundations (brand palette)
 *
 * Midnight Navy  #0B1320 — primary canvas
 * Graphite Navy  #1A1F2B — surfaces
 * Imperial Gold  #C9A24D — authority accent
 * White          #FFFFFF — primary text
 * Platinum Gray  #BFC6CF — secondary text
 */

import { Platform } from 'react-native';

const midnightNavy = '#0B1320';
const graphiteNavy = '#1A1F2B';
const imperialGold = '#C9A24D';
const white = '#FFFFFF';
const platinumGray = '#BFC6CF';

export const Colors = {
  light: {
    // keep a single, consistent theme regardless of system setting
    text: white,
    secondaryText: platinumGray,
    background: midnightNavy,
    surface: graphiteNavy,
    tint: imperialGold,
    icon: platinumGray,
    tabIconDefault: platinumGray,
    tabIconSelected: imperialGold,
    border: '#2A3142',
    danger: '#EF4444',
  },
  dark: {
    text: white,
    secondaryText: platinumGray,
    background: midnightNavy,
    surface: graphiteNavy,
    tint: imperialGold,
    icon: platinumGray,
    tabIconDefault: platinumGray,
    tabIconSelected: imperialGold,
    border: '#2A3142',
    danger: '#EF4444',
  },
};

export const Fonts = Platform.select({
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
