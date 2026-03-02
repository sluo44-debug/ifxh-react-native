import { useNavigation } from "@react-navigation/native";
import { useContext, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import { login as apiLogin } from "../src/api/auth";

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

export default function LoginScreen() {
  const navigation = useNavigation();
  const { signIn, apiBaseUrl } = useContext(AuthContext);

  const { width } = useWindowDimensions();
  // Keep login form comfortably narrow on iPad (and slightly narrower on iPhone).
  const formWidth = Math.min(Math.max(width * 0.9, 320), 560);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onLogin = async () => {
    if (!email || !password) {
      Alert.alert("Validation", "Please enter email and password.");
      return;
    }

    setSubmitting(true);
    try {
      const user = await apiLogin({ email, password });

      const token = user?.token;
      const role = user?.role;
      const emailResp = user?.email || email;

      if (!token) throw new Error("Missing token in login response.");

      // update auth context (AuthContext keeps API client token in sync)
      signIn({ email: emailResp, token, role });

      const upperRole = String(role || "").toUpperCase();
      const next = upperRole.includes("TRADER")
        ? "TraderDashboard"
        : upperRole.includes("SO")
        ? "SODashboard"
        : "Dashboard";

      navigation.reset({ index: 0, routes: [{ name: next }] });
    } catch (err) {
      Alert.alert("Login failed", err?.message ? String(err.message) : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.form, { width: formWidth }]}>
        <Image
          source={require("../assets/branding/credora-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>IFXH Mobile</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholderTextColor={NIGHT.muted}
          placeholder="you@example.com"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholderTextColor={NIGHT.muted}
          placeholder="••••••••"
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={onLogin} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>API: {apiBaseUrl}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Login screen only: match the brand logo's dark background.
  container: { flex: 1, backgroundColor: NIGHT.bg, padding: 24, justifyContent: "center" },
  form: {
    alignSelf: "center",
  },
  logo: { width: 160, height: 160, alignSelf: "center", marginBottom: 10 },
  title: { fontSize: 26, fontWeight: "900", marginBottom: 20, textAlign: "center", color: NIGHT.text },
  label: { fontSize: 12, color: NIGHT.text, marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: NIGHT.border,
    backgroundColor: NIGHT.card2,
    color: NIGHT.text,

    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  button: {
    marginTop: 18,
    backgroundColor: NIGHT.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { color: "#FFFFFF", fontWeight: "900" },
  hint: { marginTop: 14, fontSize: 12, color: NIGHT.muted, textAlign: "center" },
});
