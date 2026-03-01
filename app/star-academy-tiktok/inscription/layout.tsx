import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Star Academy TikTok • Inscription Auditions",
  description:
    "Candidature officielle Star Academy TikTok : inscriptions, profil et CV vocal pour les auditions live.",
};

export default function InscriptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
