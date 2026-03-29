import { redirect } from "next/navigation";

type AdvancedNpcsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdvancedNpcsPage({ searchParams }: AdvancedNpcsPageProps) {
  const params = await searchParams;
  const query = typeof params.name === "string" ? params.name : "";

  redirect(query ? `/npcs?q=${encodeURIComponent(query)}` : "/npcs");
}
