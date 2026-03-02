import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import { AuthContext } from "../context/AuthContext";
import { getAccountBalances } from "../src/api/account";

const NIGHT = {
  bg: "#0B1320",
  card: "#1A1F2B",
  text: "#FFFFFF",
  muted: "#BFC6CF",
  border: "#2A3142",
  primary: "#C9A24D",
};

const CURRENCY_ICONS = {
  AED: require("../assets/images/Currency_AED.png"),
  AUD: require("../assets/images/Currency_AUD.png"),
  BGN: require("../assets/images/Currency_BGN.png"),
  BHD: require("../assets/images/Currency_BHD.png"),
  CAD: require("../assets/images/Currency_CAD.png"),
  CHF: require("../assets/images/Currency_CHF.png"),
  CNY: require("../assets/images/Currency_CNY.png"),
  CZK: require("../assets/images/Currency_CZK.png"),
  DKK: require("../assets/images/Currency_DKK.png"),
  EUR: require("../assets/images/Currency_EUR.png"),
  GBP: require("../assets/images/Currency_GBP.png"),
  HKD: require("../assets/images/Currency_HKD.png"),
  HUF: require("../assets/images/Currency_HUF.png"),
  IDR: require("../assets/images/Currency_IDR.png"),
  ILS: require("../assets/images/Currency_ILS.png"),
  INR: require("../assets/images/Currency_INR.png"),
  JPY: require("../assets/images/Currency_JPY.png"),
  KES: require("../assets/images/Currency_KES.png"),
  KWD: require("../assets/images/Currency_KWD.png"),
  MXN: require("../assets/images/Currency_MXN.png"),
  MYR: require("../assets/images/Currency_MYR.png"),
  NOK: require("../assets/images/Currency_NOK.png"),
  NZD: require("../assets/images/Currency_NZD.png"),
  OMR: require("../assets/images/Currency_OMR.png"),
  PHP: require("../assets/images/Currency_PHP.png"),
  PLN: require("../assets/images/Currency_PLN.png"),
  QAR: require("../assets/images/Currency_QAR.png"),
  RON: require("../assets/images/Currency_RON.png"),
  RUB: require("../assets/images/Currency_RUB.png"),
  SAR: require("../assets/images/Currency_SAR.png"),
  SEK: require("../assets/images/Currency_SEK.png"),
  SGD: require("../assets/images/Currency_SGD.png"),
  THB: require("../assets/images/Currency_THB.png"),
  UGX: require("../assets/images/Currency_UGX.png"),
  USD: require("../assets/images/Currency_USD.png"),
  ZAR: require("../assets/images/Currency_ZAR.png"),
};

function getCurrencyIcon(code) {
  const cur = String(code || "").toUpperCase();
  return CURRENCY_ICONS[cur] || CURRENCY_ICONS.USD;
}

function formatAmount(amountStr) {
  if (amountStr === null || amountStr === undefined) return "0.00";
  const n = Number(amountStr);
  if (!Number.isFinite(n)) return String(amountStr);
  return n.toFixed(2);
}

export default function AccountScreen() {
  const navigation = useNavigation();
  const { token, apiBaseUrl } = useContext(AuthContext);

  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const canLoad = useMemo(() => Boolean(token && apiBaseUrl), [token, apiBaseUrl]);

  const loadBalances = useCallback(async () => {
    if (!canLoad) return;

    try {
      setErrorMsg("");


      const data = await getAccountBalances();
      setBalances(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMsg(err?.message ? String(err.message) : "Failed to load");
      setBalances([]);
    }
  }, [canLoad, apiBaseUrl, token]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await loadBalances();
      } finally {
        setLoading(false);
      }
    })();
  }, [loadBalances]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadBalances();
    } finally {
      setRefreshing(false);
    }
  }, [loadBalances]);

  const renderItem = useCallback(
    ({ item }) => {
      const currency = String(item?.currency || "").toUpperCase();
      const amount = formatAmount(item?.amount);
      const currencyName = String(item?.currencyName || "");

      return (
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.left}>
              <Image source={getCurrencyIcon(currency)} style={styles.icon} resizeMode="contain" />
              <View style={styles.textBlock}>
                <Text style={styles.amountText}>
                  {amount} <Text style={styles.amountCur}>{currency}</Text>
                </Text>
                <Text style={styles.nameText} numberOfLines={1}>
                  {currencyName}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => navigation.navigate("AccountTransactions", { currency })}
              style={({ pressed }) => [styles.viewBtn, pressed && styles.viewBtnPressed]}
              accessibilityRole="button"
            >
              <Text style={styles.viewBtnText}>View</Text>
            </Pressable>
          </View>
        </View>
      );
    },
    [navigation]
  );

  const keyExtractor = useCallback((item, idx) => String(item?.currency || idx), []);

  const content = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.mutedText}>Loading...</Text>
        </View>
      );
    }

    if (!canLoad) {
      return (
        <View style={styles.center}>
          <Text style={styles.mutedText}>Not signed in.</Text>
        </View>
      );
    }

    if (errorMsg) {
      return (
        <View style={styles.center}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <Pressable onPress={loadBalances} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      );
    }

    if (!balances || balances.length === 0) {
      return (
        <View style={styles.center}>
          <Text style={styles.mutedText}>No data</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={balances}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={NIGHT.muted} />}
      />
    );
  }, [balances, canLoad, errorMsg, keyExtractor, loadBalances, loading, onRefresh, refreshing, renderItem]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Account</Text>
        <Text style={styles.subtitle}>Manage and fund multi-currency wallet</Text>
      </View>

      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NIGHT.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  title: {
    color: NIGHT.text,
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    color: NIGHT.muted,
    fontSize: 13,
    marginTop: 6,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: NIGHT.card,
    borderColor: NIGHT.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 12,
  },
  icon: {
    width: 38,
    height: 38,
    marginRight: 12,
  },
  textBlock: {
    flex: 1,
  },
  amountText: {
    color: NIGHT.text,
    fontSize: 16,
    fontWeight: "800",
  },
  amountCur: {
    color: NIGHT.text,
    fontWeight: "900",
  },
  nameText: {
    color: NIGHT.muted,
    fontSize: 12,
    marginTop: 4,
  },
  viewBtn: {
    backgroundColor: "#D7DCE2",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  viewBtnPressed: {
    opacity: 0.85,
  },
  viewBtnText: {
    color: "#1A1F2B",
    fontWeight: "800",
    fontSize: 13,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  mutedText: {
    color: NIGHT.muted,
    marginTop: 10,
  },
  errorText: {
    color: "#ef4444",
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 12,
    borderColor: NIGHT.border,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: NIGHT.text,
    fontWeight: "800",
  },
});
