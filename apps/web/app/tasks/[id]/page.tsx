import Link from "next/link";
import { notFound } from "next/navigation";
import { getTaskDetail } from "@eq-alla/data";
import { Breadcrumbs } from "../../../components/breadcrumbs";
import { buildNotFoundMetadata, buildPageMetadata, joinDescriptionParts } from "../../../components/page-metadata";
import { DefinitionGrid, PageHero, SectionCard } from "../../../components/catalog-shell";

type TaskDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: TaskDetailPageProps) {
  const { id } = await params;
  const task = getTaskDetail(Number(id));

  if (!task) {
    return buildNotFoundMetadata("Task");
  }

  return buildPageMetadata({
    title: task.title,
    description:
      joinDescriptionParts([task.summary, task.levelRange ? `levels ${task.levelRange}` : null, task.reward]) ||
      `Objectives and rewards for ${task.title}.`,
    path: `/tasks/${task.id}`
  });
}

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { id } = await params;
  const task = getTaskDetail(Number(id));

  if (!task) notFound();

  return (
    <>
      <Breadcrumbs entries={[{ label: "Tasks", href: "/tasks" }, { label: task.title }]} />
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
