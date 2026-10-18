// src/pages/DocumentsPage.jsx
// Placeholder for the Documents page. The real page will need:
// - List of generated documents (invoices, receipts, POs).
// - Upload of supporting documents (rent receipts, utility bills).
// - Per-business-scoped storage (likely Supabase Storage buckets with
//   RLS policies matching the business_id).
// See docs/BACKEND_HANDOVER.md §9.

import ComingSoon from '../components/common/ComingSoon';

export default function DocumentsPage() {
  return (
    <ComingSoon
      title="Documents"
      description="A central place for invoices, receipts, and supporting documents. This feature will be implemented after backend integration."
    />
  );
}
