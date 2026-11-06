import type { Metadata } from "next";
import { Portal } from "../../components/portal/Portal";
import "../admin/admin.css";
import "../alta/alta.css";
import "./portal.css";

export const metadata: Metadata = {
  title: "Mi portal · CAPH Santa Fe",
  robots: { index: false, follow: false },
};

export default function PortalPage() {
  return <Portal />;
}
