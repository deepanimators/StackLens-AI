import AdaptiveLayout from "@/components/adaptive-layout";
import POSScenariosViewer from "@/components/pos-scenarios-viewer";

export default function POSScenariosPage() {
  return (
    <AdaptiveLayout
      title="POS Error Scenarios"
      subtitle="Explore the 40 error scenarios used for ML model training and understand how the system responds to different POS errors"
    >
      <POSScenariosViewer />
    </AdaptiveLayout>
  );
}
