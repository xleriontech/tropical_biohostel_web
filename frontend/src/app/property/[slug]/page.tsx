import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { Property } from "@/types";
import PropertyDetailClient from "./PropertyDetailClient";

export const runtime = "edge";

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let property: Property;
  try {
    property = await api.getProperty(slug);
  } catch {
    notFound();
  }

  return <PropertyDetailClient property={property} />;
}
