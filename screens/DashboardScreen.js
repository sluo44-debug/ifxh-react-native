import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import AppMenu from "../components/AppMenu";
import DashboardHeaderTitle from "../components/DashboardHeaderTitle";
import { fetchBuMe } from "../src/api/bu";
import {
  listBuSentOrders,
  listBuReceivedOrders,
  listSoSentOrders,
  listSoReceivedOrders,
  cancelOrder as cancelOrderApi,
} from "../src/api/orders";
import { AuthContext } from "../context/AuthContext";
import MarketingBannerCarousel from "../src/components/MarketingBannerCarousel";

import { logRefresh } from "../src/debug/logger";
import useAutoOrdersRefresh from "../src/hooks/useAutoOrdersRefresh";
import { filterOrdersByRange } from "../src/utils/orderDateRange";
import { subscribeOrdersChanged } from "../src/utils/ordersBus";
import { canBuConfirmReceive, canBuConfirmSent, STATUS_IN_PROGRESS } from "../src/workflow/orderWorkflow";

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

function isTodayYYYYMMDD(dateStr) {
  if (!dateStr) return false;
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const today = `${yyyy}-${mm}-${dd}`;
  return String(dateStr).startsWith(today);
}

export default function DashboardScreen(props) {
  const navigation = useNavigation();
  const { onSelectOrder, selectedOrderId } = props || {};
  const { width } = useWindowDimensions();
  const isPad = Platform.OS === "ios" && Platform.isPad;
  const isTablet = isPad || width >= 768;

  const { token, apiBaseUrl, role, signOut } = useContext(AuthContext);

  const [selectedRange, setSelectedRange] = useState("Today");
  const ranges = useMemo(() => ["Today", "Weekly", "Monthly", "All"], []);
  const rangeLabel = (r) => (r === "Weekly" ? "1 Week" : r === "Monthly" ? "1 Month" : r);

  const [senderOrders, setSenderOrders] = useState([]);
  const [recipientOrders, setRecipientOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const [accountName, setAccountName] = useState("");

  const isBU = useMemo(() => String(role || "").toUpperCase().includes("BU"), [role]);

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
        <DashboardHeaderTitle role={role} companyName={accountName || (isBU ? "BU Company" : "")} isTablet={isTablet} />
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
  }, [navigation, signOut, isTablet, role, accountName, isBU]);

  const loadAccountName = useCallback(async () => {
    if (!token || !apiBaseUrl) return;

    // Only BU has company name from /api/bu/me
    if (!isBU) {
      setAccountName("");
      return;
    }

    try {
      const me = await fetchBuMe();
      setAccountName(String(me?.companyName || ""));
    } catch {
      setAccountName("");
    }
  }, [token, apiBaseUrl, isBU]);

  const loadDashboard = useCallback(async () => {
    if (!token || !apiBaseUrl) return;

    try {
      const searchCond = "All";

      const [sent, received] = await Promise.all(
        isBU
          ? [listBuSentOrders(searchCond), listBuReceivedOrders(searchCond)]
          : [listSoSentOrders(searchCond), listSoReceivedOrders(searchCond)]
      );

      setSenderOrders(Array.isArray(sent) ? sent : []);
      setRecipientOrders(Array.isArray(received) ? received : []);
    } catch (e) {
      Alert.alert("Error", e?.message ? String(e.message) : "Failed to load dashboard orders.");
      setSenderOrders([]);
      setRecipientOrders([]);
    } finally {
      setRefreshing(false);
    }
  }, [token, apiBaseUrl, isBU]);

  useEffect(() => {
    loadAccountName();
  }, [loadAccountName]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  useEffect(() => {
    const unsub = subscribeOrdersChanged(() => {
      loadDashboard();
    });
    return unsub;
  }, [loadDashboard]);

  useAutoOrdersRefresh({
    enabled: true,
    intervalMs: 10000,
    onTick: async () => {
      logRefresh("Dashboard", "autoPoll");
      await loadDashboard();
    },
  });

  const onRefresh = useCallback(async () => {
    logRefresh("Dashboard", "pullToRefresh");
    setRefreshing(true);
    await loadAccountName();
    await loadDashboard();
  }, [loadAccountName, loadDashboard]);

  const canCancelOrder = useCallback((o) => {
    if (typeof o?.canCancel === "boolean") return o.canCancel;

    const latestStatusId = String(o?.latestStatusId || "");
    const orderDate = String(o?.orderDate || "");
    return latestStatusId === "1" && isTodayYYYYMMDD(orderDate);
  }, []);

  const handleCancelOrder = useCallback(
    (orderId) => {
      if (!token || !apiBaseUrl) return;

      Alert.alert("Cancel Order", `Are you sure you want to cancel Order ID: ${orderId}?`, [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelOrderApi(String(orderId));
              Alert.alert("Cancelled", "Order cancelled successfully.");
              await loadDashboard();
            } catch (e) {
              Alert.alert("Error", e?.message ? String(e.message) : "Cancel request failed.");
            }
          },
        },
      ]);
    },
    [token, apiBaseUrl, loadDashboard]
  );

  const timeFilteredRecipientOrders = useMemo(() => {
    return filterOrdersByRange(recipientOrders || [], selectedRange);
  }, [recipientOrders, selectedRange]);

  const timeFilteredSenderOrders = useMemo(() => {
    return filterOrdersByRange(senderOrders || [], selectedRange);
  }, [senderOrders, selectedRange]);

  const filteredRecipientOrders = useMemo(() => {
    return timeFilteredRecipientOrders;
  }, [timeFilteredRecipientOrders]);

  const filteredSenderOrders = useMemo(() => {
    return timeFilteredSenderOrders;
  }, [timeFilteredSenderOrders]);

  // Keep ONLY this selection-clear effect (after filtered lists exist)
  useEffect(() => {
    if (!selectedOrderId || !onSelectOrder) return;
    const id = String(selectedOrderId);
    const allVisible = [...(filteredRecipientOrders || []), ...(filteredSenderOrders || [])];
    const stillVisible = allVisible.some((o) => String(o?.orderId ?? "") === id);
    if (!stillVisible) onSelectOrder(null);
  }, [selectedOrderId, onSelectOrder, filteredRecipientOrders, filteredSenderOrders]);

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={{ marginHorizontal: -16, marginTop: 0, marginBottom: 12 }}>
        <MarketingBannerCarousel autoplayMs={10000} fullBleed />
      </View>

      <View style={styles.card}>
        {isBU && (
          <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate("CreateOrder")}>
            <Text style={styles.createBtnText}>Create New Order</Text>
          </TouchableOpacity>
        )}

        <View style={styles.rangeRow}>
          {ranges.map((r) => {
            const active = r === selectedRange;
            return (
              <TouchableOpacity
                key={rangeLabel(r)}
                onPress={() => setSelectedRange(r)}
                style={[styles.rangeBtn, active && styles.rangeBtnActive]}
              >
                <Text style={[styles.rangeText, active && styles.rangeTextActive]}>{rangeLabel(r)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Recipient Orders */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{rangeLabel(selectedRange)} — Recipient Orders</Text>

        {filteredRecipientOrders.length === 0 ? (
          <Text style={{ opacity: 0.85, marginTop: 6, color: NIGHT.muted }}>No recipient orders.</Text>
        ) : (
          filteredRecipientOrders.map((o) => {
            const latestStatusId = String(o?.latestStatusId ?? "");
            const allowConfirmReceive = isBU && canBuConfirmReceive(latestStatusId);

            return (
              <TouchableOpacity
                key={String(o.orderId)}
                activeOpacity={0.92}
                onPress={() => onSelectOrder && onSelectOrder(String(o.orderId))}
                style={[
                  styles.orderCard,
                  selectedOrderId && String(selectedOrderId) === String(o.orderId) && styles.orderCardSelected,
                ]}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderLine}>Order ID: {o.orderId}</Text>
                    <Text style={styles.orderLine}>Date: {o.orderDate}</Text>
                    <Text style={styles.orderLine}>Amount: {o.amount}</Text>
                    <Text style={styles.orderLine}>Status: {o.status} (ID {latestStatusId})</Text>
                    <Text style={styles.orderLine}>Sender: {o.senderCompany}</Text>                   
                  </View>

                  <View style={styles.actionCol}>
                    <TouchableOpacity
                      style={styles.actionLink}
                      onPress={() => navigation.navigate("OrderDetail", { orderId: String(o.orderId) })}
                    >
                      <Text style={styles.actionLinkText}>View</Text>
                    </TouchableOpacity>

                    {allowConfirmReceive && (
                      <TouchableOpacity
                        style={styles.actionLink}
                        onPress={() =>
                          navigation.navigate("BUConfirmReceive", {
                            orderId: String(o.orderId),
                            beforeStatusId: latestStatusId,
                          })
                        }
                      >
                        <Text style={styles.actionLinkText}>Confirm Receive</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Sender Orders */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{rangeLabel(selectedRange)} — Sender Orders</Text>

        {filteredSenderOrders.length === 0 ? (
          <Text style={{ opacity: 0.85, marginTop: 6, color: NIGHT.muted }}>No sender orders.</Text>
        ) : (
          filteredSenderOrders.map((o) => {
            const allowCancel = canCancelOrder(o);
            const beforeStatusId = String(o?.latestStatusId ?? "");

            return (
              <TouchableOpacity
                key={String(o.orderId)}
                activeOpacity={0.92}
                onPress={() => onSelectOrder && onSelectOrder(String(o.orderId))}
                style={[
                  styles.orderCard,
                  selectedOrderId && String(selectedOrderId) === String(o.orderId) && styles.orderCardSelected,
                ]}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderLine}>Order ID: {o.orderId}</Text>
                    <Text style={styles.orderLine}>Date: {o.orderDate}</Text>
                    <Text style={styles.orderLine}>Amount: {o.amount}</Text>
                    <Text style={styles.orderLine}>Status: {o.status}</Text>
                    <Text style={styles.orderLine}>Receive: {o.recipientCompany}</Text>
                  </View>

                  <View style={styles.actionCol}>
                    <TouchableOpacity
                      style={styles.actionLink}
                      onPress={() => navigation.navigate("OrderDetail", { orderId: String(o.orderId) })}
                    >
                      <Text style={styles.actionLinkText}>View</Text>
                    </TouchableOpacity>

                    {isBU && canBuConfirmSent(beforeStatusId) && (
                      <TouchableOpacity
                        style={styles.actionLink}
                        onPress={() =>
                          navigation.navigate("BUConfirmSent", {
                            orderId: String(o.orderId),
                            beforeStatusId,
                            expectedBeforeStatusId: STATUS_IN_PROGRESS,
                          })
                        }
                      >
                        <Text style={styles.actionLinkText}>Confirm Sent</Text>
                      </TouchableOpacity>
                    )}

                    {allowCancel && (
                      <TouchableOpacity style={styles.actionLink} onPress={() => handleCancelOrder(String(o.orderId))}>
                        <Text style={[styles.actionLinkText, { color: "#b00020" }]}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NIGHT.bg,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },

  card: { backgroundColor: NIGHT.card, borderRadius: 18, padding: 16 },

  rangeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  rangeBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14, backgroundColor: NIGHT.chip },
  rangeBtnActive: { backgroundColor: NIGHT.primaryDark },
  rangeText: { fontSize: 12, fontWeight: "700", color: NIGHT.text },
  rangeTextActive: { color: "#FFFFFF" },

  createBtn: {
    marginTop: 14,
    backgroundColor: NIGHT.primaryDark,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  createBtnText: { color: "#FFFFFF", fontWeight: "900" },

  section: { marginTop: 18 },
  sectionTitle: { fontSize: 20, fontWeight: "900", marginBottom: 8, color: NIGHT.text },

  orderCard: { backgroundColor: NIGHT.card, borderRadius: 14, padding: 12, marginBottom: 10 },
  orderCardSelected: {
    borderWidth: 1,
    borderColor: NIGHT.primary,
  },

  orderLine: { color: NIGHT.text, fontSize: 13, fontWeight: "700", marginBottom: 2 },

  actionCol: { alignItems: "flex-end", justifyContent: "flex-start", gap: 10 },
  actionLink: { paddingVertical: 4, paddingHorizontal: 6 },
  actionLinkText: { fontWeight: "900", color: "#C9A24D" },

  logoutOuter: {
    position: "relative",
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#2A3142",
    backgroundColor: "#1A1F2B",
    overflow: "hidden",
  },
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
    paddingVertical: 6,
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
  logoutText: { fontWeight: "800", color: "#C9A24D" },
  headerBrand: {
    color: "#C9A24D",
    fontWeight: "900",
    letterSpacing: 2,
    fontSize: 16,
    backgroundColor: "transparent",
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
});
