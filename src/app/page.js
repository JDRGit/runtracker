import { isNeonAuthConfigured } from "@/lib/auth";
import AuthConfigurationNotice from "./AuthConfigurationNotice";
import RunTrackerApp from "./RunTrackerApp";

export const dynamic = "force-dynamic";

export default function Home() {
  if (!isNeonAuthConfigured()) {
    return <AuthConfigurationNotice />;
  }

  return <RunTrackerApp />;
}
