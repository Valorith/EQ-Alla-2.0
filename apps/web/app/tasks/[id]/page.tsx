import Link from "next/link";
import { notFound } from "next/navigation";
import { getTaskDetail } from "@eq-alla/data";
import { DefinitionGrid, PageHero, SectionCard } from "../../../components/catalog";

type TaskDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { id } = await params;
  const task = getTaskDetail(Number(id));

  if (!task) notFound();

  return (
    <>
      <PageHero eyebrow="Task Detail" title={task.title} description={task.summary} badges={[task.levelRange, task.reward]} />
      <SectionCard title="Overview">
        <DefinitionGrid
          items={[
            {
              label: "Start zone",
              value: (
                <Link href={task.zone.href} className="hover:underline">
                  {task.zone.longName}
                </Link>
              )
            },
            { label: "Level range", value: task.levelRange },
            { label: "Reward", value: task.reward }
          ]}
        />
      </SectionCard>
      <SectionCard title="Objectives">
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          {task.objectives.map((objective) => (
            <li key={objective}>{objective}</li>
          ))}
        </ol>
      </SectionCard>
    </>
  );
}

