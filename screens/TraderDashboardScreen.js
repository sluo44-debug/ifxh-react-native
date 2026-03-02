import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import AppMenu from "../components/AppMenu";
import DashboardHeaderTitle from "../components/DashboardHeaderTitle";
import { AuthContext } from "../context/AuthContext";
import MarketingBannerCarousel from "../src/components/MarketingBannerCarousel";

const NIGHT = {
  bg: "#0B1320",
  card: "#1A1F2B",
  card2: "#1A1F2B",
  text: "#FFFFFF",
  muted: "#BFC6CF",
  border: "#2A3142",
  primary: "#C9A24D",
  primaryDark: "#C9A24D",
  chip: "#1A1F2B",
  danger: "#ef4444",
};

import { listTraderQueue } from "../src/api/orders";
import { logRefresh } from "../src/debug/logger";
import useAutoOrdersRefresh from "../src/hooks/useAutoOrdersRefresh";
import { filterOrdersByRange } from "../src/utils/orderDateRange";
import { subscribeOrdersChanged } from "../src/utils/ordersBus";
import { canTraderConfirmSent, STATUS_APPROVED, STATUS_SENT_STEP3 } from "../src/workflow/orderWorkflow";

// Scope filter labels (match BU/SO wording)
const TRADER_SCOPE_AWAITING = "Awaiting Action";
const TRADER_SCOPE_ALL = "All";

// Client-side helper: if any non-View Trader action would render for an order, it is "Awaiting Action".
// Keep this logic aligned with the action button conditions used in TraderDashboardScreen.
function requiresTraderAction(order, roleValue) {
  const roleUpper = String(roleValue || "TRADER").toUpperCase();
  const latestStatusId = String(order?.latestStatusId ?? "");

  const canApproveOVN = latestStatusId === String(STATUS_APPROVED) && roleUpper.includes("TRADER");
  const canConfirmSent = canTraderConfirmSent(latestStatusId) && roleUpper.includes("TRADER");

  return Boolean(canApproveOVN || canConfirmSent);
}


