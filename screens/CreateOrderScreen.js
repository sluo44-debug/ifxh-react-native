import { useNavigation } from "@react-navigation/native";
import { useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AppMenu from "../components/AppMenu";
import { AuthContext } from "../context/AuthContext";
import { fetchRecipientDetails } from "../src/api/bu";
import { createOrder } from "../src/api/orders";

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

function formatTodayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatNowYYYYMMDD_HHMMSS() {
  const d = new Date();

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

export default function CreateOrderScreen() {
  const navigation = useNavigation();
  const { token, apiBaseUrl, signOut, role } = useContext(AuthContext);

  const [orderDate] = useState(formatTodayYYYYMMDD());

  const [loading, setLoading] = useState(true);
  const [recipients, setRecipients] = useState([]);
  const [receiverModalOpen, setReceiverModalOpen] = useState(false);

  const [selected, setSelected] = useState(null);

  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);

  //const base = useMemo(() => (apiBaseUrl).replace(/\/$/, ""), [apiBaseUrl]);

  // Only BU should create orders (optional safeguard)
  const isBU = useMemo(() => String(role || "").toUpperCase().includes("BU"), [role]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Create Order",
      headerLeft: () => <AppMenu />,
      headerRight: () => (
        <TouchableOpacity
          onPress={async () => {
            await signOut();
            navigation.reset({ index: 0, routes: [{ name: "Login" }] });
          }}
          style={styles.logoutBtn}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, signOut]);

  const receiverDisplay = useMemo(() => {
    if (!selected) return "-- Select Receiver --";
    // Same as web: Country - Company
    const country = selected.recipientCountry || "";
    const company = selected.recipientCompany || "";
    return `${country} - ${company}`.trim();
  }, [selected]);

  const senderCurrency = useMemo(() => {
    const v = selected?.senderCurrency || "";
    return v.substring(0, 3);
  }, [selected]);

  const recipientCurrency = useMemo(() => {
    const v = selected?.recipientCurrency || "";
    return v.substring(0, 3);
  }, [selected]);

  const computedRate = useMemo(() => {
    // API should return computedRate already.
    // If not, show blank.
    return selected?.computedRate || "";
  }, [selected]);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setLoading(false);
        Alert.alert("Not logged in", "Token is missing. Please login again.");
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      try {
        setLoading(true);

        const data = await fetchRecipientDetails();
        setRecipients(Array.isArray(data) ? data : []);
      } catch (e) {
        Alert.alert("Error", e?.message ? String(e.message) : "Cannot load Receiver list.");
        setRecipients([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token, navigation]);

const submit = async () => {
  if (!isBU) {
    Alert.alert("Not allowed", "Only BU users can create orders.");
    return;
  }

  if (!selected?.recipientBUID) {
    Alert.alert("Missing Receiver", "Please select a Receiver.");
    return;
  }

  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    Alert.alert("Invalid Amount", "Please enter a valid amount greater than 0.");
    return;
  }

  try {
    setSubmitting(true);

    const payload = {
      recipientBUID: selected.recipientBUID,
      amount: String(amt),
      senderCurrency: senderCurrency || "",
      receiverCurrency: recipientCurrency || "",
      orderDate: formatNowYYYYMMDD_HHMMSS,
      purpose: purpose || "",
    };

    const created = await createOrder(payload);

    // Try to find order id from response (depends on your backend)
    const orderId =
      created?.orderId ??
      created?.id ??
      created?.orderID ??
      created?.OrderId ??
      null;

    Alert.alert(
      "Order Created",
      orderId ? `Order ID: ${orderId}` : "Order created successfully.",
      [{ text: "OK", onPress: () => navigation.replace("Dashboard") }]
    );
  } catch (e) {
    Alert.alert("Error", e?.message ? String(e.message) : "Order submit failed.");
  } finally {
    setSubmitting(false);
  }
};


  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 28 }}>
      <Text style={styles.title}>Create Order</Text>

      {/* Date (disabled like web) */}
      <View style={styles.row}>
        <Text style={styles.label}>Date:</Text>
        <TextInput value={orderDate} editable={false} style={[styles.input, styles.inputDisabled]} />
      </View>

      <Text style={styles.subLabel}>Order Type: Day Order</Text>

      {/* Receiver dropdown */}
      <View style={[styles.row, { marginTop: 12 }]}>
        <Text style={styles.label}>Receiver:</Text>
        <TouchableOpacity style={styles.select} onPress={() => setReceiverModalOpen(true)}>
          <Text style={styles.selectText}>{receiverDisplay}</Text>
          <Text style={styles.selectArrow}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* Amount */}
      <View style={styles.row}>
        <Text style={styles.label}>
          Amount{senderCurrency ? `: ${senderCurrency}` : ":"}
        </Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="Enter amount"
          placeholderTextColor={NIGHT.muted}
          keyboardType="numeric"
          style={styles.input}
        />
      </View>

      {/* Rate (disabled like web) */}
      <View style={styles.row}>
        <Text style={styles.label}>
          Rate{senderCurrency && recipientCurrency ? `: ${senderCurrency} : ${recipientCurrency}` : ":"}
        </Text>
        <TextInput value={computedRate} editable={false} style={[styles.input, styles.inputDisabled]} />
      </View>

      {/* Purpose */}
      <View style={[styles.row, { alignItems: "flex-start" }]}>
        <Text style={[styles.label, { paddingTop: 10 }]}>Purpose:</Text>
        <TextInput
          value={purpose}
          onChangeText={setPurpose}
          placeholder="(Optional) Purpose"
          placeholderTextColor={NIGHT.muted}
          multiline
          numberOfLines={3}
          maxLength={250}
          style={[styles.input, { height: 90, textAlignVertical: "top" }]}
        />
      </View>

      {/* Buttons */}
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.btnPrimary, submitting && { opacity: 0.7 }]}
          onPress={submit}
          disabled={submitting}
        >
          <Text style={styles.btnPrimaryText}>{submitting ? "Saving…" : "Save"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.goBack()} disabled={submitting}>
          <Text style={styles.btnSecondaryText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Receiver Picker Modal */}
      <Modal visible={receiverModalOpen} transparent animationType="fade" onRequestClose={() => setReceiverModalOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setReceiverModalOpen(false)} />
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Select Receiver</Text>

          {loading ? (
            <View style={{ paddingVertical: 18, alignItems: "center" }}>
              <ActivityIndicator />
              <Text style={{ marginTop: 10, opacity: 0.85, color: NIGHT.muted }}>Loading…</Text>
            </View>
          ) : recipients.length === 0 ? (
            <Text style={{ opacity: 0.9, color: NIGHT.muted }}>No receivers available.</Text>
          ) : (
            <FlatList
              data={recipients}
              keyExtractor={(item) => String(item.recipientBUID)}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              renderItem={({ item }) => {
                const isSel = item.recipientBUID === selected?.recipientBUID;
                const sc = (item.senderCurrency || "").substring(0, 3);
                const rc = (item.recipientCurrency || "").substring(0, 3);

                return (
                  <TouchableOpacity
                    onPress={() => {
                      setSelected(item);
                      setReceiverModalOpen(false);
                    }}
                    style={[styles.receiverItem, isSel && styles.receiverItemSelected]}
                  >
                    <Text style={[styles.receiverItemTitle, isSel && { color: NIGHT.primary }]}>
                      {(item.recipientCountry || "")} - {(item.recipientCompany || "")}
                    </Text>
                    <Text style={styles.receiverItemSub}>
                      Rate: {item.computedRate || "—"} ({sc} : {rc})
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          <TouchableOpacity style={styles.modalClose} onPress={() => setReceiverModalOpen(false)}>
            <Text style={{ fontWeight: "900", color: NIGHT.text }}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NIGHT.bg, paddingHorizontal: 16, paddingTop: 14 },
  title: { fontSize: 28, fontWeight: "900", marginBottom: 10, color: NIGHT.text },

  row: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 12 },
  label: { width: 90, fontWeight: "800", color: NIGHT.text },
  subLabel: { fontWeight: "700", color: NIGHT.muted, marginTop: 6 },

  input: {
    flex: 1,
    backgroundColor: NIGHT.card,
    borderWidth: 1,
    borderColor: NIGHT.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: NIGHT.text,
  },
  inputDisabled: { backgroundColor: NIGHT.card2, color: NIGHT.text, opacity: 0.95 },

  select: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: NIGHT.card,
    borderWidth: 1,
    borderColor: NIGHT.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectText: { fontWeight: "800", color: NIGHT.text },
  selectArrow: { color: NIGHT.muted, fontWeight: "900" },

  btnRow: { flexDirection: "row", gap: 12, marginTop: 18 },
  btnPrimary: { flex: 1, backgroundColor: NIGHT.primaryDark, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  btnPrimaryText: { color: "#FFFFFF", fontWeight: "900" },
  btnSecondary: { flex: 1, backgroundColor: "#BFC6CF", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  btnSecondaryText: { color: "#FFFFFF", fontWeight: "900" },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  modalCard: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 120,
    bottom: 120,
    backgroundColor: NIGHT.card,
    borderRadius: 16,
    padding: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: "900", marginBottom: 12, color: NIGHT.text },
  modalClose: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: NIGHT.card2,
  },

  receiverItem: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: NIGHT.border,
    backgroundColor: NIGHT.card,
  },
  receiverItemSelected: {
    borderColor: "#C9A24D",
    backgroundColor: "#1A1F2B",
  },
  receiverItemTitle: { fontWeight: "900", color: NIGHT.text },
  receiverItemSub: { marginTop: 6, color: NIGHT.muted, fontWeight: "700" },

  logoutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#1A1F2B",
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#2A3142",
    overflow: "hidden",
    marginRight: 8,
  },
  logoutText: { fontWeight: "800", color: NIGHT.text },
});
