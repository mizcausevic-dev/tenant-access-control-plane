import { ControlPlane } from "@/components/control-plane";
import { personas } from "@/lib/domain/sample-data";

export default function Home() {
  return <ControlPlane personas={personas} />;
}
