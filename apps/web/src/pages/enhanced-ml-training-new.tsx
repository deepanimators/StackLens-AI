import Layout from "@/components/layout";
import EnhancedMLTrainingDashboard from "@/components/enhanced-ml-training-dashboard";

export default function EnhancedMLTraining() {
  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Enhanced ML Training
          </h1>
          <p className="text-muted-foreground mt-2">
            Train separate Prediction and Suggestion models with enhanced
            accuracy targeting 95%+ for error detection and 90%+ for resolution
            suggestions.
          </p>
        </div>
        <EnhancedMLTrainingDashboard />
      </div>
    </Layout>
  );
}
