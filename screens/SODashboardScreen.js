import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
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
  View,
  useWindowDimensions,
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

import { request } from "../src/api/client";
import { listSoReceivedOrders, listSoSentOrders } from "../src/api/orders";
import { log, logRefresh } from "../src/debug/logger";
import useAutoOrdersRefresh from "../src/hooks/useAutoOrdersRefresh";
import { filterOrdersByRange } from "../src/utils/orderDateRange";
import { subscribeOrdersChanged } from "../src/utils/ordersBus";
import {
  STATUS_SENT_STEP1,
  STATUS_SENT_STEP2,
  STATUS_SENT_STEP4,
  STATUS_SENT_STEP5,
  canSoConfirmReceive,
  canSoConfirmSent,
} from "../src/workflow/orderWorkflow";


const STATUS_PENDING = "1"; // SO Approve (pitching SO)
const STATUS_OPEN = "5";    // SO Pair (catching SO)

export default function SODashboardScreen(props) {
  const navigation = useNavigation();
  const { onSelectOrder, selectedOrderId } = props || {};
  const { width } = useWindowDimensions();
  const isPad = Platform.OS === "ios" && Platform.isPad;
  const isTablet = isPad || width >= 768;
  const route = useRoute();
  const { token, role, apiBaseUrl, email, signOut } = useContext(AuthContext);

  const [accountName, setAccountName] = useState("");
  const upperRole = String(role || "").toUpperCase();
  const isSO = upperRole.includes("SO");

  // SO dashboard scope filters:
// - "Awaiting Action": show only orders that require SO actions (Approve / Pair / Confirm Receive / Confirm Sent).
// - "All": show all SO-related orders (merged sender + received). Action buttons appear when status matches.
const [viewMode, setViewMode] = useState("All");

  // We fetch the full list from the backend (searchCond=All) and apply range filtering
  // client-side to avoid inconsistent backend filtering across roles.
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchCond, setSearchCond] = useState("Today");

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
      headerTitle: () => (
        <DashboardHeaderTitle role={role} companyName={accountName || "So Company"} isTablet={isTablet} />
      ),
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
  }, [navigation, signOut, isTablet, role, accountName]);


  const load = useCallback(async (opts = {}) => {
    const silent = !!opts.silent;
    if (!token) {
      Alert.alert("Not logged in", "Please login again.");
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      return;
    }
    if (!isSO) {
      Alert.alert("Role mismatch", "This dashboard is for SO role only.");
      navigation.reset({ index: 0, routes: [{ name: "Dashboard" }] });
      return;
    }

    try {
      if (!silent) setLoading(true);
      //syncApiClient();
      // Fetch SO display name (company name) for top-left label (same as BU dashboard)
      try {
        const me = await request("GET", "/api/so/me");
        const companyName = (me && me.companyName) ? String(me.companyName) : "";
        setAccountName(companyName);
      } catch (e) {
        // Non-blocking: fallback to email if this fails
        log("SODashboard: /api/so/me failed (fallback to email)", { error: String(e) });
      }


      // Always fetch both lists and merge.
      // NOTE: Backend range filtering differs across roles/stored procedures.
      // To ensure "Today" and "1 Week" behave consistently (and include new BU orders),
      // always fetch ALL orders then filter by range locally.
      log("SODashboard: listing MERGED (sender + received)", { searchCond, viewMode, apiRange: "All" });
      const [sentRaw, receivedRaw] = await Promise.all([
        listSoSentOrders("All"),
        listSoReceivedOrders("All"),
      ]);
      const sent = (Array.isArray(sentRaw) ? sentRaw : []).map(o => ({ ...o, __soRole: 'sender' }));
      const received = (Array.isArray(receivedRaw) ? receivedRaw : []).map(o => ({ ...o, __soRole: 'recipient' }));
      // De-dupe by orderId. Prefer recipient (catching SO) version if exists.
      const map = new Map();
      [...sent, ...received].forEach((o) => {
        const id = String(o?.orderId ?? "");
        if (!id) return;
        const existing = map.get(id);
        if (!existing || o.__soRole === 'recipient') {
          map.set(id, o);
        }
      });
      setAllOrders(Array.from(map.values()));
} catch (e) {
      Alert.alert("Load failed", e?.message ? String(e.message) : "Cannot load SO orders.");
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, [token, isSO, navigation]);

  useFocusEffect(
    useCallback(() => {
      // Refresh whenever user returns from Approve/Pair screens.
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
      logRefresh("SODashboard", "autoPoll");
      await load({ silent: true });
    },
  });

  const onRefresh = useCallback(async () => {
    logRefresh("SODashboard", "pullToRefresh");
    setRefreshing(true);
    await load();
  }, [load]);

  const ranges = useMemo(() => ["Today", "Weekly", "Monthly", "All"], []);
  const rangeLabel = (r) => (r === "Weekly" ? "1 Week" : r === "Monthly" ? "1 Month" : r);
  
  const viewModes = useMemo(
    () => [
      { key: "Awaiting Action", label: "Awaiting Action" },
      { key: "All", label: "All" },
    ],
    []
  );
const filteredOrders = useMemo(() => {
    // 1) Range filter (Today / Weekly / Monthly / All)
    const rangeFiltered = filterOrdersByRange(allOrders, searchCond);

    // Scope filter:
    // - "All": show all orders returned from backend (merged sender+received).
    // - "Awaiting Action": only show orders that have at least one SO action (beyond View).
    if (viewMode === "Awaiting Action") {
      return rangeFiltered.filter((o) => {
        const latestStatusId = String(o?.latestStatusId || "");
            const canApprove = latestStatusId === STATUS_PENDING;
            const canPair = latestStatusId === STATUS_OPEN && o?.__soRole === 'recipient';
            const canConfirmReceive = canSoConfirmReceive(latestStatusId, o?.__soRole);
        const canConfirmSent = canSoConfirmSent(latestStatusId, o?.__soRole);
        return canApprove || canPair || canConfirmReceive || canConfirmSent;
      });
    }
    return rangeFiltered;
  }, [allOrders, viewMode, searchCond]);

  // Phase 3: clear preview selection if order no longer matches current filters.
  useEffect(() => {
    if (!selectedOrderId) return;
    const id = String(selectedOrderId);
    const stillVisible = (filteredOrders || []).some((o) => String(o?.orderId) === id);
    if (!stillVisible) {
      onSelectOrder && onSelectOrder(null);
    }
  }, [selectedOrderId, filteredOrders, onSelectOrder]);

  const renderItem = ({ item }) => {
    const latestStatusId = String(item?.latestStatusId || "");
        const canApprove = latestStatusId === STATUS_PENDING;
        const canPair = latestStatusId === STATUS_OPEN && item?.__soRole === 'recipient';
    // Part B (Steps 6/9 receive, 7/10 sent) gating is centralized in workflow helpers.
        const canConfirmReceive = canSoConfirmReceive(latestStatusId, item?.__soRole);
        const canConfirmSent = canSoConfirmSent(latestStatusId, item?.__soRole);

    return (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => onSelectOrder && onSelectOrder(String(item?.orderId), item?.__soRole)}
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
          <Text style={styles.meta}>SO Role: {item?.__soRole}</Text>
        </View>

        <View style={styles.actionCol}>
          <ActionButton
            title="View"
            variant="secondary"
            onPress={() => navigation.navigate("OrderDetail", { orderId: item?.orderId, soRole: item?.__soRole })}
          />

          {/* Web GUI gating replicated: show action buttons by view + status */}
          {canApprove && (
            <ActionButton
              title="Approve"
              onPress={() => navigation.navigate("SOApproveOrder", { orderId: item?.orderId })}
            />
          )}

          {canPair && (
            <ActionButton
              title="Pair"
              onPress={() => navigation.navigate("SOPairOrder", { orderId: item?.orderId })}
            />
          )}


          {/* Confirm Receive should also appear in "All" when status matches */}
          {canConfirmReceive && (
  <ActionButton
    title="Confirm Receive"
    onPress={() => {
      const before = String(item?.latestStatusId || "");
      log("SOConfirmReceive: open", {
        orderId: item?.orderId,
        beforeStatusId: before,
        expectedBeforeStatusId: before === STATUS_SENT_STEP4 ? STATUS_SENT_STEP4 : STATUS_SENT_STEP1,
      });
      navigation.navigate("SOConfirmReceive", { orderId: item?.orderId, beforeStatusId: before, soRole: item?.__soRole });
    }}
  />
)}

          {/* Confirm Sent should also appear in "All" when status matches */}
          {canConfirmSent && (
  <ActionButton
    title="Confirm Sent"
    onPress={() => {
      const before = String(item?.latestStatusId || "");
      log("SOConfirmSent: open", {
        orderId: item?.orderId,
        beforeStatusId: before,
        expectedBeforeStatusId: before === STATUS_SENT_STEP5 ? STATUS_SENT_STEP5 : STATUS_SENT_STEP2,
      });
      navigation.navigate("SOConfirmSent", { orderId: item?.orderId, beforeStatusId: before, soRole: item?.__soRole });
    }}
  />
)}
        </View>
      </TouchableOpacity>
    );
  };
  return (
    <View style={styles.container}>
      <FlatList
        data={filteredOrders}
        keyExtractor={(item, idx) => String(item?.orderId ?? idx)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View>
            <View style={{ marginHorizontal: -16, marginTop: 0, marginBottom: 12 }}>
              <MarketingBannerCarousel autoplayMs={10000} fullBleed />
            </View>

            {/* View mode selector 
            <View style={styles.modeRow}>
              {viewModes.map((m) => {
                const active = m.key === viewMode;
                return (
                  <TouchableOpacity
                    key={m.key}
                    onPress={() => {
                      setViewMode(m.key);
                      logRefresh("SODashboard", "viewModeChange", { viewMode: m.key });
                    }}
                    style={[styles.modeBtn, active && styles.modeBtnActive]}
                  >
                    <Text style={[styles.modeText, active && styles.modeTextActive]}>{m.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>*/}

            {/* Range selector */}
            <View style={styles.rangeRow}>
              {ranges.map((r) => {
                const active = r === searchCond;
                return (
                  <TouchableOpacity
                    key={rangeLabel(r)}
                    onPress={() => setSearchCond(r)}
                    style={[styles.rangeBtn, active && styles.rangeBtnActive]}
                  >
                    <Text style={[styles.rangeText, active && styles.rangeTextActive]}>{rangeLabel(r)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        }
        ListFooterComponent={
          <View style={styles.helpBar}>
            <Text style={styles.helpText}>
              {viewMode === "Awaiting Action"
                ? "Awaiting Action shows only orders that need your action (Approve / Pair / Confirm Receive / Confirm Sent)."
                : "All shows orders from both Sender/Received for troubleshooting; action buttons will appear when status matches."}
            </Text>
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
              <Text style={styles.emptyText}>
                {viewMode === "Awaiting Action" ? "No orders awaiting action." : "No orders found."}
              </Text>
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
    marginRight: 10,
    position: "relative",
    borderRadius: 999,
    borderWidth: 2,
    borderColor: NIGHT.border,
    backgroundColor: NIGHT.card,
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
    backgroundColor: NIGHT.card,
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
  logoutText: { color: NIGHT.primary, fontWeight: "900" },
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

  bannerCard: {
    backgroundColor: NIGHT.card,
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
  },

  modeRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  modeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: NIGHT.card,
    borderWidth: 1,
    borderColor: NIGHT.border,
  },
  modeBtnActive: { backgroundColor: NIGHT.primary, borderColor: NIGHT.primary },
  modeText: { fontSize: 12, color: NIGHT.text, fontWeight: "800" },
  modeTextActive: { color: "#FFFFFF" },

  // Match BU/Trader time-range selection style: dark chip + bright active chip.
  rangeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  rangeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: NIGHT.chip,
    borderWidth: 1,
    borderColor: NIGHT.border,
  },
  rangeBtnActive: {
    backgroundColor: NIGHT.primary,
    borderColor: NIGHT.primary,
    shadowColor: "#FFFFFF",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  rangeText: { fontSize: 12, fontWeight: "700", color: NIGHT.text },
  rangeTextActive: { color: "#FFFFFF" },

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

  actionCol: { justifyContent: "center", gap: 8 },
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

  helpBar: { marginTop: 6 },
  helpText: { fontSize: 11, color: NIGHT.muted },
});
