import { redirect } from "next/navigation";

type ZoneNamedPageProps = {
  params: Promise<{ shortName: string }>;
};

export default async function ZoneNamedPage({ params }: ZoneNamedPageProps) {
  const { shortName } = await params;
  redirect(`/zones/${shortName}?mode=named`);
}
