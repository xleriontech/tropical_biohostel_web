import PropertyPageClient from "./PropertyPageClient";

// Slugs conocidos; en build sin API se usa esta lista mínima.
const FALLBACK_SLUGS = ["cosmic-bungalow", "_"];

export async function generateStaticParams() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL;
  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl}/properties?limit=100`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        const slugs = items
          .map((p: any) => p?.slug)
          .filter((s: any): s is string => typeof s === "string" && s.length > 0);
        const unique = Array.from(new Set([...slugs, ...FALLBACK_SLUGS]));
        if (unique.length > 0) return unique.map((slug) => ({ slug }));
      }
    } catch {
      // Sin API en build: usar fallback.
    }
  }
  return FALLBACK_SLUGS.map((slug) => ({ slug }));
}

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PropertyPageClient slug={slug} />;
}
