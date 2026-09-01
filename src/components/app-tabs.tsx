import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";
import { useThemeStore } from "@/store/theme";

export default function AppTabs() {
  const systemScheme = useColorScheme();
  const preference = useThemeStore((s) => s.preference);
  const scheme = preference === "system" ? systemScheme : preference;
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" src={require("@/assets/images/tabIcons/home.png")} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="scholars">
        <NativeTabs.Trigger.Label>Scholars</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.2.fill" src={require("@/assets/images/tabIcons/scholars.png")} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="search">
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" src={require("@/assets/images/tabIcons/search.png")} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="downloads">
        <NativeTabs.Trigger.Label>Downloads</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="arrow.down.circle.fill" src={require("@/assets/images/tabIcons/downloads.png")} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape.fill" src={require("@/assets/images/tabIcons/settings.png")} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
