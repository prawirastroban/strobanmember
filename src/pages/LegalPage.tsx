import { useEffect, useMemo, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import ContactComplaintForm from "@/pages/legal/ContactComplaintForm";

export const LEGAL_SLUGS = [
  "terms",
  "privacy",
  "cookie",
  "refund",
  "disclaimer",
  "faq",
  "contact",
] as const;
export type LegalSlug = typeof LEGAL_SLUGS[number];

export const LEGAL_META: Record<LegalSlug, { label: string; path: string }> = {
  terms: { label: "Syarat & Ketentuan", path: "/legal/terms" },
  privacy: { label: "Kebijakan Privasi", path: "/legal/privacy" },
  cookie: { label: "Kebijakan Cookie", path: "/legal/cookie" },
  refund: { label: "Refund & Pembatalan", path: "/legal/refund" },
  disclaimer: { label: "Disclaimer Layanan", path: "/legal/disclaimer" },
  faq: { label: "FAQ", path: "/legal/faq" },
  contact: { label: "Kontak & Pengaduan", path: "/legal/contact" },
};

const LegalPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const validSlug = useMemo(
    () => (LEGAL_SLUGS.includes(slug as LegalSlug) ? (slug as LegalSlug) : null),
    [slug],
  );
  const [doc, setDoc] = useState<{ title: string; content: string; updated_at: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!validSlug) return;
    setLoading(true);
    (supabase as any)
      .from("legal_documents")
      .select("title, content, updated_at")
      .eq("slug", validSlug)
      .maybeSingle()
      .then(({ data }: any) => {
        setDoc(data ?? null);
        setLoading(false);
      });
  }, [validSlug]);

  // SEO: set per-page title, description, and canonical so Google can index
  // Privacy / Terms / etc. as distinct pages (required for OAuth verification).
  useEffect(() => {
    if (!validSlug) return;
    const label = LEGAL_META[validSlug].label;
    const title = `${label} — Sahabat Stroban Service`;
    document.title = title;

    const canonicalHref = `https://www.bengkelstroban.com${LEGAL_META[validSlug].path}`;
    const upsertLink = (rel: string, href: string) => {
      let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", rel);
        document.head.appendChild(el);
      }
      el.setAttribute("href", href);
    };
    upsertLink("canonical", canonicalHref);

    const upsertMeta = (name: string, content: string, attr: "name" | "property" = "name") => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    const desc = `${label} resmi Sahabat Stroban Service (bengkelstroban.com). Berisi ketentuan, hak Anda, dan cara menghubungi kami.`;
    upsertMeta("description", desc);
    upsertMeta("og:title", title, "property");
    upsertMeta("og:description", desc, "property");
    upsertMeta("og:url", canonicalHref, "property");
    upsertMeta("og:type", "article", "property");
  }, [validSlug]);

  if (!validSlug) return <Navigate to="/legal/terms" replace />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{doc?.title || LEGAL_META[validSlug].label}</h1>
            {doc?.updated_at && (
              <p className="text-xs text-muted-foreground mb-6">
                Terakhir diperbarui: {new Date(doc.updated_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
            <div className="prose prose-sm md:prose-base max-w-none whitespace-pre-wrap leading-relaxed text-foreground">
              {doc?.content || "Konten belum tersedia."}
            </div>

            {validSlug === "contact" && (
              <div className="mt-10 pt-8 border-t">
                <h2 className="text-xl font-semibold mb-4">Formulir Pengaduan</h2>
                <ContactComplaintForm />
              </div>
            )}

            <nav className="mt-12 pt-8 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Halaman lain</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {LEGAL_SLUGS.filter((s) => s !== validSlug).map((s) => (
                  <Link key={s} to={LEGAL_META[s].path} className="text-sm text-primary hover:underline">
                    {LEGAL_META[s].label}
                  </Link>
                ))}
              </div>
            </nav>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default LegalPage;