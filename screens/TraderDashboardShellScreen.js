import { useCallback, useState } from "react";
import { Platform, useWindowDimensions } from "react-native";
import OrderPreviewPanel from "../components/OrderPreviewPanel";
import ResponsiveShell from "../components/ResponsiveShell";
import TraderDashboardScreen from "./TraderDashboardScreen";

export default function TraderDashboardShellScreen(props) {
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const { width } = useWindowDimensions();

  const isPad = Platform.OS === "ios" && Platform.isPad;
  const isTablet = isPad || width >= 768;

  const onSelectOrder = useCallback((orderId) => {
    setSelectedOrderId(orderId ? String(orderId) : null);
  }, []);

  return (
    <ResponsiveShell
      // IMPORTANT: Detail preview panel is tablet-only. On phones it must be hidden.
      detail={
        isTablet ? (
          <OrderPreviewPanel orderId={selectedOrderId} onClear={() => setSelectedOrderId(null)} />
        ) : null
      }
      showDetailPlaceholder={isTablet}
    >
      <TraderDashboardScreen {...props} onSelectOrder={onSelectOrder} selectedOrderId={selectedOrderId} />
    </ResponsiveShell>
  );
}
