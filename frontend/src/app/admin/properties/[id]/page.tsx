import AdminPropertyClient from "./AdminPropertyClient";

export function generateStaticParams() {
  return [{ id: "new" }, { id: "_" }];
}

export default async function AdminPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminPropertyClient id={id} />;
}
