import { notFound } from 'next/navigation';
import ComponentLab from './ComponentLab';

export const metadata = { title: 'UI Lab — Synaura' };

export default function SynauraUiLabPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <ComponentLab />;
}
