import React, { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
  Switch,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
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

import { getOrderDetail, confirmSoReceivePitching, confirmSoReceiveCatching } from "../src/api/orders";
import { STATUS_SENT_STEP1, STATUS_SENT_STEP2, STATUS_SENT_STEP4, STATUS_SENT_STEP5 } from "../src/workflow/orderWorkflow";

export default function SOConfirmReceiveScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { token: userToken, apiBaseUrl } = useContext(AuthContext);

  const orderId = String(route?.params?.orderId ?? "");
  const beforeStatusIdParam = route?.params?.beforeStatusId ? String(route.params.beforeStatusId) : "";
  const soRole = route?.params?.soRole ? String(route.params.soRole) : null; // "sender" | "recipient" | null

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState(null);
  const [confirmChecked, setConfirmChecked] = useState(false);

  const latestStatusId = useMemo(() => String(detail?.latestStatusId ?? beforeStatusIdParam ?? ""), [detail, beforeStatusIdParam]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: "Confirm Received Order" });
  }, [navigation]);


  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      const d = await getOrderDetail(orderId);
      setDetail(d ?? null);
    } catch (e) {
      Alert.alert("Load failed", e?.message ? String(e.message) : "Unknown error");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const onConfirm = useCallback(async () => {
    if (!confirmChecked) {
      Alert.alert("Validation", "Please check confirm checkbox before confirming receive order.");
      return;
    }

    const sFromRoute = String(beforeStatusIdParam ?? "");
    const sFromDetail = String(latestStatusId ?? "");
    const s = sFromRoute || sFromDetail;
    const isPitchingReceive = s === STATUS_SENT_STEP1; // step 6 (pitching SO)
    const isCatchingReceive = s === STATUS_SENT_STEP4; // step 9 (catching SO)

    if (!isPitchingReceive && !isCatchingReceive) {
      Alert.alert("Not allowed", `This order is not eligible for SO Confirm Receive. Current: ${s}`);
      return;
    }

    // Defensive: ensure the correct SO is performing the confirm action.
    // - status 12 => sender (pitching)
    // - status 15 => recipient (catching)
    if (isPitchingReceive && soRole && soRole !== "sender") {
      Alert.alert("Not allowed", "Only the Pitching SO can Confirm Receive at this step.");
      return;
    }
    if (isCatchingReceive && soRole && soRole !== "recipient") {
      Alert.alert("Not allowed", "Only the Catching SO can Confirm Receive at this step.");
      return;
    }

    try {
      setSubmitting(true);

      console.log("[SOConfirmReceive] request", { orderId, beforeStatusId: s });

      const res = isCatchingReceive
        ? await confirmSoReceiveCatching(orderId)
        : await confirmSoReceivePitching(orderId);

      const expectedAfter = isCatchingReceive ? STATUS_SENT_STEP5 : STATUS_SENT_STEP2;

      console.log("[SOConfirmReceive] response", { orderId, response: res, expectedAfterStatusId: expectedAfter });

      Alert.alert(
        "Success",
        isCatchingReceive
          ? "Confirmed Received. Status should become Sent Step5 (22)."
          : "Confirmed Received. Status should become Sent Step2 (13).",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      console.log("[SOConfirmReceive] error", { orderId, err });
      Alert.alert("Confirm failed", err?.message ? String(err.message) : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }, [confirmChecked, latestStatusId, orderId, navigation]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.center}>
        <Text style={{ opacity: 0.7 }}>Order not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.h1}>Confirm Received Order</Text>

        <Text style={styles.row}>Order ID: {detail.orderId}</Text>
        <Text style={styles.row}>Order Date: {detail.orderDate}</Text>
        <Text style={styles.row}>Update Time: {detail.updateTime}</Text>
        <Text style={styles.row}>Order Status: {detail.status}</Text>
        <Text style={styles.row}>Rate: {detail.rate}</Text>
        <Text style={styles.row}>Amount: {detail.amount}</Text>
        <Text style={styles.row}>Purpose: {detail.purpose}</Text>

        <Text style={styles.section}>Sender</Text>
        <Text style={styles.row}>Country: {detail.senderCountry}</Text>
        <Text style={styles.row}>Company: {detail.senderCompany}</Text>
        <Text style={styles.row}>Currency: {detail.senderCurrency}</Text>

        <Text style={styles.section}>Receiver</Text>
        <Text style={styles.row}>Country: {detail.recipientCountry}</Text>
        <Text style={styles.row}>Company: {detail.recipientCompany}</Text>
        <Text style={styles.row}>Currency: {detail.recipientCurrency}</Text>

        <View style={styles.divider} />

        <View style={styles.confirmRow}>
          <Switch value={confirmChecked} onValueChange={setConfirmChecked} />
          <Text style={styles.confirmText}>Click the check box to confirm receive order.</Text>
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.btn, submitting ? styles.btnDisabled : null]}
            disabled={submitting}
            onPress={onConfirm}
          >
            <Text style={styles.btnText}>{submitting ? "Confirming..." : "Confirm"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => navigation.goBack()}>
            <Text style={styles.btnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    backgroundColor: NIGHT.card,
    borderRadius: 18,
    padding: 16,
    shadowColor: "#FFFFFF",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  h1: { color: NIGHT.text,  fontSize: 20, fontWeight: "900", marginBottom: 10 },
  row: { color: NIGHT.text,  marginTop: 6, opacity: 0.9 },
  section: { color: NIGHT.text,  marginTop: 14, fontWeight: "900" },
  divider: { height: 1, backgroundColor: "#1A1F2B", marginTop: 14 },

  confirmRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  confirmText: { color: NIGHT.muted,  flex: 1, opacity: 0.85 },

  btnRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  btn: {
    flex: 1,
    backgroundColor: NIGHT.primaryDark,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  btnSecondary: { backgroundColor: NIGHT.chip },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#FFFFFF", fontWeight: "800" },
});
