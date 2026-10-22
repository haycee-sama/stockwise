// src/pages/SettingsPage.jsx
// Placeholder for the Settings page. The real page will need:
// - User profile editing (firstName, lastName, email, phone).
// - Business profile editing (businessName, type, currency, timezone).
// - Password change.
// - Sign-out everywhere (revoke all sessions).
// All of these require a configured Supabase project (or REST backend).
// See docs/BACKEND_HANDOVER.md (Section F, outstanding integration tasks).

import ComingSoon from '../components/common/ComingSoon';

export default function SettingsPage() {
  return (
    <ComingSoon
      title="Settings"
      description="Manage your user profile, business details, password, and active sessions. This page will be wired up to the Supabase backend once it is configured."
    />
  );
}
