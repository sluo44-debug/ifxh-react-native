import { DarkTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "react-native";

import BUConfirmReceiveScreen from "./screens/BUConfirmReceiveScreen";
import BUConfirmSentScreen from "./screens/BUConfirmSentScreen";
import CreateOrderScreen from "./screens/CreateOrderScreen";
import DashboardShellScreen from "./screens/DashboardShellScreen";
import LoginScreen from "./screens/LoginScreen";
import OrderDetailScreen from "./screens/OrderDetailScreen";
import SOConfirmReceiveScreen from "./screens/SOConfirmReceiveScreen";
import SOConfirmSentScreen from "./screens/SOConfirmSentScreen";

// SO workflow screens
import SOApproveOrderScreen from "./screens/SOApproveOrderScreen";
import SODashboardShellScreen from "./screens/SODashboardShellScreen";
import SOPairOrderScreen from "./screens/SOPairOrderScreen";

// Trader workflow screens
import TraderApproveOVNScreen from "./screens/TraderApproveOVNScreen";
import TraderConfirmSentScreen from "./screens/TraderConfirmSentScreen";
import TraderDashboardShellScreen from "./screens/TraderDashboardShellScreen";

// Account
import AccountScreen from "./screens/AccountScreen";
import AccountTransactionsScreen from "./screens/AccountTransactionsScreen";

import { AuthProvider } from "./context/AuthContext";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer theme={DarkTheme}>
        <StatusBar barStyle="light-content" />
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerStyle: { backgroundColor: "#1A1F2B" },
            headerTintColor: "#FFFFFF",
            headerTitleStyle: { fontWeight: "800", color: "#FFFFFF" },
            contentStyle: { backgroundColor: "#0B1320" },
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />

          {/* BU default dashboard */}
          <Stack.Screen name="Dashboard" component={DashboardShellScreen} />

          {/* SO workflow */}
          <Stack.Screen name="SODashboard" component={SODashboardShellScreen} options={{ title: "SO Dashboard" }} />
          <Stack.Screen name="SOApproveOrder" component={SOApproveOrderScreen} options={{ title: "Approve Order" }} />
          <Stack.Screen name="SOPairOrder" component={SOPairOrderScreen} options={{ title: "Pair Order" }} />

          {/* Trader workflow */}
          <Stack.Screen
            name="TraderDashboard"
            component={TraderDashboardShellScreen}
            options={{ title: "Trader Queue" }}
          />
          <Stack.Screen name="TraderApproveOVN" component={TraderApproveOVNScreen} options={{ title: "Approve(OVN)" }} />
          <Stack.Screen
            name="TraderConfirmSent"
            component={TraderConfirmSentScreen}
            options={{ title: "Confirm Sent" }}
          />

          {/* Shared */}
          <Stack.Screen name="CreateOrder" component={CreateOrderScreen} options={{ title: "Create Order" }} />
          <Stack.Screen name="Account" component={AccountScreen} options={{ title: "My Account" }} />
          <Stack.Screen
            name="AccountTransactions"
            component={AccountTransactionsScreen}
            options={{ title: "Account Transactions" }}
          />
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: "View Order" }} />
          <Stack.Screen name="BUConfirmSent" component={BUConfirmSentScreen} options={{ title: "Confirm Sent" }} />
          <Stack.Screen name="BUConfirmReceive" component={BUConfirmReceiveScreen} options={{ title: "Confirm Receive" }} />
          <Stack.Screen name="SOConfirmReceive" component={SOConfirmReceiveScreen} options={{ title: "Confirm Receive" }} />
          <Stack.Screen name="SOConfirmSent" component={SOConfirmSentScreen} options={{ title: "Confirm Sent" }} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}
