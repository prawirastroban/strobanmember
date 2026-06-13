import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { isNoIndexPath } from "@/config/pageRegistry";

const SITE_URL = "https://www.bengkelstroban.com";
const BRAND = "Sahabat Stroban";

type RouteMeta = {
  title: string;
  description: string;
  ogType?: "website" | "article";
};

const STATIC_ROUTES: Record<string, RouteMeta> = {
  "/": {
    title: `${BRAND} — Servis Mobil & Loyalty Rewards`,
    description:
      "Bengkel servis mobil terpercaya di Bandung, Tasikmalaya, Cirebon & Yogyakarta. Booking online, pengingat servis & poin loyalitas tiap kunjungan.",
  },
  "/katalog": {
    title: `Katalog Layanan Servis Mobil — ${BRAND}`,
    description:
      "Daftar lengkap jasa servis mobil Sahabat Stroban: tune up, ganti oli, AC, kaki-kaki, ban, hingga overhaul. Harga transparan dan booking online.",
  },
  "/cabang": {
    title: `Cabang Bengkel — Bandung, Tasik, Cirebon, Yogyakarta`,
    description:
      "Lokasi cabang Sahabat Stroban di Bandung, Tasikmalaya, Cirebon, dan Yogyakarta lengkap dengan jam operasional dan rute peta.",
  },
  "/promo": {
    title: `Promo & Voucher Servis Mobil — ${BRAND}`,
    description:
      "Promo dan voucher diskon servis mobil terbaru dari Sahabat Stroban. Klaim langsung dan gunakan saat booking servis.",
  },
  "/feedback": {
    title: `Kirim Masukan & Lapor Bug — ${BRAND}`,
    description:
      "Sampaikan saran, kritik, atau laporan bug untuk membantu kami meningkatkan layanan Sahabat Stroban Service.",
  },
  "/booking": {
    title: `Booking Servis Mobil Online — ${BRAND}`,
    description:
      "Pesan jadwal servis mobil online di Sahabat Stroban. Pilih cabang, layanan, dan waktu — selesai kurang dari 1 jam.",
  },
  "/loyalty": {
    title: `Loyalty Rewards & Poin — ${BRAND}`,
    description:
      "Kumpulkan poin tiap servis dan tukar dengan voucher di Rewards Store Sahabat Stroban.",
  },
  "/referral": {
    title: `Program Referral — ${BRAND}`,
    description:
      "Ajak teman servis di Sahabat Stroban dan dapatkan poin bonus untuk kedua belah pihak.",
  },
};

const LEGAL_LABELS: Record<string, string> = {
  terms: "Syarat & Ketentuan",
  privacy: "Kebijakan Privasi",
  cookie: "Kebijakan Cookie",
  refund: "Refund & Pembatalan",
  disclaimer: "Disclaimer Layanan",
  faq: "FAQ",
  contact: "Kontak & Pengaduan",
};

const upsertMeta = (
  attr: "name" | "property",
  key: string,
  content: string,
) => {
  const sel = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(sel);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const upsertCanonical = (href: string) => {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = href;
};

const resolveMeta = (pathname: string): RouteMeta => {
  if (STATIC_ROUTES[pathname]) return STATIC_ROUTES[pathname];
  const legalMatch = pathname.match(/^\/legal\/([^/]+)$/);
  if (legalMatch && LEGAL_LABELS[legalMatch[1]]) {
    const label = LEGAL_LABELS[legalMatch[1]];
    return {
      title: `${label} — ${BRAND} Service`,
      description: `${label} resmi Sahabat Stroban Service (bengkelstroban.com). Berisi ketentuan, hak Anda, dan cara menghubungi kami.`,
      ogType: "article",
    };
  }
  return STATIC_ROUTES["/"];
};

/**
 * Sets per-route <title>, meta description, canonical, and og:url/og:title/og:description
 * so each route is uniquely indexable. Mount AFTER BrandingSync so route-specific titles win.
 */
const SEOMeta = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = resolveMeta(pathname);
    const url = `${SITE_URL}${pathname === "/" ? "/" : pathname}`;
    const ogType = meta.ogType ?? "website";

    document.title = meta.title;
    upsertMeta("name", "description", meta.description);
    upsertCanonical(url);

    upsertMeta("property", "og:title", meta.title);
    upsertMeta("property", "og:description", meta.description);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:type", ogType);

    upsertMeta("name", "twitter:title", meta.title);
    upsertMeta("name", "twitter:description", meta.description);

    // Page Audit: halaman DEPRECATED/ARCHIVED tidak boleh diindeks Google.
    if (isNoIndexPath(pathname)) {
      upsertMeta("name", "robots", "noindex, nofollow");
    } else {
      // Hapus override agar default crawlable.
      const el = document.head.querySelector('meta[name="robots"]');
      if (el) el.parentElement?.removeChild(el);
    }
  }, [pathname]);

  return null;
};

export default SEOMeta;