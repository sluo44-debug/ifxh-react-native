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

import { getOrderDetail, confirmTraderSent } from "../src/api/orders";
import { STATUS_SENT_STEP3, STATUS_SENT_STEP4 } from "../src/workflow/orderWorkflow";

export default function TraderConfirmSentScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { token: userToken, apiBaseUrl, role } = useContext(AuthContext);

  const orderId = String(route?.params?.orderId ?? "");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState(null);
  const [confirmChecked, setConfirmChecked] = useState(false);

  const latestStatusId = useMemo(() => String(detail?.latestStatusId ?? ""), [detail]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Confirm Sent Order",
    });
  }, [navigation]);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const d = await getOrderDetail(orderId);
      setDetail(d ?? null);
    } catch (err) {
      Alert.alert("Load failed", err?.message ? String(err.message) : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, userToken, orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const onConfirm = useCallback(async () => {
    if (!confirmChecked) {
      Alert.alert("Validation", "Please check confirm checkbox before confirming sent order.");
      return;
    }

    const upperRole = String(role || "").toUpperCase();
    if (!upperRole.includes("TRADER")) {
      Alert.alert("Not allowed", "Only Trader can confirm sent at this step.");
      return;
    }

    if (latestStatusId !== STATUS_SENT_STEP3) {
      Alert.alert("Not allowed", `This order is not Sent Step3 (14). Current: ${latestStatusId}`);
      return;
    }

    try {
      setSubmitting(true);

      // Lightweight debug logs requested (status before/after + API call)
      console.log("[TraderConfirmSent] request", { orderId, beforeStatusId: latestStatusId });

      const res = await confirmTraderSent(orderId);

      console.log("[TraderConfirmSent] response", {
        orderId,
        response: res,
        expectedAfterStatusId: STATUS_SENT_STEP4,
      });

      Alert.alert("Success", "Confirmed Sent. Status should become Sent Step4 (15).", [
        {
          text: "OK",
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } catch (err) {
      console.log("[TraderConfirmSent] error", { orderId, err });
      Alert.alert("Confirm failed", err?.message ? String(err.message) : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }, [confirmChecked, latestStatusId, orderId, navigation, role]);

  const renderRow = (label, value) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value ?? ""}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8, color: NIGHT.text }}>Loading order...</Text>
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
    <ScrollView style={{ flex: 1, backgroundColor: NIGHT.bg }} contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Order</Text>
      {renderRow("Order ID", detail?.orderId)}
      {renderRow("Order Date", detail?.orderDate)}
      {renderRow("Update Time", detail?.updateTime)}
      {renderRow("Order Status", `${detail?.status ?? ""} (ID ${latestStatusId})`)}
      {renderRow("Rate", detail?.rate)}
      {renderRow("Amount", detail?.amount)}
      {renderRow("Purpose", detail?.purpose)}

      <Text style={styles.sectionTitle}>Sender</Text>
      {renderRow("Country", detail?.senderCountry)}
      {renderRow("Company", detail?.senderCompany)}
      {renderRow("Currency", detail?.senderCurrency)}

      <Text style={styles.sectionTitle}>Receiver</Text>
      {renderRow("Country", detail?.recipientCountry)}
      {renderRow("Company", detail?.recipientCompany)}
      {renderRow("Currency", detail?.recipientCurrency)}

      <View style={styles.checkboxRow}>
        <Switch value={confirmChecked} onValueChange={setConfirmChecked} />
        <Text style={styles.checkboxText}>Click the check box to confirm sent order.</Text>
      </View>

      <TouchableOpacity
        onPress={onConfirm}
        disabled={submitting}
        style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
      >
        <Text style={styles.primaryBtnText}>
          {submitting ? "Confirming..." : "Confirm Sent"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, styles.btnSecondary]}
        onPress={() => navigation.goBack()}
        disabled={submitting}
      >
        <Text style={[styles.btnText]}>Close</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: NIGHT.bg,
    padding: 16,
    paddingBottom: 28,
  },
  center: {
    flex: 1,
    backgroundColor: NIGHT.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
    color: NIGHT.text,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: NIGHT.border,
  },
  label: {
    width: 120,
    fontWeight: "600",
    color: NIGHT.muted,
  },
  value: {
    flex: 1,
    color: NIGHT.text,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    paddingVertical: 10,
  },
  checkboxText: {
    marginLeft: 10,
    flex: 1,
    color: NIGHT.muted,
  },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: NIGHT.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },

  btn: {
    marginTop: 12,
    backgroundColor: NIGHT.primaryDark,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  btnSecondary: {
    backgroundColor: NIGHT.card2,
  },
  btnText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  btnTextSecondary: {
    color: NIGHT.text,
  },

});
