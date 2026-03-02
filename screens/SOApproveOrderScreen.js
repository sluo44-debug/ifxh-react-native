import { useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AuthContext } from "../context/AuthContext";

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

import { approveByPitchingSo, getOrderDetail } from "../src/api/orders";

const STATUS_PENDING = "1";

export default function SOApproveOrderScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { token, role, apiBaseUrl } = useContext(AuthContext);

  const orderId = String(route?.params?.orderId || "");
  const isSO = useMemo(() => String(role || "").toUpperCase().includes("SO"), [role]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        Alert.alert("Not logged in", "Please login again.");
        navigation.goBack();
        return;
      }
      if (!isSO) {
        Alert.alert("Role mismatch", "This screen is for SO role only.");
        navigation.goBack();
        return;
      }
      if (!orderId) {
        Alert.alert("Missing Order", "OrderId not found.");
        navigation.goBack();
        return;
      }

      try {
        setLoading(true);
        const d = await getOrderDetail(orderId);
        setDetail(d);
      } catch (e) {
        Alert.alert("Load failed", e?.message ? String(e.message) : "Cannot load order detail.");
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token, isSO, orderId, navigation]);

  const doApprove = async () => {
    if (!detail) return;
    const latestStatusId = String(detail?.latestStatusId || "");
    if (latestStatusId !== STATUS_PENDING) {
      Alert.alert("Not allowed", `Only Pending orders can be approved. Current statusId=${latestStatusId}`);
      return;
    }
    if (!confirm) {
      Alert.alert("Confirm required", "Please check the confirmation toggle before approving.");
      return;
    }

    try {
      setSubmitting(true);

      await approveByPitchingSo(orderId);
      Alert.alert("Approved", "Order approved successfully.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Approve failed", e?.message ? String(e.message) : "Approve request failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 10, opacity: 0.7 }}>Loading…</Text>
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

  const latestStatusId = String(detail?.latestStatusId || "");
  const canApprove = isSO && latestStatusId === STATUS_PENDING;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 28 }}>
      <Text style={styles.pageTitle}>Approve Order</Text>

      <View style={styles.card}>
        <KV label="Order ID" value={detail.orderId} />
        <KV label="Order Date" value={detail.orderDate} />
        <KV label="Status" value={`${detail.status} (ID ${latestStatusId})`} />
        <KV label="Rate" value={detail.rate} />
        <KV label="Amount" value={detail.amount} />
        <KV label="Purpose" value={detail.purpose || ""} />

        <View style={styles.divider} />

        <Text style={styles.h2}>Sender</Text>
        <KV label="Country" value={detail?.senderCountry} />
        <KV label="Company" value={detail?.senderCompany} />
        <KV label="Currency" value={detail?.senderCurrency} />

        <View style={styles.divider} />

        <Text style={styles.h2}>Receiver</Text>
        <KV label="Country" value={detail?.recipientCountry} />
        <KV label="Company" value={detail?.recipientCompany} />
        <KV label="Currency" value={detail?.recipientCurrency} /> 

      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.blockTitle}>Confirmation</Text>
        <Text style={styles.helpText}>
          This confirmation toggle is client-side only (same idea as the Project GUI checkbox) to prevent accidental clicks.
        </Text>
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>I confirm I want to approve</Text>
          <Switch value={confirm} onValueChange={setConfirm} />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, (!canApprove || submitting) && { opacity: 0.6 }]}
        onPress={doApprove}
        disabled={!canApprove || submitting}
      >
        <Text style={styles.primaryBtnText}>{submitting ? "Approving…" : "Approve"}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.secondaryBtnText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function KV({ label, value }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvValue}>{value ?? ""}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NIGHT.bg, padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontSize: 22, fontWeight: "900", marginBottom: 12, color: NIGHT.text },

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
  h2: {fontSize: 14, fontWeight: "900", marginBottom: 10 , color: NIGHT.text },
  kvRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6, gap: 14 },
  kvLabel: { fontSize: 12, color: NIGHT.muted, width: 110 },
  kvValue: { fontSize: 12, color: NIGHT.text, flex: 1, textAlign: "right" },

  divider: { height: 1, backgroundColor: NIGHT.border, marginVertical: 12 },

  sectionCard: { backgroundColor: NIGHT.card, borderRadius: 16, padding: 14, marginTop: 12 },
  blockTitle: { fontSize: 16, fontWeight: "900", marginBottom: 8, color: NIGHT.text },
  helpText: { color: NIGHT.muted, marginBottom: 10 },

  confirmRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  confirmLabel: { fontWeight: "900" , color: NIGHT.text },

  primaryBtn: {
    marginTop: 16,
    backgroundColor: "#C9A24D",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },

  secondaryBtn: {
    marginTop: 12,
    backgroundColor: NIGHT.card2,
    borderWidth: 1,
    borderColor: NIGHT.border,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  secondaryBtnText: { color: NIGHT.text, fontWeight: "900", fontSize: 15 },



});