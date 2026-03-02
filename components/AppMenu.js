import React, { useState } from "react";
import { Modal, View, Pressable, StyleSheet, Text } from "react-native";
import MenuContent from "./MenuContent";

export default function AppMenu() {
  const [visible, setVisible] = useState(false);
  const close = () => setVisible(false);

  return (
    <>
      <View style={styles.menuOuter}>
        {/*
          Mask layer to hide any platform/browser-drawn inner ring (iOS Chrome / RN-web)
          so the user only sees ONE border (the outer border on menuOuter).
        */}
        <View pointerEvents="none" style={styles.innerMask} />
        <Pressable
          onPress={() => setVisible(true)}
          style={styles.menuInner}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
        >
          <Text style={styles.menuIconText}>☰</Text>
        </Pressable>
      </View>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close} />

        <View style={styles.drawerWrap} pointerEvents="box-none">
          <View style={styles.drawer}>
            <MenuContent onDone={close} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  drawerWrap: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "flex-start",
  },
  drawer: {
    width: 280,
    height: "100%",
  },
  // IMPORTANT: To avoid the "double border" effect in iOS Chrome / RN-web,
  // we draw the border on a non-focusable outer View, and keep the Pressable
  // itself borderless. Then we also disable any focus outline/shadow.
  menuOuter: {
    position: "relative",
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#2A3142",
    backgroundColor: "#1A1F2B",
    overflow: "hidden",
  },
  innerMask: {
    position: "absolute",
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: 999,
    backgroundColor: "#1A1F2B",
    // Ensure the mask doesn't introduce its own lines
    borderWidth: 0,
  },
  menuInner: {
    zIndex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 0,
    // Web focus ring / default button chrome
    outlineWidth: 0,
    outlineStyle: "none",
    boxShadow: "none",
    shadowOpacity: 0,
    shadowColor: "transparent",
    elevation: 0,
    // RN-web supports these style keys; harmless on native.
    WebkitAppearance: "none",
    appearance: "none",
    WebkitTapHighlightColor: "transparent",
  },
  menuIconText: {
    color: "#C9A24D",
    fontSize: 18,
    fontWeight: "900",
  },
});
