import React from "react";
import AuthProvider from "../context/auth-provider";
import FeatureFlagsProvider from "../context/feature-flags-provider";
import AdminDashboard from "../components/admin/admin-dashboard";

const AdminPage = () => {
  return (
    <FeatureFlagsProvider>
      <AuthProvider>
        <AdminDashboard />
      </AuthProvider>
    </FeatureFlagsProvider>
  );
};

export default AdminPage;
