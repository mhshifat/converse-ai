import { ContactsContent } from '@/components/modules/contacts/contacts-content';
import { DashboardPageHeader } from '@/components/modules/dashboard/dashboard-page-header';

export default function ContactsPage() {
  return (
    <div className="p-5 sm:p-6 md:p-8 lg:p-10">
      <DashboardPageHeader
        title="Contacts"
        description="Customer records for CRM-style views and personalization. Merge by external_id (widget customer_id)."
      />
      <ContactsContent />
    </div>
  );
}
