import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Booking from "./pages/Booking";
import AdminDashboard from "./pages/admin/Dashboard";
import CustomerDashboard from "./pages/customer/Dashboard";
import CustomerHistory from "./pages/customer/History";
import Tenants from "./pages/admin/Tenants";
import Categories from "./pages/admin/Categories";
import Services from "./pages/admin/Services";
import Scopes from "./pages/admin/Scopes";
import Prices from "./pages/admin/Prices";
import Split from "./pages/admin/Split";
import UsersPage from "./pages/admin/Users";
import Appointments from "./pages/admin/Appointments";
import AppointmentDetail from "./pages/admin/AppointmentDetail";
import FinancialReconciliation from "./pages/admin/FinancialReconciliation";
import AuditLogs from "./pages/admin/AuditLogs";
import WhatsApp from "./pages/admin/WhatsApp";
import Iugu from "./pages/admin/Iugu";
import Reports from "./pages/admin/Reports";
import AdminSettings from "./pages/admin/Settings";
import InspectionTypes from "./pages/admin/InspectionTypes";
import InspectionLines from "./pages/admin/InspectionLines";
import InspectionPricing from "./pages/admin/InspectionPricing";
import Orgaos from "./pages/admin/Orgaos";
import TenantDashboard from "./pages/tenant/Dashboard";
import TenantAppointments from "./pages/tenant/Appointments";
import TenantCustomers from "./pages/tenant/Customers";
import TenantReports from "./pages/tenant/Reports";
import TenantSettings from "./pages/tenant/Settings";
import TenantPricing from "./pages/tenant/Pricing";
import TenantFinancial from "./pages/tenant/Financial";
import TenantUsers from "./pages/tenant/Users";
import Login from "./pages/Login";
import OrgaoDashboard from "./pages/orgao/Dashboard";
import OrgaoReports from "./pages/orgao/Reports";
import TestIuguTokenizationPage from "./pages/TestIuguTokenization";
import TecnicosPage from "./pages/tenant/Tecnicos";

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Login} />
      <Route path={"/agendar"} component={Booking} />
      <Route path={"/test-iugu"} component={TestIuguTokenizationPage} />

      {/* Customer Routes */}
      <Route path={"/customer/dashboard"} component={CustomerDashboard} />
      <Route path={"/customer/history"} component={CustomerHistory} />

      {/* Tenant Routes */}
      <Route path={"/tenant"} component={TenantDashboard} />
      <Route path={"/tenant/appointments"} component={TenantAppointments} />
      <Route path={"/tenant/customers"} component={TenantCustomers} />
      <Route path={"/tenant/pricing"} component={TenantPricing} />
      <Route path={"/tenant/financial"} component={TenantFinancial} />
      <Route path={"/tenant/financial/:companyId"} component={TenantFinancial} />
      <Route path={"/tenant/users"} component={TenantUsers} />
      <Route path={"/tenant/tecnicos"} component={TecnicosPage} />
      <Route path={"/tenant/reports"} component={TenantReports} />
      <Route path={"/tenant/settings"} component={TenantSettings} />

      {/* Orgao Routes */}
      <Route path={"/orgao"} component={OrgaoDashboard} />
      <Route path={"/orgao/reports"} component={OrgaoReports} />

      {/* Admin Routes */}
      <Route path={"/admin"} component={AdminDashboard} />
      <Route path={"/admin/tenants"} component={Tenants} />
      <Route path={"/admin/categories"} component={Categories} />
      <Route path={"/admin/services"} component={Services} />
      <Route path={"/admin/scopes"} component={Scopes} />
      <Route path={"/admin/prices"} component={Prices} />
      <Route path={"/admin/split"} component={Split} />
      <Route path={"/admin/users"} component={UsersPage} />
      <Route path={"/admin/appointments"} component={Appointments} />
      <Route path={"/admin/appointments/detail"} component={AppointmentDetail} />
      <Route path={"/admin/inspection-types"} component={InspectionTypes} />
      <Route path={"/admin/inspection-lines"} component={InspectionLines} />
      <Route path={"/admin/inspection-pricing"} component={InspectionPricing} />
      <Route path={"/admin/orgaos"} component={Orgaos} />
      <Route path={"/admin/reconciliation"} component={FinancialReconciliation} />
      <Route path={"/admin/audit"} component={AuditLogs} />
      <Route path={"/admin/whatsapp"} component={WhatsApp} />
      <Route path={"/admin/iugu"} component={Iugu} />
      <Route path={"/admin/reports"} component={Reports} />
      <Route path={"/admin/settings"} component={AdminSettings} />

      {/* Fallback Routes */}
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
