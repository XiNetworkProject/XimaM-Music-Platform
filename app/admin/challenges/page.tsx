import ChallengesAdminClient from './ChallengesAdminClient';

// Le guard admin (auth + role) est deja applique par app/admin/layout.tsx pour
// toute route sous /admin/** : non connecte -> /auth/signin, connecte non-admin -> /.
export default function AdminChallengesPage() {
  return <ChallengesAdminClient />;
}
