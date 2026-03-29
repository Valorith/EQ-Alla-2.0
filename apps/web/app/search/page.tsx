import { redirect } from "next/navigation";

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  redirect(query ? `/?q=${encodeURIComponent(query)}` : "/");
}
