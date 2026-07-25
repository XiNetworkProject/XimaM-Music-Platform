'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { MessageCircle } from 'lucide-react';

export default function MessageInboxButton({
  className = '',
}: {
  className?: string;
}) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [unread, setUnread] = useState(0);
  const authenticated = Boolean(session?.user?.id);

  const loadUnread = useCallback(async () => {
    if (!authenticated) {
      setUnread(0);
      return;
    }
    try {
      const response = await fetch('/api/messages/unread', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (response.ok) setUnread(Math.max(0, Number(payload?.total || 0)));
    } catch {}
  }, [authenticated]);

  useEffect(() => {
    void loadUnread();
    if (!authenticated) return;

    const timer = window.setInterval(loadUnread, 30_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void loadUnread();
    };
    const onMessagesChanged = () => void loadUnread();
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('synaura:messages-changed', onMessagesChanged);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('synaura:messages-changed', onMessagesChanged);
    };
  }, [authenticated, loadUnread, pathname]);

  const href = authenticated
    ? '/messages'
    : '/auth/signin?callbackUrl=%2Fmessages';
  const label = status === 'loading'
    ? 'Chargement des messages'
    : unread > 0
      ? `Messages, ${unread} non lu${unread > 1 ? 's' : ''}`
      : 'Messages';

  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full transition ${className}`}
    >
      <MessageCircle className="h-4 w-4" />
      {unread > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-[#D96D63] px-1 text-[9px] font-black leading-none text-white ring-2 ring-current/0">
          {unread > 99 ? '99+' : unread}
        </span>
      ) : null}
    </Link>
  );
}
