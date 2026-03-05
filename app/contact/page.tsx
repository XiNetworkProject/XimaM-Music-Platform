import { redirect } from 'next/navigation';

// Toute visite sur /contact est redirigée vers /support (301 permanent)
export default function ContactPage() {
  redirect('/support');
}
