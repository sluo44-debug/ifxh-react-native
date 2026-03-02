import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import { AuthContext } from "../context/AuthContext";
import { getAccountTransactions } from "../src/api/account";

const NIGHT = {
  bg: "#0B1320",
  card: "#1A1F2B",
  text: "#FFFFFF",
  muted: "#BFC6CF",
  border: "#2A3142",
  danger: "#ef4444",
};

function safeStr(v) {
  return v === null || v === undefined ? "" : String(v);
}

function formatAmount(amountStr) {
  if (amountStr === null || amountStr === undefined) return "0.00";
  const n = Number(amountStr);
  if (!Number.isFinite(n)) return String(amountStr);
  return n.toFixed(2);
}

export default function AccountTransactionsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { token, apiBaseUrl } = useContext(AuthContext);

  const currency = useMemo(() => {
    const cur = route?.params?.currency;
    return safeStr(cur).trim().toUpperCase();
  }, [route?.params?.currency]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const canLoad = useMemo(() => Boolean(token && apiBaseUrl && currency), [token, apiBaseUrl, currency]);

  const load = useCallback(async () => {
    if (!canLoad) return;

    try {
      setErrorMsg("");


      const data = await getAccountTransactions(currency);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMsg(err?.message ? String(err.message) : "Failed to load");
      setRows([]);
    }
  }, [canLoad, apiBaseUrl, token, currency]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await load();
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const Header = useMemo(() => {
    return (
      <View style={styles.header}>
        <Text style={styles.title}>My {currency} Account Transactions</Text>
        <Text style={styles.subtitle}>Completed transactions ({currency})</Text>
      </View>
    );
  }, [currency]);

  const TableHeader = useMemo(() => {
    return (
      <View style={[styles.tableRow, styles.tableHeaderRow]}>
        <Text style={[styles.cell, styles.hCell, styles.colCreated]}>CREATED</Text>
        <Text style={[styles.cell, styles.hCell, styles.colCompleted]}>COMPLETED</Text>
        <Text style={[styles.cell, styles.hCell, styles.colType]}>TYPE</Text>
        <Text style={[styles.cell, styles.hCell, styles.colAmount]}>AMOUNT</Text>
        <Text style={[styles.cell, styles.hCell, styles.colBalance]}>BALANCE</Text>
      </View>
    );
  }, []);

  const renderItem = useCallback(({ item }) => {
    const createdAt = safeStr(item?.createdAt);
    const completedAt = safeStr(item?.completedAt);
    const action = safeStr(item?.action);
    const amount = formatAmount(item?.amount);
    const balanceAmount = formatAmount(item?.balanceAmount);

    return (
      <View style={styles.tableRow}>
        <Text style={[styles.cell, styles.colCreated]} numberOfLines={2}>
          {createdAt}
        </Text>
        <Text style={[styles.cell, styles.colCompleted]} numberOfLines={2}>
          {completedAt}
        </Text>
        <Text style={[styles.cell, styles.colType]} numberOfLines={1}>
          {action}
        </Text>
        <Text style={[styles.cell, styles.colAmount]} numberOfLines={1}>
          {amount}
        </Text>
        <Text style={[styles.cell, styles.colBalance]} numberOfLines={1}>
          {balanceAmount}
        </Text>
      </View>
    );
  }, []);

  const keyExtractor = useCallback((item, idx) => {
    const c = safeStr(item?.createdAt);
    const a = safeStr(item?.amount);
    return `${c}-${a}-${idx}`;
  }, []);

  const Body = useMemo(() => {
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
          <Pressable onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      );
    }

    if (!rows || rows.length === 0) {
      return (
        <View style={styles.center}>
          <Text style={styles.mutedText}>No data</Text>
        </View>
      );
    }

    // Horizontal scroll for table layout on smaller screens
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tableWrap}>
        <View style={styles.tableCard}>
          {TableHeader}
          <FlatList
            data={rows}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={NIGHT.muted} />}
          />
        </View>
      </ScrollView>
    );
  }, [TableHeader, canLoad, errorMsg, keyExtractor, load, loading, onRefresh, refreshing, renderItem, rows]);

  return (
    <View style={styles.container}>
      {Header}

      {Body}

      <View style={styles.footer}>
        <Pressable
          onPress={() => {
            // IMPORTANT: do NOT navigation.navigate("Account") here.
            // That pushes a new Account screen on top of AccountTransactions,
            // causing the header back label to become "Account Transactions".
            // We want the stack to return to the previous screen (Account),
            // so the header back label becomes "Dashboard".
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              // Fallback (should be rare): if there's no history, go to dashboard.
              navigation.navigate("Dashboard");
            }
          }}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
        >
          <Text style={styles.backBtnText}>Back to Account</Text>
        </Pressable>
      </View>
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
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    color: NIGHT.muted,
    fontSize: 13,
    marginTop: 6,
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
    color: NIGHT.danger,
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
  tableWrap: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  tableCard: {
    backgroundColor: NIGHT.card,
    borderColor: NIGHT.border,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    minWidth: 760,
  },
  tableHeaderRow: {
    backgroundColor: "#2A3142",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomColor: NIGHT.border,
    borderBottomWidth: 1,
  },
  cell: {
    color: NIGHT.text,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 12,
  },
  hCell: {
    color: NIGHT.muted,
    fontWeight: "900",
    fontSize: 11,
  },
  colCreated: {
    width: 170,
  },
  colCompleted: {
    width: 170,
  },
  colType: {
    width: 140,
  },
  colAmount: {
    width: 120,
    textAlign: "right",
  },
  colBalance: {
    width: 120,
    textAlign: "right",
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    alignSelf: "flex-start",
    borderColor: NIGHT.border,
    borderWidth: 1,
    backgroundColor: "#2A3142",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backBtnPressed: {
    opacity: 0.85,
  },
  backBtnText: {
    color: NIGHT.text,
    fontWeight: "800",
    fontSize: 13,
  },
});
