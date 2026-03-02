import React, { useState, useCallback } from "react";
import { Platform, useWindowDimensions } from "react-native";
import SODashboardScreen from "./SODashboardScreen";
import ResponsiveShell from "../components/ResponsiveShell";
import OrderPreviewPanel from "../components/OrderPreviewPanel";

export default function SODashboardShellScreen(props) {
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedSoRole, setSelectedSoRole] = useState(null);
  const { width } = useWindowDimensions();

  const isPad = Platform.OS === "ios" && Platform.isPad;
  const isTablet = isPad || width >= 768;
  const onSelectOrder = useCallback((orderId, soRole) => {
    setSelectedOrderId(orderId ? String(orderId) : null);
    setSelectedSoRole(soRole || null);
  }, []);

  return (
    <ResponsiveShell
      // IMPORTANT: Detail preview panel is tablet-only. On phones it must be hidden.
      detail={
        isTablet ? (
          <OrderPreviewPanel
            orderId={selectedOrderId}
            soRole={selectedSoRole}
            onClear={() => {
              setSelectedOrderId(null);
              setSelectedSoRole(null);
            }}
          />
        ) : null
      }
      showDetailPlaceholder={isTablet}
    >
      <SODashboardScreen {...props} onSelectOrder={onSelectOrder} selectedOrderId={selectedOrderId} />
    </ResponsiveShell>
  );
}
