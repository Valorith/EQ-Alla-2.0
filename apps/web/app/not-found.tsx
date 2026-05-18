import { ArchiveBoundaryContent } from "../components/archive-boundary-content";

export default function NotFound() {
  return (
    <ArchiveBoundaryContent
      eyebrow="Archive Entry Missing"
      title="This record isn't in the archive"
      description="The page or entity you requested could not be found. It may have been removed, never existed in this database, or the link may be outdated."
    />
  );
}
