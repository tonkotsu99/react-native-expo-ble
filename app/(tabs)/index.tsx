import AttendancePage from "@/components/pages/AttendancePage";
import { useRouter } from "expo-router";

export default function DashboardScreen() {
  const router = useRouter();

  const handleTabChange = (tab: any) => {
    switch (tab) {
      case "dashboard":
        (router as any).replace("/");
        break;
      case "connection":
        (router as any).replace("/connection");
        break;
      case "settings":
        (router as any).replace("/settings");
        break;
      default:
        break;
    }
  };

  return (
    <AttendancePage
      controlledActiveTab="dashboard"
      onTabChange={handleTabChange}
      hideBottomNavigation
    />
  );
}
