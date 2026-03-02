import { useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
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

import { approveByTraderOVN, getOrderDetail } from "../src/api/orders";
import { fetchEligibleCatchingSOs } from "../src/api/so";

const STATUS_APPROVED = "11"; // Approved by Pitching SO
const STATUS_OPEN = "5"; // Trader assigns Catching SO -> Open

export default function TraderApproveOVNScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId } = route.params || {};
  const { userToken, apiBaseUrl } = useContext(AuthContext);

  const [detail, setDetail] = useState(null);
  const [eligibleSOs, setEligibleSOs] = useState([]);
  const [selectedSO, setSelectedSO] = useState("");
  const [confirmChecked, setConfirmChecked] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: "Approve(OVN)" });
  }, [navigation]);

  const load = useCallback(async () => {
    try {
      setLoading(true);


      const d = await getOrderDetail(orderId);
      setDetail(d);

      const latestStatusId = String(d?.latestStatusId || "");
      if (latestStatusId !== STATUS_APPROVED) {
        // Same gating as Project: only show Approve(OVN) when status is Approved (11)
        Alert.alert("Not allowed", `This order is not in Approved state (11). Current: ${latestStatusId}`);
      }

      // We need recipientCountryId + recipientBUID to match Project's SO list query:
      // SOService.GetListSOByRecipientCountry(userId, order.RecipientCountryID, order.RecipientBUID)
      const recipientCountryId = String(d?.recipientCountryId || "");
      const recipientBuid = String(d?.recipientBUID || "");

      if (!recipientCountryId || !recipientBuid) {
        // Backend detail endpoint likely needs to add these fields.
        setEligibleSOs([]);
        return;
      }

      const options = await fetchEligibleCatchingSOs({
        recipientCountryId,
        recipientBuid,
      });

      setEligibleSOs(Array.isArray(options) ? options : []);
    } catch (err) {
      Alert.alert("Load failed", err?.message ? String(err.message) : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, userToken, orderId]);

  useEffect(() => {
    if (orderId) load();
  }, [orderId, load]);

  const canSubmit = useMemo(() => {
    const latestStatusId = String(detail?.latestStatusId || "");
    return latestStatusId === STATUS_APPROVED && !!selectedSO && confirmChecked && !submitting;
  }, [detail, selectedSO, confirmChecked, submitting]);

  const onSubmit = async () => {
    try {
      const latestStatusId = String(detail?.latestStatusId || "");
      if (latestStatusId !== STATUS_APPROVED) {
        Alert.alert("Not allowed", "Order must be Approved (11) to Approve(OVN).");
        return;
      }

      // GUI-side validation from Project:
      // - RecipientSOID required
      // - AcceptsTerms must be true
      if (!selectedSO) {
        Alert.alert("Validation", "Please select Receive SO (Catching SO).");
        return;
      }

      if (!confirmChecked) {
        Alert.alert("Validation", "Please check confirm checkbox before approving.");
        return;
      }

      setSubmitting(true);

      await approveByTraderOVN(orderId, { recipientSOID: selectedSO });

      Alert.alert("Success", `Approved(OVN). Status should become Open (${STATUS_OPEN}).`, [
        {
          text: "OK",
          onPress: () => {
            // Go back to trader dashboard and refresh by resetting
            navigation.reset({ index: 0, routes: [{ name: "TraderDashboard" }] });
          },
        },
      ]);
    } catch (err) {
      Alert.alert("Approve failed", err?.message ? String(err.message) : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleConfirm = () => setConfirmChecked((v) => !v);

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
        <Text>Order not found.</Text>
      </View>
    );
  }

  const latestStatusId = String(detail?.latestStatusId || "");

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={styles.title}>Approve(OVN)</Text>

      <View style={styles.card}>
        <Text style={styles.h2}>Order Summary</Text>
        <Row label="Order ID" value={detail?.orderId} />
        <Row label="Order Date" value={detail?.orderDate} />
        <Row label="Update Time" value={detail?.updateTime} />
        <Row label="Status" value={`${detail?.status} (ID ${latestStatusId})`} />
        <Row label="Amount" value={detail?.amount} />
        <Row label="Rate" value={detail?.rate} />
        <Row label="Purpose" value={detail?.purpose} />

        <View style={styles.divider} />

        <Text style={styles.h2}>Sender</Text>
        <Row label="Country" value={detail?.senderCountry} />
        <Row label="Company" value={detail?.senderCompany} />
        <Row label="Currency" value={detail?.senderCurrency} />

        <View style={styles.divider} />

        <Text style={styles.h2}>Receiver</Text>
        <Row label="Country" value={detail?.recipientCountry} />
        <Row label="Company" value={detail?.recipientCompany} />
        <Row label="Currency" value={detail?.recipientCurrency} />
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}><Text style={{ color: 'red', fontWeight: 'bold' }}>* </Text>Select Receive SO (Catching SO)</Text>

        {(!detail?.recipientCountryId || !detail?.recipientBUID) ? (
          <Text style={styles.warn}>
            Missing recipientCountryId/recipientBUID in order detail. Backend must return these fields to load eligible SO options.
          </Text>
        ) : eligibleSOs.length === 0 ? (
          <Text style={styles.warn}>No eligible SO options found.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {eligibleSOs.map((so) => {
              const id = String(so?.soId ?? "");
              const selected = id && id === selectedSO;
              //const RecipentName = so.companyName + '-' + so.countryName;
              return (
                <TouchableOpacity
                  key={id}
                  onPress={() => setSelectedSO(id)}
                  style={[styles.optionRow, selected && styles.optionRowSelected]}
                >
                  <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>
                    {so.companyName + '-' + so.countryName}
                  </Text>
                  {/*<Text style={[styles.optionSub, selected && styles.optionTitleSelected]}>
                    {so?.countryName || ""} {so?.currency ? `(${so.currency})` : ""}
                  </Text>*/}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 12 }} />

        <TouchableOpacity onPress={toggleConfirm} style={styles.checkboxRow}>
          <View style={[styles.checkbox, confirmChecked && styles.checkboxChecked]} />
          <Text style={styles.checkboxLabel}>Confirm to avoid mistaken approve</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onSubmit}
          disabled={submitting}
          style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
        >
          <Text style={styles.primaryBtnText}>{submitting ? "Approving..." : "Approve(OVN)"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => navigation.goBack()}>
          <Text style={[styles.btnText, styles.btnTextSecondary]}>Close</Text>
        </TouchableOpacity>

        {latestStatusId !== STATUS_APPROVED && (
          <Text style={styles.warn}>
            This action is only available when status is Approved (ID 11).
          </Text>
        )}
      </View>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NIGHT.bg, padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: {fontSize: 18, fontWeight: "900", marginBottom: 12 , color: NIGHT.text },

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

  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6, gap: 14 },
  rowLabel: { fontSize: 12, color: NIGHT.muted, width: 110 },
  rowValue: { fontSize: 12, color: NIGHT.text, flex: 1, textAlign: "right" },

  divider: { height: 1, backgroundColor: NIGHT.border, marginVertical: 12 },

  optionRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: NIGHT.border,
    padding: 12,
    backgroundColor: NIGHT.card,
  },
  optionRowSelected: { borderColor: NIGHT.primary, backgroundColor: NIGHT.card2 },
  optionTitle: { fontSize: 13, fontWeight: "800", color: NIGHT.text },
  optionTitleSelected: { color: "#C9A24D" },
  optionSub: { fontSize: 12, color: NIGHT.muted, marginTop: 4 },

  checkboxRow: { flexDirection: "row", alignItems: "center", marginTop: 8, marginBottom: 14 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: NIGHT.primary,
    marginRight: 10,
    backgroundColor: NIGHT.card,
  },
  checkboxChecked: { backgroundColor: NIGHT.primary },
  checkboxLabel: { fontSize: 12, color: NIGHT.text },

  primaryBtn: {
    marginTop: 8,
    backgroundColor: NIGHT.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnDisabled: { backgroundColor: "#C9A24D" },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "900" },

  warn: { marginTop: 10, fontSize: 12, color: "#C9A24D" },

   btn: {
    flex: 1,
    backgroundColor: NIGHT.primaryDark,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  btnSecondary: { backgroundColor: NIGHT.card2 },
  btnText: { color: "#FFFFFF", fontWeight: "800" }, 
});