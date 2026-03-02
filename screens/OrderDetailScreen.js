import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import { getOrderDetail } from "../src/api/orders";
import { canBuConfirmSent, canBuConfirmReceive, canSoConfirmReceive, canSoConfirmSent, canTraderConfirmSent, STATUS_IN_PROGRESS } from "../src/workflow/orderWorkflow";

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

const STATUS_PENDING = "1";
const STATUS_APPROVED = "11";
const STATUS_OPEN = "5";

export default function OrderDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId } = route.params || {};
  const soRoleFromList = route?.params?.soRole; // "sender" (pitching) | "recipient" (catching)

  const { userToken, role, apiBaseUrl } = useContext(AuthContext);

  const roleUpper = (role || "").toUpperCase();

  const [detail, setDetail] = useState(null);


  const loadOrder = useCallback(async () => {
    if (!orderId || !userToken || !apiBaseUrl) return;
    try {
      setLoading(true);


      const d = await getOrderDetail(orderId);
      setDetail(d);
    } catch (err) {
      Alert.alert("Load failed", err?.message ? String(err.message) : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [orderId, userToken, apiBaseUrl]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);


        const d = await getOrderDetail(orderId);
        setDetail(d);
      } catch (err) {
        Alert.alert("Load failed", err?.message ? String(err.message) : "Unknown error");
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId, apiBaseUrl, userToken]);

  const upperRole = String(role || "").toUpperCase();
  const latestStatusId = String(detail?.latestStatusId || "");

  const isSO = upperRole.includes("SO");
  const isTrader = upperRole.includes("TRADER");
  const isBU = upperRole.includes("BU");

  // Project GUI gating
  const canSOApprove = isSO && latestStatusId === STATUS_PENDING;
  const canSOPair = isSO && latestStatusId === STATUS_OPEN && soRoleFromList === 'recipient';

  const canTraderApproveOVN = isTrader && latestStatusId === STATUS_APPROVED;

  // BU cancel logic exists in BU screens; keep detail view neutral for now
  const canBUConfirmSent = isBU && canBuConfirmSent(latestStatusId);

  const canSOConfirmReceive = isSO && canSoConfirmReceive(latestStatusId, soRoleFromList);
  const canSOConfirmSent = isSO && canSoConfirmSent(latestStatusId, soRoleFromList);

  const showActions =
    canSOApprove ||
    canSOPair ||
    canTraderApproveOVN ||
    canBUConfirmSent ||
    canSOConfirmReceive ||
    canSOConfirmSent;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10, color: NIGHT.text }}>Loading...</Text>
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.center}>
        <Text style={{ color: NIGHT.text }}>Order not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 28 }}>
      <Text style={styles.pageTitle}>View Order</Text>

      <View style={styles.card}>
        <Row label="Order ID" value={detail?.orderId} />
        <Row label="Order Date" value={detail?.orderDate} />
        <Row label="Update Time" value={detail?.updateTime} />
        <Row label="Status" value={`${detail?.status} (ID ${latestStatusId})`} />
        <Row label="Amount" value={detail?.amount} />
        <Row label="Rate" value={detail?.rate} />
        <Row label="Purpose" value={detail?.purpose} />

        <View style={styles.divider} />

        <Text style={styles.section}>Sender</Text>
        <Row label="Country" value={detail?.senderCountry} />
        <Row label="Company" value={detail?.senderCompany} />
        <Row label="Currency" value={detail?.senderCurrency} />

        <View style={styles.divider} />

        <Text style={styles.section}>Receiver</Text>
        <Row label="Country" value={detail?.recipientCountry} />
        <Row label="Company" value={detail?.recipientCompany} />
        <Row label="Currency" value={detail?.recipientCurrency} />

        {/* Optional workflow fields if backend returns them */}
        {!!detail?.senderSOCompany && <Row label="Pitching SO" value={detail?.senderSOCompany} />}
        {!!detail?.recipientSOCompany && <Row label="Catching SO" value={detail?.recipientSOCompany} />}
        {!!detail?.senderPR && <Row label="Sender PR" value={detail?.senderPR} />}
        {!!detail?.recipientPR && <Row label="Recipient PR" value={detail?.recipientPR} />}
      </View>

      {showActions && (
        <View style={styles.card}>
          <Text style={styles.section}>Actions</Text>

          {canSOApprove && (
            <PrimaryButton
              title="Approve"
              onPress={() => navigation.navigate("SOApproveOrder", { orderId })}
            />
          )}

          {canSOPair && (
            <PrimaryButton
              title="Pair"
              onPress={() => navigation.navigate("SOPairOrder", { orderId })}
            />
          )}

          {canBUConfirmSent && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                console.log("[BUConfirmSent] open-from-detail", {
                  orderId,
                  beforeStatusId: latestStatusId,
                  expectedBeforeStatusId: STATUS_IN_PROGRESS,
                });
                navigation.navigate("BUConfirmSent", { orderId, beforeStatusId: latestStatusId });
              }}
            >
              <Text style={styles.actionBtnText}>Confirm Sent</Text>
            </TouchableOpacity>
          )}

          
          {/* SO Confirm Receive (Step 6 / 9) */}
          {roleUpper.includes("SO") && canSOConfirmReceive && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                console.log("[SOConfirmReceive] open-from-detail", { orderId, beforeStatusId: latestStatusId });
                navigation.navigate("SOConfirmReceive", { orderId, beforeStatusId: latestStatusId, soRole: soRoleFromList });
              }}
            >
              <Text style={styles.actionBtnText}>Confirm Receive</Text>
            </TouchableOpacity>
          )}

          {/* SO Confirm Sent (Step 7 / 10) */}
          {roleUpper.includes("SO") && canSOConfirmSent && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                console.log("[SOConfirmSent] open-from-detail", { orderId, beforeStatusId: latestStatusId });
                navigation.navigate("SOConfirmSent", { orderId, beforeStatusId: latestStatusId, soRole: soRoleFromList });
              }}
            >
              <Text style={styles.actionBtnText}>Confirm Sent</Text>
            </TouchableOpacity>
          )}

          {/* Trader Confirm Sent (Step 8) */}
          {roleUpper.includes("TRADER") && canTraderConfirmSent(latestStatusId) && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                console.log("[TraderConfirmSent] open-from-detail", { orderId, beforeStatusId: latestStatusId });
                navigation.navigate("TraderConfirmSent", { orderId, beforeStatusId: latestStatusId });
              }}
            >
              <Text style={styles.actionBtnText}>Confirm Sent</Text>
            </TouchableOpacity>
          )}

          {/* BU Confirm Receive (Step 11) */}
          {roleUpper.includes("BU") && canBuConfirmReceive(latestStatusId) && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                console.log("[BUConfirmReceive] open-from-detail", { orderId, beforeStatusId: latestStatusId });
                navigation.navigate("BUConfirmReceive", { orderId, beforeStatusId: latestStatusId });
              }}
            >
              <Text style={styles.actionBtnText}>Confirm Receive</Text>
            </TouchableOpacity>
          )}

{canTraderApproveOVN && (
            <PrimaryButton
              title="Approve(OVN)"
              onPress={() => navigation.navigate("TraderApproveOVN", { orderId })}
            />
          )}
        </View>
      )}
    </ScrollView>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value ?? ""}</Text>
    </View>
  );
}

function PrimaryButton({ title, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.primaryBtn}>
      <Text style={styles.primaryBtnText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NIGHT.bg, padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  pageTitle: { fontSize: 18, fontWeight: "900", marginBottom: 12, color: NIGHT.text },

  card: {
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

  section: { fontSize: 14, fontWeight: "900", marginBottom: 10, color: NIGHT.text },
  divider: { height: 1, backgroundColor: NIGHT.border, marginVertical: 12 },

  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6, gap: 14 },
  rowLabel: { fontSize: 12, color: NIGHT.muted, width: 110 },
  rowValue: { fontSize: 12, color: NIGHT.text, flex: 1, textAlign: "right" },

  primaryBtn: {
    backgroundColor: NIGHT.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "900" },
});
