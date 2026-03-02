import { Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MenuContent from "./MenuContent";

/**
 * Phase 1: Responsive layout shell (portrait only).
 *
 * - Phone: slim left bar + main area (detail panel hidden unless provided).
 * - Tablet: left menu column always visible + main area; optional detail area
 *   stacked or side-by-side depending on width.
 *
 * Navigation flows remain unchanged: this shell does NOT intercept list taps.
 */
export default function ResponsiveShell({
  children,
  detail = null,
  showDetailPlaceholder = true,
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isPad = Platform.OS === "ios" && Platform.isPad;
  const isTablet = isPad || width >= 768;

  // On tablet, decide if we can show side-by-side list/detail
  // Keep the main pane wide on iPad portrait so banners/content have room.
  // Only enable side-by-side list/detail on larger tablet widths.
  const tabletSideBySide = isTablet && width >= 1100;

  // For phone layout: show detail only when provided (Phase 1 keeps it hidden by default)
  const hasDetail = !!detail;

  // Make the left menu narrower on iPad so the main content (e.g. banners)
  // can use more horizontal space.
  // Clamp to a sensible range for various tablet sizes.
  const tabletMenuWidth = Math.max(200, Math.min(240, Math.round(width * 0.22)));

  const mainBackground = "#0B1320";

  if (!isTablet) {
    return (
      <View style={[styles.phoneRoot, { backgroundColor: mainBackground }]}>
        <View style={styles.phoneMain}>
          <View style={[styles.phoneTop, !hasDetail && { flex: 1 }]}>
            {children}
          </View>

          {hasDetail ? (
            <View style={[styles.phoneBottom, { paddingBottom: insets.bottom, height: 260 + insets.bottom }]}>
              {detail}
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  // Tablet portrait layout
  return (
    <View style={[styles.root, { backgroundColor: mainBackground }]}>
      <View style={[styles.tabletMenu, { width: tabletMenuWidth }]}>
        {/* Tablet: brand moves to native headerLeft (CREDORA), so hide brand in left menu column */}
        <MenuContent showBrand={false} />
      </View>

      <View style={styles.tabletMain}>
        {tabletSideBySide ? (
          <View style={styles.tabletRow}>
            <View style={styles.tabletListPane}>{children}</View>
            {/*<View style={styles.tabletDetailPane}>
              {detail ? (
                detail
              ) : showDetailPlaceholder ? (
                <Placeholder text="Select an order to preview details here." />
              ) : null}
            </View>*/}
          </View>
        ) : (
          <View style={styles.tabletCol}>
            <View style={styles.tabletListPane}>{children}</View>
            {/*<View style={styles.tabletDetailPaneStacked}>
              {detail ? (
                detail
              ) : showDetailPlaceholder ? (
                <Placeholder text="Select an order to preview details here." />
              ) : null}
            </View>*/}
          </View>
        )}
      </View>
    </View>
  );
}

function Placeholder({ text }) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderTitle}>Detail Preview</Text>
      <Text style={styles.placeholderText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
  },

  // Phone layout (portrait)
  phoneRoot: {
    flex: 1,
  },

  phoneMain: {
    flex: 1,
    flexDirection: "column",
  },
  phoneTop: {
    flex: 1,
  },
  phoneBottom: {
    height: 260,
    borderTopWidth: 1,
    borderTopColor: "#2A3142",
    backgroundColor: "#101522",
  },

  // Tablet layout
  tabletMenu: {
    borderRightWidth: 1,
    borderRightColor: "#2A3142",
    backgroundColor: "#1A1F2B",
  },
  tabletMain: {
    flex: 1,
  },
  tabletRow: {
    flex: 1,
    flexDirection: "row",
  },
  tabletCol: {
    flex: 1,
    flexDirection: "column",
  },
  tabletListPane: {
    flex: 1,
  },
  tabletDetailPane: {
    width: 420,
    borderLeftWidth: 1,
    borderLeftColor: "#2A3142",
    backgroundColor: "#101522",
  },
  tabletDetailPaneStacked: {
    height: 320,
    borderTopWidth: 1,
    borderTopColor: "#2A3142",
    backgroundColor: "#101522",
  },

  placeholder: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  placeholderTitle: {
    color: "#C9A24D",
    fontWeight: "900",
    fontSize: 16,
    marginBottom: 8,
  },
  placeholderText: {
    color: "#BFC6CF",
    fontSize: 13,
    lineHeight: 18,
  },
});