export default function TraderDashboardScreen(props) {
  const navigation = useNavigation();
  const { onSelectOrder, selectedOrderId } = props || {};
  const { width } = useWindowDimensions();
  const isPad = Platform.OS === "ios" && Platform.isPad;
  const isTablet = isPad || width >= 768;
  const { userToken, role, apiBaseUrl, signOut } = useContext(AuthContext);

  // Fetch the full queue (searchCond=All) and apply range filtering client-side.
  // This avoids backend/stored-procedure differences that can hide new orders in "Today"/"Weekly".
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState("Today");
  const [scope, setScope] = useState(TRADER_SCOPE_AWAITING);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () =>
        isTablet ? (
          <Text style={styles.headerBrand} pointerEvents="none">
            CREDORA
          </Text>
        ) : (
          <AppMenu />
        ),
      headerTitle: () => <DashboardHeaderTitle role={role} companyName="" isTablet={isTablet} />,
      headerRight: () => (
        <View style={styles.logoutOuter}>
          <View pointerEvents="none" style={styles.innerMask} />
          <Pressable
            onPress={async () => {
              await signOut();
              navigation.reset({ index: 0, routes: [{ name: "Login" }] });
            }}
            style={styles.logoutInner}
            accessibilityRole="button"
          >
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation, signOut, isTablet, role]);

  const load = useCallback(async (opts = {}) => {
    const silent = !!opts.silent;
    try {
      if (!silent) setLoading(true);

      const data = await listTraderQueue("All");
      setAllOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      Alert.alert("Load failed", err?.message ? String(err.message) : "Unknown error");
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, [apiBaseUrl, userToken]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Phase 3: allow other screens (e.g., preview panel cancel) to request a refresh
  useEffect(() => {
    const unsub = subscribeOrdersChanged(() => {
      load();
    });
    return unsub;
  }, [load]);

  // Auto refresh: pick up server-side new orders without manual refresh.
  // Polling is only active while this screen is focused AND the app is foreground.
  useAutoOrdersRefresh({
    enabled: true,
    intervalMs: 10000,
    onTick: async () => {
      logRefresh("TraderDashboard", "autoPoll");
      await load({ silent: true });
    },
  });

  const onRefresh = useCallback(async () => {
    logRefresh("TraderDashboard", "pullToRefresh");
    setRefreshing(true);
    await load();
  }, [load]);

  const ranges = useMemo(() => ["Today", "Weekly", "Monthly", "All"], []);
  const rangeLabel = (r) => (r === "Weekly" ? "1 Week" : r === "Monthly" ? "1 Month" : r);
  

  const scopes = useMemo(() => [TRADER_SCOPE_AWAITING, TRADER_SCOPE_ALL], []);

  const displayedOrders = useMemo(() => {
    const rangeFiltered = filterOrdersByRange(allOrders, range);
    //if (scope === TRADER_SCOPE_ALL) return rangeFiltered;
    //return rangeFiltered.filter((o) => requiresTraderAction(o, role));
    return rangeFiltered;  // Return range filter on Jan 24, 2026
  }, [allOrders, range, scope, role]);

  // Phase 3: clear preview selection if selected order disappears from the current filtered set.
  useEffect(() => {
    if (!selectedOrderId) return;
    const id = String(selectedOrderId);
    const stillVisible = (displayedOrders || []).some((o) => String(o?.orderId) === id);
    if (!stillVisible) {
      onSelectOrder && onSelectOrder(null);
    }
  }, [selectedOrderId, displayedOrders, onSelectOrder]);

  const goDetail = (orderId) => {
    navigation.navigate("OrderDetail", { orderId });
  };

  const goApproveOVN = (orderId) => {
    navigation.navigate("TraderApproveOVN", { orderId });
  };

  const goConfirmSent = (orderId, beforeStatusId) => {
    console.log("[TraderConfirmSent] open", { orderId, beforeStatusId, expectedBeforeStatusId: STATUS_SENT_STEP3 });
    navigation.navigate("TraderConfirmSent", { orderId });
  };

  const renderItem = ({ item }) => {
    const latestStatusId = String(item?.latestStatusId || "");
    const upperRole = String(role || "").toUpperCase();
    const canApproveOVN = latestStatusId === STATUS_APPROVED && upperRole.includes("TRADER");
    const canConfirmSent = canTraderConfirmSent(latestStatusId) && upperRole.includes("TRADER");

    return (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => onSelectOrder && onSelectOrder(String(item?.orderId))}
        style={[
          styles.orderCard,
          selectedOrderId && String(selectedOrderId) === String(item?.orderId) && styles.orderCardSelected,
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.orderId}>Order #{item?.orderId}</Text>
          <Text style={styles.meta}>Date: {item?.orderDate}</Text>
          <Text style={styles.meta}>Status: {item?.status} (ID {latestStatusId})</Text>
          <Text style={styles.meta}>Amount: {item?.amount}</Text>
          <Text style={styles.meta}>Rate: {item?.rate}</Text>
          {!!item?.senderCompany && !!item?.recipientCompany && (
            <Text style={styles.meta}>
              {item?.senderCompany} → {item?.recipientCompany}
            </Text>
          )}
        </View>

        <View style={styles.actions}>
          <ActionButton title="View" variant="secondary" onPress={() => goDetail(item?.orderId)} />
          {canApproveOVN && (
            <ActionButton title="Approve(OVN)" onPress={() => goApproveOVN(item?.orderId)} />
          )}
          {canConfirmSent && (
            <ActionButton title="Confirm Sent" onPress={() => goConfirmSent(item?.orderId, latestStatusId)} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const upperRole = String(role || "").toUpperCase();
  return (
    <View style={styles.container}>
      <FlatList
        data={displayedOrders}
        keyExtractor={(item, idx) => String(item?.orderId ?? idx)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View>
            <View style={{ marginHorizontal: -16, marginTop: 0, marginBottom: 12 }}>
              <MarketingBannerCarousel autoplayMs={10000} fullBleed />
            </View>

            {/*
            <View style={styles.scopeRow}>
              {scopes.map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setScope(s)}
                  style={[styles.scopeButton, scope === s && styles.scopeButtonActive]}
                >
                  <Text style={[styles.scopeButtonText, scope === s && styles.scopeButtonTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            */}

            <View style={styles.rangeRow}>
              {ranges.map((r) => (
                <TouchableOpacity
                  key={rangeLabel(r)}
                  onPress={() => setRange(r)}
                  style={[styles.rangeChip, range === r && styles.rangeChipActive]}
                >
                  <Text style={[styles.rangeChipText, range === r && styles.rangeChipTextActive]}>{rangeLabel(r)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" />
              <Text style={{ marginTop: 10, color: NIGHT.text }}>Loading orders...</Text>
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No orders found.</Text>
            </View>
          )
        }
      />
    </View>
  );
}


function ActionButton({ title, onPress, variant }) {
  const isSecondary = variant === "secondary";
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.actionBtn, isSecondary && styles.actionBtnSecondary]}
    >
      <Text style={[styles.actionBtnText, isSecondary && styles.actionBtnTextSecondary]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Keep horizontal padding, but remove top padding so the banner can sit flush under the native header.
  container: {
    flex: 1,
    backgroundColor: NIGHT.bg,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },

  // IMPORTANT: To avoid the "double border" effect in iOS Chrome / RN-web,
  // draw the border on a non-focusable outer View, and keep the Pressable
  // itself borderless.
  logoutOuter: {
    position: "relative",
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#2A3142",
    backgroundColor: "#1A1F2B",
    overflow: "hidden",
  },
  // Mask to hide any platform/browser drawn inner ring so it looks like ONE border.
  innerMask: {
    position: "absolute",
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: 999,
    backgroundColor: "#1A1F2B",
    borderWidth: 0,
  },
  logoutInner: {
    zIndex: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 0,
    outlineWidth: 0,
    outlineStyle: "none",
    boxShadow: "none",
    shadowOpacity: 0,
    shadowColor: "transparent",
    elevation: 0,
    WebkitAppearance: "none",
    appearance: "none",
    WebkitTapHighlightColor: "transparent",
  },
  logoutText: { color: NIGHT.primary, fontWeight: "800" },
  headerBrand: {
    color: NIGHT.primary,
    fontWeight: "900",
    letterSpacing: 2,
    fontSize: 16,
    backgroundColor: "transparent",
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },

  loggedIn: { fontSize: 12, color: NIGHT.muted, marginBottom: 8 },

  bannerCard: {
    backgroundColor: NIGHT.card,
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
  },

  // Match BU Dashboard scope pills
  scopeRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  scopeButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: NIGHT.card,
    borderWidth: 1,
    borderColor: NIGHT.border,
  },
  scopeButtonActive: {
    backgroundColor: NIGHT.primary,
    borderColor: NIGHT.primary,
  },
  scopeButtonText: { color: NIGHT.text, fontWeight: "700" },
  scopeButtonTextActive: { color: "#FFFFFF", fontWeight: "800" },

  rangeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  rangeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: NIGHT.card,
    borderWidth: 1,
    borderColor: NIGHT.border,
  },
  rangeChipActive: { backgroundColor: NIGHT.primary, borderColor: NIGHT.primary },
  rangeChipText: { fontSize: 12, color: NIGHT.text },
  rangeChipTextActive: { color: "#FFFFFF", fontWeight: "700" },

  loadingBox: { marginTop: 30, alignItems: "center" },
  emptyBox: { marginTop: 40, alignItems: "center" },
  emptyText: { color: NIGHT.muted },

  orderCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: NIGHT.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#FFFFFF",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  orderCardSelected: {
    borderWidth: 1,
    borderColor: NIGHT.primary,
  },
  orderId: { fontSize: 16, fontWeight: "800", marginBottom: 6, color: NIGHT.text },
  meta: { fontSize: 12, color: NIGHT.text, marginBottom: 2 },

  actions: { justifyContent: "center", gap: 8 },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: NIGHT.primary,
    minWidth: 110,
    alignItems: "center",
  },
  actionBtnSecondary: { backgroundColor: "#1A1F2B" },
  actionBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
  actionBtnTextSecondary: { color: "#C9A24D" },
});
