import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import { getOrderDetail } from "../src/api/orders";
import {
  canBuConfirmReceive,
  canBuConfirmSent,
  canSoConfirmReceive,
  canSoConfirmSent,
  canTraderConfirmSent,
  STATUS_IN_PROGRESS,
} from "../src/workflow/orderWorkflow";
import { emitOrdersChanged } from "../src/utils/ordersBus";

const NIGHT = {
  bg: "#101522",
  card: "#1A1F2B",
  text: "#FFFFFF",
  muted: "#BFC6CF",
  border: "#2A3142",
  primary: "#C9A24D",
  danger: "#ef4444",
};

/**
 * Phase 2: Lightweight order preview panel.
 *
 * - Keeps existing navigation flows intact.
 * - Shows a concise summary + quick action buttons when available.
 * - Always includes a "View" button to open the full OrderDetail screen.
 */
export default function OrderPreviewPanel({ orderId, soRole, onClear }) {
  const navigation = useNavigation();
  const { userToken, token, role, apiBaseUrl } = useContext(AuthContext);
  const authToken = userToken || token; // project historically uses both keys in different screens

  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const upperRole = String(role || "").toUpperCase();
  const latestStatusId = String(detail?.latestStatusId || "");

  const load = useCallback(async () => {
    if (!orderId || !authToken || !apiBaseUrl) return;
    try {
      setLoading(true);
      setErrorMsg("");
      const d = await getOrderDetail(String(orderId));
      setDetail(d);
    } catch (err) {
      setDetail(null);
      const msg = err?.message ? String(err.message) : "Unknown error";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [orderId, authToken, apiBaseUrl]);

  // Phase 3: refresh preview whenever the user returns from an action screen.
  useFocusEffect(
    useCallback(() => {
      if (orderId) load();
    }, [orderId, load])
  );

  useEffect(() => {
    setDetail(null);
    if (orderId) load();
  }, [orderId, load]);

  const isBU = upperRole.includes("BU");
  const isSO = upperRole.includes("SO");
  const isTrader = upperRole.includes("TRADER");

  const showBUConfirmReceive = isBU && canBuConfirmReceive(latestStatusId);
  const showBUConfirmSent = isBU && canBuConfirmSent(latestStatusId);
  // SO confirm buttons are role-dependent: "sender"(pitching) vs "recipient"(catching)
  const showSOConfirmReceive = isSO && canSoConfirmReceive(latestStatusId, soRole);
  const showSOConfirmSent = isSO && canSoConfirmSent(latestStatusId, soRole);
  const showTraderConfirmSent = isTrader && canTraderConfirmSent(latestStatusId);

  const hasAnyActions =
    showBUConfirmReceive ||
    showBUConfirmSent ||
    showSOConfirmReceive ||
    showSOConfirmSent ||
    showTraderConfirmSent;

  const canCancelFromPreview = useMemo(() => {
    if (!isBU) return false;
    const latest = String(detail?.latestStatusId || "");
    // Business rule: cancel only on Step 1 and only on the same day.
    if (latest !== "1") return false;
    const od = String(detail?.orderDate || "");
    if (!od) return false;
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const today = `${yyyy}-${mm}-${dd}`;
    return od.startsWith(today);
  }, [isBU, detail?.latestStatusId, detail?.orderDate]);

  const [actionLoading, setActionLoading] = useState(false);

  const cancelOrder = useCallback(async () => {
    if (!orderId || !authToken || !apiBaseUrl) return;
    Alert.alert("Cancel Order", `Are you sure you want to cancel Order ID: ${orderId}?`, [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: async () => {
          try {
            setActionLoading(true);
            const base = String(apiBaseUrl).replace(/\/$/, "");
            const res = await fetch(`${base}/api/orders/${orderId}/cancel`, {
              method: "POST",
              headers: { Authorization: `Bearer ${authToken}`, Accept: "application/json" },
            });
            const txt = await res.text().catch(() => "");
            if (!res.ok) {
              Alert.alert("Cancel Failed", txt || `${res.status} ${res.statusText}`);
              return;
            }
            Alert.alert("Cancelled", "Order cancelled successfully.");
            emitOrdersChanged("cancel");
            await load();
            onClear && onClear();
          } catch (e) {
            Alert.alert("Error", e?.message ? String(e.message) : "Cancel request failed.");
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }, [orderId, authToken, apiBaseUrl, load, onClear]);

  if (!orderId) {
    return (
      <View style={styles.empty}>
        <Text style={styles.title}>Detail Preview</Text>
        <Text style={styles.muted}>Tap an order card to preview details here.</Text>
      </View>
    );
  }

  // Quick actions that were previously shown as a separate "Quick Actions" section.
  // For tablet (iPad) detail preview we want these to be simple primary buttons next to "View".
  const quickActions = [];
  if (showBUConfirmReceive) {
    quickActions.push({
      key: "BUConfirmReceive",
      title: "Confirm Receive",
      onPress: () =>
        navigation.navigate("BUConfirmReceive", {
          orderId: String(orderId),
          beforeStatusId: latestStatusId,
        }),
    });
  }
  if (showBUConfirmSent) {
    quickActions.push({
      key: "BUConfirmSent",
      title: "Confirm Sent",
      onPress: () =>
        navigation.navigate("BUConfirmSent", {
          orderId: String(orderId),
          beforeStatusId: latestStatusId,
        }),
    });
  }
  if (showSOConfirmReceive) {
    quickActions.push({
      key: "SOConfirmReceive",
      title: "Confirm Receive",
      onPress: () =>
        navigation.navigate("SOConfirmReceive", {
          orderId: String(orderId),
          beforeStatusId: latestStatusId,
          ...(soRole ? { soRole } : {}),
        }),
    });
  }
  if (showSOConfirmSent) {
    quickActions.push({
      key: "SOConfirmSent",
      title: "Confirm Sent",
      onPress: () =>
        navigation.navigate("SOConfirmSent", {
          orderId: String(orderId),
          beforeStatusId: latestStatusId,
          ...(soRole ? { soRole } : {}),
        }),
    });
  }
  if (showTraderConfirmSent) {
    quickActions.push({
      key: "TraderConfirmSent",
      title: "Confirm Sent",
      onPress: () =>
        navigation.navigate("TraderConfirmSent", {
          orderId: String(orderId),
          beforeStatusId: latestStatusId,
        }),
    });
  }

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Detail Preview</Text>
        {!!onClear && (
          <TouchableOpacity onPress={onClear} style={styles.clearBtn}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading order {String(orderId)}...</Text>
        </View>
      ) : !detail ? (
        <View style={styles.loading}>
          <Text style={styles.muted}>{errorMsg ? errorMsg : "No preview available."}</Text>
          <TouchableOpacity onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 12 }}>
          <View style={styles.card}>
            <Row label="Order" value={detail?.orderId} />
            <Row label="Status" value={`${detail?.status} (ID ${latestStatusId})`} />
            <Row label="Amount" value={detail?.amount} />
            <Row label="Rate" value={detail?.rate} />
            <Row label="Sender" value={detail?.senderCompany} />
            <Row label="Receiver" value={detail?.recipientCompany} />
          </View>

          <View style={styles.actionsRow}>
            <PrimaryButton
              title="View"
              onPress={() =>
                navigation.navigate("OrderDetail", {
                  orderId: String(orderId),
                  ...(soRole ? { soRole } : {}),
                })
              }
            />

            {quickActions.map((a) => (
              <PrimaryButton key={a.key} title={a.title} onPress={a.onPress} />
            ))}

            {canCancelFromPreview ? (
              <DangerButton title={actionLoading ? "Cancelling…" : "Cancel"} onPress={cancelOrder} disabled={actionLoading} />
            ) : null}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value ?? ""}
      </Text>
    </View>
  );
}

function PrimaryButton({ title, onPress }) {
  return (
    <TouchableOpacity style={styles.primaryBtn} onPress={onPress}>
      <Text style={styles.primaryText}>{title}</Text>
    </TouchableOpacity>
  );
}

function ActionButton({ title, onPress }) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
      <Text style={styles.actionText}>{title}</Text>
    </TouchableOpacity>
  );
}

function DangerButton({ title, onPress, disabled }) {
  return (
    <TouchableOpacity
      style={[styles.dangerBtn, disabled && { opacity: 0.6 }]}
      onPress={disabled ? undefined : onPress}
    >
      <Text style={styles.dangerText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 12,
    backgroundColor: NIGHT.bg,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    color: NIGHT.primary,
    fontWeight: "900",
    fontSize: 16,
  },
  muted: {
    color: NIGHT.muted,
    fontSize: 13,
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: NIGHT.border,
  },
  clearText: {
    color: NIGHT.muted,
    fontWeight: "800",
    fontSize: 12,
  },
  empty: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  scroll: {
    flex: 1,
  },
  card: {
    backgroundColor: NIGHT.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: NIGHT.border,
    marginBottom: 10,
  },
  section: {
    color: NIGHT.text,
    fontWeight: "900",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 4,
  },
  label: {
    color: NIGHT.muted,
    fontWeight: "800",
    width: 80,
  },
  value: {
    color: NIGHT.text,
    fontWeight: "800",
    flex: 1,
    textAlign: "right",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  primaryBtn: {
    backgroundColor: NIGHT.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  primaryText: {
    color: "#0B1320",
    fontWeight: "900",
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: NIGHT.border,
    marginBottom: 8,
  },
  actionText: {
    color: NIGHT.text,
    fontWeight: "900",
  },

  dangerBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: NIGHT.border,
    backgroundColor: "#2A1418",
  },
  dangerText: {
    color: NIGHT.danger,
    fontWeight: "900",
  },

  retryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: NIGHT.border,
    marginTop: 8,
  },
  retryText: {
    color: NIGHT.primary,
    fontWeight: "900",
  },
});
