import { redirect } from 'next/navigation';

/**
 * Quick replies are now scoped per project. Redirect to projects list
 * so the user can open a project and use Quick replies from the sidebar.
 */
export default function CannedResponsesPage() {
  redirect('/projects');
}
