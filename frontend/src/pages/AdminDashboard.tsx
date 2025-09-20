import { CreditConfigurationScreen } from '../components/admin/credit-configuration';

export default function AdminDashboard() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Credit Configuration</h1>
        <p className="text-muted-foreground">
          Manage credit configurations for all tenants
        </p>
      </div>

      <CreditConfigurationScreen />
    </div>
  );
}
