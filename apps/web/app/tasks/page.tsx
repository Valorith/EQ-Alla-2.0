import { PageHero } from "../../components/catalog-shell";
import { TaskSearchClient } from "./task-search-client";

type TasksPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";

  return (
    <>
      <PageHero eyebrow="Tasks" title="Task Search" description="Zone-linked task and quest coverage for parity with the old task flows." />
      <TaskSearchClient initialQuery={q} />
    </>
  );
}
