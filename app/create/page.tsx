import { redirect } from 'next/navigation';
import { getCreateRouteHref } from '@/lib/createSurface';

export default function CreatePage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  redirect(getCreateRouteHref(searchParams));
}
