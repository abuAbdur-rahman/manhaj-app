import { View } from "react-native";

import AppTabs from "@/components/app-tabs";
import { MiniPlayer } from "@/components/mini-player";
import { BottomTabInset } from "@/constants/theme";

export default function TabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <AppTabs />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: BottomTabInset }} pointerEvents="box-none">
        <MiniPlayer />
      </View>
    </View>
  );
}
