import CategoryClient from "./CategoryClient";

const CATEGORY_SLUGS = [
  "hoteles",
  "hostales",
  "glamping",
  "centros-turisticos",
  "restaurantes",
  "bares",
  "fincas",
  "actividades",
];

export function generateStaticParams() {
  return CATEGORY_SLUGS.map((tipo) => ({ tipo }));
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ tipo: string }>;
}) {
  const { tipo } = await params;
  return <CategoryClient tipo={tipo} />;
}
