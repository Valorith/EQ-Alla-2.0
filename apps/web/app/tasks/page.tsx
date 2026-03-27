import Link from "next/link";
import { listTasks } from "@eq-alla/data";
import { Input } from "@eq-alla/ui";
import { PageHero, SectionCard, SimpleTable } from "../../components/catalog";

type TasksPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const tasks = listTasks(q);

  return (
    <>
      <PageHero eyebrow="Tasks" title="Task Search" description="Zone-linked task and quest coverage for parity with the old task flows." />
      <SectionCard title="Filter">
        <form action="/tasks" className="flex gap-3">
          <Input name="q" defaultValue={q} placeholder="Ledger..." />
          <button className="h-11 rounded-full bg-[var(--accent)] px-5 text-sm font-medium text-[var(--accent-foreground)]">
            Search
          </button>
        </form>
      </SectionCard>
      <SectionCard title={`${tasks.length} tasks`}>
        <SimpleTable
          columns={["Task", "Zone", "Levels", "Reward"]}
          rows={tasks.map((task) => [
            <Link key={task.id} href={`/tasks/${task.id}`} className="font-medium hover:underline">
              {task.title}
            </Link>,
            task.zone.longName,
            task.levelRange,
            task.reward
          ])}
        />
      </SectionCard>
    </>
  );
}

