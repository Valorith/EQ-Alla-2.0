import { ClassLoadingIndicator } from "../components/class-loading-indicator";

export default function Loading() {
  return (
    <ClassLoadingIndicator
      fullScreen
      message="Loading page"
      detail="The gnome is flipping to the right entry."
    />
  );
}
