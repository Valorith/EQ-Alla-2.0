import { buildPageMetadata } from "../../components/page-metadata";
import { AugBench } from "./aug-bench-client";
import "./aug-bench.css";

export const metadata = buildPageMetadata({
  title: "Aug Bench", path: "/aug-bench",
  description: "Browse discovered EverQuest augments, plan augments by equipment position, compare stats, and track what you still need to acquire."
});

export default function AugBenchPage() {
  return <AugBench />;
}
