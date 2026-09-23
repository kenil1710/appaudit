"use client";

import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { Footer } from "./Footer";
import { PageShell } from "./Motion";

/** Every app page's frame: header with wallet + network, content column, footer.
 *  The landing page does NOT use this - it has no wallet. */
export function AppShell({ children, title, blurb, eyebrow, actions }: {
  children: ReactNode; title?: string; blurb?: ReactNode; eyebrow?: string; actions?: ReactNode;
}) {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <AppHeader />
      <main style={{ flex: 1, paddingTop: 34 }}>
        <div className="container">
          <PageShell>
            {(title || actions) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28 }}>
                <div style={{ minWidth: 0 }}>
                  {eyebrow && <div className="eyebrow" style={{ marginBottom: 10 }}>{eyebrow}</div>}
                  {title && <h1 style={{ margin: 0, fontSize: "clamp(1.6rem, 4.2vw, 2.3rem)", lineHeight: 1.15 }}>{title}</h1>}
                  {blurb && <p className="dim" style={{ margin: "12px 0 0", fontSize: "0.95rem", maxWidth: 660 }}>{blurb}</p>}
                </div>
                {actions && <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{actions}</div>}
              </div>
            )}
            {children}
          </PageShell>
        </div>
      </main>
      <Footer />
    </div>
  );
}
