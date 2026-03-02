import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Image, NativeScrollEvent, NativeSyntheticEvent, useWindowDimensions, View } from "react-native";

type BannerItem = { id: string; source: any };

type Props = {
  autoplayMs?: number;
  /** If true, use full screen width (no horizontal padding) */
  fullBleed?: boolean;
  /** Horizontal padding to subtract from screen width when not fullBleed (default 16) */
  horizontalPadding?: number;
  /** Corner radius of the banner container */
  borderRadius?: number;
};

export default function MarketingBannerCarousel({
  autoplayMs = 10000,
  fullBleed = false,
  horizontalPadding = 16,
  borderRadius,
}: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const listRef = useRef<FlatList<BannerItem>>(null);
  const timerRef = useRef<any>(null);

  const banners: BannerItem[] = useMemo(
    () => [
      { id: "new_user_rewards", source: require("../../assets/banners/banner_new_user_rewards.png") },
      { id: "lower_fees", source: require("../../assets/banners/banner_lower_fees.png") },
      { id: "vip_membership", source: require("../../assets/banners/banner_vip_membership.png") },
      { id: "invite_friends", source: require("../../assets/banners/banner_invite_friends.png") },
    ],
    []
  );

  const [index, setIndex] = useState(0);

  const containerWidth = Math.max(1, Math.round(screenWidth - (fullBleed ? 0 : horizontalPadding * 2)));
  const height = Math.max(120, Math.round(containerWidth / 3));

  const radius = borderRadius ?? (fullBleed ? 0 : 16);

  const scrollToIndex = (nextIndex: number, animated = true) => {
    listRef.current?.scrollToOffset({ offset: nextIndex * containerWidth, animated });
  };

  // Autoplay
  useEffect(() => {
    if (!autoplayMs || banners.length <= 1) return;

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % banners.length;
        // scroll first, then update state
        scrollToIndex(next, true);
        return next;
      });
    }, autoplayMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoplayMs, banners.length, containerWidth]);

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(x / containerWidth);
    setIndex(newIndex);
  };

  return (
    <View style={{ width: containerWidth, height, borderRadius: radius, overflow: "hidden", backgroundColor: "rgba(0,0,0,0)" }}>
      <FlatList
        ref={listRef}
        removeClippedSubviews={false}
        nestedScrollEnabled
        style={{ height }}
        data={banners}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, i) => ({ length: containerWidth, offset: containerWidth * i, index: i })}
        renderItem={({ item }) => (
          <Image source={item.source} style={{ width: containerWidth, height }} resizeMode="contain" />
        )}
      />

      {/* Pagination dots */}
      <View
        style={{
          position: "absolute",
          bottom: 10,
          left: 0,
          right: 0,
          flexDirection: "row",
          justifyContent: "center",
          gap: 6,
        }}
      >
        {banners.map((b, i) => (
          <View
            key={b.id}
            style={{
              width: i === index ? 16 : 6,
              height: 6,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.9)",
              opacity: i === index ? 0.95 : 0.35,
            }}
          />
        ))}
      </View>
    </View>
  );
}
