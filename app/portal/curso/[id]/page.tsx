import type { Metadata } from "next";
import { Curso } from "../../../../components/portal/Curso";
import "../../../admin/admin.css";
import "../../../alta/alta.css";
import "../../portal.css";

export const metadata: Metadata = {
  title: "Curso · Mi portal · CAPH Santa Fe",
  robots: { index: false, follow: false },
};

export default async function CursoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Curso capId={id} />;
}
