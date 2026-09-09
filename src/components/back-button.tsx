import { router } from "expo-router";
import { Pressable, useColorScheme } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { Colors } from "@/constants/theme";

export function BackButton() {
  const scheme = useColorScheme();
  const c = Colors[scheme === "dark" ? "dark" : "light"];

  return (
    <Pressable
      onPress={() => {
        if (router.canGoBack()) router.back();
      }}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={8}
      style={{ minHeight: 48, minWidth: 48, alignItems: "center", justifyContent: "center" }}
      className="rounded-full active:opacity-70"
    >
      <MaterialCommunityIcons name="chevron-left" size={30} color={c.text} />
    </Pressable>
  );
}
