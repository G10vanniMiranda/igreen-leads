import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Operações | iGreen Leads",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="admin-root">{children}</div>;
}
