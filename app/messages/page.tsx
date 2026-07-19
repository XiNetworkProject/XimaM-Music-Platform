"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BellOff,
  Check,
  Clock3,
  Inbox,
  MessageCircle,
  Plus,
  Search,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Avatar from "@/components/Avatar";
import { notify } from "@/components/NotificationCenter";

type MessagingProfile = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  isVerified?: boolean;
  lastSeen?: string | null;
};

type Conversation = {
  id: string;
  name?: string | null;
  type?: "direct" | "group";
  participants?: MessagingProfile[];
  preferences?: { nickname?: string | null };
  otherUser: MessagingProfile | null;
  lastMessage: {
    id: string;
    content: string;
    type: string;
    createdAt: string;
    senderId: string;
  } | null;
  unreadCount: number;
  canMessage: boolean;
  blocked: boolean;
  muted: boolean;
  updatedAt: string;
};

type ContactRequest = {
  id: string;
  direction: "received" | "sent";
  user: MessagingProfile;
  message: string | null;
  createdAt: string;
};

type Contact = {
  friendshipId: string;
  user: MessagingProfile;
  conversationId: string | null;
  friendsSince: string;
};

type InboxTab = "conversations" | "requests" | "contacts";

function readTab(value: string | null): InboxTab {
  if (value === "requests" || value === "contacts") return value;
  return "conversations";
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} j`;
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

function messagePreview(message: Conversation["lastMessage"]) {
  if (!message) return "Commencez la discussion";
  if (message.type === "image") return "Image";
  if (message.type === "video") return "Vidéo";
  if (message.type === "audio") return "Message audio";
  if (message.type === "track") return "Son partagé";
  if (message.type === "clip") return "Clip partagé";
  if (message.type === "post") return "Post partagé";
  if (message.type === "playlist") return "Playlist partagée";
  if (message.type === "deleted") return "Message supprimé";
  return message.content || "Nouveau message";
}

function isRecentlyActive(lastSeen?: string | null) {
  if (!lastSeen) return false;
  const timestamp = new Date(lastSeen).getTime();
  return Number.isFinite(timestamp) && Date.now() - timestamp < 5 * 60_000;
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<InboxLoading />}>
      <MessagesContent />
    </Suspense>
  );
}

function MessagesContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<InboxTab>(() =>
    readTab(searchParams.get("tab"))
  );
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<ContactRequest[]>(
    []
  );
  const [sentRequests, setSentRequests] = useState<ContactRequest[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [contactToRemove, setContactToRemove] = useState<Contact | null>(null);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [groupBusy, setGroupBusy] = useState(false);

  useEffect(() => {
    setActiveTab(readTab(searchParams.get("tab")));
  }, [searchParams]);

  const loadInbox = useCallback(
    async (quiet = false) => {
      if (!session?.user?.id) return;
      if (quiet) setRefreshing(true);
      else setLoading(true);
      try {
        const [conversationResponse, requestResponse, contactResponse] =
          await Promise.all([
            fetch("/api/messages/conversations", { cache: "no-store" }),
            fetch("/api/messages/requests", { cache: "no-store" }),
            fetch("/api/messages/contacts", { cache: "no-store" }),
          ]);
        const [conversationPayload, requestPayload, contactPayload] =
          await Promise.all([
            conversationResponse.json().catch(() => null),
            requestResponse.json().catch(() => null),
            contactResponse.json().catch(() => null),
          ]);
        if (
          !conversationResponse.ok ||
          !requestResponse.ok ||
          !contactResponse.ok
        ) {
          throw new Error(
            conversationPayload?.error ||
              requestPayload?.error ||
              contactPayload?.error ||
              "Messagerie indisponible"
          );
        }
        setConversations(
          Array.isArray(conversationPayload?.conversations)
            ? conversationPayload.conversations
            : []
        );
        setReceivedRequests(
          Array.isArray(requestPayload?.received) ? requestPayload.received : []
        );
        setSentRequests(
          Array.isArray(requestPayload?.sent) ? requestPayload.sent : []
        );
        setContacts(
          Array.isArray(contactPayload?.contacts) ? contactPayload.contacts : []
        );
      } catch (error) {
        if (!quiet)
          notify.error(
            "Messagerie",
            error instanceof Error ? error.message : "Chargement impossible"
          );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session?.user?.id]
  );

  useEffect(() => {
    if (session?.user?.id) void loadInbox();
  }, [loadInbox, session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const timer = window.setInterval(() => void loadInbox(true), 20_000);
    return () => window.clearInterval(timer);
  }, [loadInbox, session?.user?.id]);

  const chooseTab = (tab: InboxTab) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams.toString());
    if (tab === "conversations") next.delete("tab");
    else next.set("tab", tab);
    router.replace(`/messages${next.size ? `?${next.toString()}` : ""}`, {
      scroll: false,
    });
  };

  const mutateRequest = async (
    request: ContactRequest,
    action: "accept" | "reject" | "cancel"
  ) => {
    setProcessingId(request.id);
    try {
      const response = await fetch(
        `/api/messages/requests/${encodeURIComponent(request.id)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Action impossible");
      await loadInbox(true);
      if (action === "accept" && payload?.conversationId) {
        router.push(`/messages/${payload.conversationId}`);
        return;
      }
      notify.success(
        "Demandes",
        action === "cancel" ? "Demande annulée" : "Demande refusée"
      );
    } catch (error) {
      notify.error(
        "Demandes",
        error instanceof Error ? error.message : "Action impossible"
      );
    } finally {
      setProcessingId(null);
    }
  };

  const openContact = async (contact: Contact) => {
    if (contact.conversationId) {
      router.push(`/messages/${contact.conversationId}`);
      return;
    }
    setProcessingId(contact.friendshipId);
    try {
      const response = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: contact.user.id }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.id)
        throw new Error(payload?.error || "Conversation impossible");
      router.push(`/messages/${payload.id}`);
    } catch (error) {
      notify.error(
        "Messages",
        error instanceof Error ? error.message : "Conversation impossible"
      );
    } finally {
      setProcessingId(null);
    }
  };

  const removeContact = async () => {
    if (!contactToRemove) return;
    setProcessingId(contactToRemove.friendshipId);
    try {
      const response = await fetch("/api/messages/contacts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: contactToRemove.user.id }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(payload?.error || "Suppression impossible");
      setContactToRemove(null);
      await loadInbox(true);
      notify.success("Amis", "Ce contact a été retiré de tes amis");
    } catch (error) {
      notify.error(
        "Amis",
        error instanceof Error ? error.message : "Suppression impossible"
      );
    } finally {
      setProcessingId(null);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim() || groupMembers.length < 2 || groupBusy) return;
    setGroupBusy(true);
    try {
      const response = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName.trim(),
          participantIds: groupMembers,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.id)
        throw new Error(payload?.error || "Groupe impossible à créer");
      setGroupOpen(false);
      setGroupName("");
      setGroupMembers([]);
      router.push(`/messages/${payload.id}`);
    } catch (error) {
      notify.error(
        "Groupe",
        error instanceof Error ? error.message : "Création impossible"
      );
    } finally {
      setGroupBusy(false);
    }
  };

  const normalizedQuery = query.trim().toLocaleLowerCase("fr-FR");
  const matches = (profile?: MessagingProfile | null) =>
    !normalizedQuery ||
    Boolean(
      profile?.name.toLocaleLowerCase("fr-FR").includes(normalizedQuery) ||
        profile?.username.toLocaleLowerCase("fr-FR").includes(normalizedQuery)
    );
  const visibleConversations = useMemo(
    () =>
      conversations.filter(
        (conversation) =>
          matches(conversation.otherUser) ||
          Boolean(
            normalizedQuery &&
              conversation.name
                ?.toLocaleLowerCase("fr-FR")
                .includes(normalizedQuery)
          )
      ),
    [conversations, normalizedQuery]
  );
  const visibleReceived = useMemo(
    () => receivedRequests.filter((request) => matches(request.user)),
    [receivedRequests, normalizedQuery]
  );
  const visibleSent = useMemo(
    () => sentRequests.filter((request) => matches(request.user)),
    [sentRequests, normalizedQuery]
  );
  const visibleContacts = useMemo(
    () => contacts.filter((contact) => matches(contact.user)),
    [contacts, normalizedQuery]
  );
  const totalUnread = conversations.reduce(
    (sum, conversation) => sum + conversation.unreadCount,
    0
  );

  if (status === "loading") {
    return <InboxLoading />;
  }

  if (!session?.user) {
    return (
      <main className="min-h-screen bg-syn-background px-5 py-24 text-syn-textPrimary">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-syn-accent/10 text-syn-accent">
            <MessageCircle className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black">Tes discussions Synaura</h1>
          <p className="mt-2 text-sm text-syn-textSecondary">
            Connecte-toi pour retrouver tes amis et parler des sons que vous
            aimez.
          </p>
          <button
            onClick={() => router.push("/auth/signin")}
            className="mt-6 rounded-full bg-syn-textPrimary px-6 py-3 text-sm font-bold text-syn-background"
          >
            Se connecter
          </button>
        </div>
      </main>
    );
  }

  const tabs: Array<{
    id: InboxTab;
    label: string;
    icon: typeof MessageCircle;
    count: number;
  }> = [
    {
      id: "conversations",
      label: "Discussions",
      icon: MessageCircle,
      count: totalUnread,
    },
    {
      id: "requests",
      label: "Demandes",
      icon: Inbox,
      count: receivedRequests.length,
    },
    { id: "contacts", label: "Amis", icon: Users, count: contacts.length },
  ];

  return (
    <main className="min-h-screen bg-syn-background pb-32 text-syn-textPrimary lg:pb-12">
      <div className="mx-auto w-full max-w-4xl px-4 pt-8 sm:px-7 sm:pt-12">
        <header className="flex items-end justify-between gap-4 border-b border-syn-border pb-6">
          <div>
            <p className="mb-2 text-[11px] font-extrabold uppercase text-syn-accent">
              Liens musicaux
            </p>
            <h1 className="text-3xl font-black sm:text-4xl">Messages</h1>
            <p className="mt-2 max-w-lg text-sm text-syn-textSecondary">
              Retrouve tes amis et partage ce qui mérite d’être écouté.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadInbox(true)}
            disabled={refreshing}
            className="hidden rounded-full border border-syn-border bg-syn-surface px-4 py-2 text-xs font-bold text-syn-textSecondary transition hover:text-syn-textPrimary disabled:opacity-50 sm:block"
          >
            {refreshing ? "Actualisation…" : "Actualiser"}
          </button>
        </header>

        <nav
          className="mt-5 flex gap-1 overflow-x-auto rounded-xl bg-syn-surfaceMuted p-1"
          aria-label="Messagerie"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => chooseTab(tab.id)}
                className={`relative flex min-w-fit flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition ${
                  active
                    ? "bg-syn-surface text-syn-textPrimary shadow-sm"
                    : "text-syn-textSecondary hover:text-syn-textPrimary"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.count > 0 ? (
                  <span
                    className={`min-w-5 rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                      active
                        ? "bg-syn-accent text-white"
                        : "bg-syn-border text-syn-textSecondary"
                    }`}
                  >
                    {tab.count > 99 ? "99+" : tab.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {activeTab === "conversations" && contacts.length >= 2 ? (
          <button
            type="button"
            onClick={() => setGroupOpen(true)}
            className="mt-4 flex min-h-16 w-full items-center gap-3 rounded-xl border border-syn-border bg-syn-surface px-4 text-left transition hover:border-syn-accent/40 hover:bg-syn-surfaceMuted"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-syn-accent2/10 text-syn-accent2">
              <Users className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black">Créer un groupe</span>
              <span className="mt-0.5 block text-xs text-syn-textSecondary">
                Des salons pour vos sons, messages et vocaux.
              </span>
            </span>
            <Plus className="h-5 w-5 text-syn-accent" />
          </button>
        ) : null}

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-syn-textSecondary" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              activeTab === "contacts"
                ? "Rechercher un ami"
                : activeTab === "requests"
                ? "Rechercher une demande"
                : "Rechercher une discussion"
            }
            className="h-12 w-full rounded-xl border border-syn-border bg-syn-surface pl-11 pr-10 text-sm text-syn-textPrimary outline-none transition placeholder:text-syn-textSecondary/60 focus:border-syn-accent/60 focus:ring-2 focus:ring-syn-accent/10"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Effacer la recherche"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-syn-textSecondary hover:bg-syn-surfaceMuted hover:text-syn-textPrimary"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <section className="mt-5 min-h-[360px]">
          {loading ? <InboxLoading compact /> : null}

          {!loading && activeTab === "conversations" ? (
            visibleConversations.length ? (
              <div className="divide-y divide-syn-border overflow-hidden rounded-xl border border-syn-border bg-syn-surface">
                {visibleConversations.map((conversation, index) => {
                  const user = conversation.otherUser;
                  const group = conversation.type === "group";
                  const conversationTitle =
                    conversation.preferences?.nickname ||
                    (group
                      ? conversation.name || "Groupe Synaura"
                      : user?.name || "Discussion");
                  return (
                    <motion.button
                      key={conversation.id}
                      type="button"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.025, 0.15) }}
                      onClick={() =>
                        router.push(`/messages/${conversation.id}`)
                      }
                      className="group flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-syn-surfaceMuted/60 sm:px-4"
                    >
                      {user ? (
                        <ProfileAvatar
                          user={user}
                          active={isRecentlyActive(user.lastSeen)}
                        />
                      ) : (
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-syn-accent2/10 text-syn-accent2">
                          <Users className="h-5 w-5" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-extrabold group-hover:text-syn-accent">
                            {conversationTitle}
                          </p>
                          {group ? (
                            <span className="shrink-0 rounded-full bg-syn-accent2/10 px-2 py-0.5 text-[9px] font-black text-syn-accent2">
                              {conversation.participants?.length || 0} membres
                            </span>
                          ) : null}
                          {conversation.muted ? (
                            <BellOff className="h-3.5 w-3.5 shrink-0 text-syn-textSecondary" />
                          ) : null}
                          <span className="ml-auto shrink-0 text-[11px] font-semibold text-syn-textSecondary">
                            {formatDate(
                              conversation.lastMessage?.createdAt ||
                                conversation.updatedAt
                            )}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <p
                            className={`truncate text-xs ${
                              conversation.unreadCount
                                ? "font-bold text-syn-textPrimary"
                                : "text-syn-textSecondary"
                            }`}
                          >
                            {messagePreview(conversation.lastMessage)}
                          </p>
                          {conversation.unreadCount ? (
                            <span className="ml-auto h-2.5 w-2.5 shrink-0 rounded-full bg-syn-accent" />
                          ) : null}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={MessageCircle}
                title="Aucune discussion"
                text={
                  query
                    ? "Aucune discussion ne correspond à ta recherche."
                    : "Ajoute un créateur à tes amis pour commencer à échanger."
                }
                actionLabel={!query ? "Découvrir des créateurs" : undefined}
                onAction={() => router.push("/discover")}
              />
            )
          ) : null}

          {!loading && activeTab === "requests" ? (
            visibleReceived.length || visibleSent.length ? (
              <div className="space-y-7">
                {visibleReceived.length ? (
                  <RequestGroup
                    title="Demandes reçues"
                    requests={visibleReceived}
                    processingId={processingId}
                    onAction={mutateRequest}
                    onProfile={(username) =>
                      router.push(`/profile/${username}`)
                    }
                  />
                ) : null}
                {visibleSent.length ? (
                  <RequestGroup
                    title="Demandes envoyées"
                    requests={visibleSent}
                    processingId={processingId}
                    onAction={mutateRequest}
                    onProfile={(username) =>
                      router.push(`/profile/${username}`)
                    }
                  />
                ) : null}
              </div>
            ) : (
              <EmptyState
                icon={Inbox}
                title="Aucune demande"
                text={
                  query
                    ? "Aucune demande ne correspond à ta recherche."
                    : "Les nouvelles demandes d’amis apparaîtront ici."
                }
              />
            )
          ) : null}

          {!loading && activeTab === "contacts" ? (
            visibleContacts.length ? (
              <div className="divide-y divide-syn-border overflow-hidden rounded-xl border border-syn-border bg-syn-surface">
                {visibleContacts.map((contact) => (
                  <div
                    key={contact.friendshipId}
                    className="flex items-center gap-3 px-3 py-3 sm:px-4"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/profile/${contact.user.username}`)
                      }
                      aria-label={`Profil de ${contact.user.name}`}
                    >
                      <ProfileAvatar
                        user={contact.user}
                        active={isRecentlyActive(contact.user.lastSeen)}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/profile/${contact.user.username}`)
                      }
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm font-extrabold">
                        {contact.user.name}
                      </p>
                      <p className="truncate text-xs text-syn-textSecondary">
                        @{contact.user.username}
                      </p>
                    </button>
                    <button
                      type="button"
                      disabled={processingId === contact.friendshipId}
                      onClick={() => void openContact(contact)}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-syn-textPrimary text-syn-background transition hover:scale-105 disabled:opacity-40"
                      aria-label={`Écrire à ${contact.user.name}`}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setContactToRemove(contact)}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-syn-border text-syn-textSecondary transition hover:bg-syn-destructive/10 hover:text-syn-destructive"
                      aria-label={`Retirer ${contact.user.name} de mes amis`}
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="Aucun ami"
                text={
                  query
                    ? "Aucun ami ne correspond à ta recherche."
                    : "Tes demandes acceptées formeront ici ton cercle musical."
                }
                actionLabel={!query ? "Explorer Synaura" : undefined}
                onAction={() => router.push("/discover")}
              />
            )
          ) : null}
        </section>
      </div>

      <AnimatePresence>
        {groupOpen ? (
          <motion.div
            className="fixed inset-0 z-[110] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event: React.MouseEvent<HTMLDivElement>) => {
              if (event.currentTarget === event.target) setGroupOpen(false);
            }}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-syn-border bg-syn-elevatedSurface p-5 sm:rounded-2xl"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-syn-accent2/10 text-syn-accent2">
                  <Users className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-black">Nouveau groupe</h2>
                  <p className="mt-1 text-xs leading-5 text-syn-textSecondary">
                    Choisis au moins deux amis. Les salons #general et #vocaux
                    seront prêts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setGroupOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-syn-surfaceMuted"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <input
                autoFocus
                value={groupName}
                onChange={(event) =>
                  setGroupName(event.target.value.slice(0, 64))
                }
                placeholder="Nom du groupe"
                className="mt-5 h-11 w-full rounded-lg border border-syn-border bg-syn-surface px-3 text-sm font-bold outline-none focus:border-syn-accent"
              />
              <p className="mt-5 text-[10px] font-black uppercase text-syn-textSecondary">
                {groupMembers.length} ami{groupMembers.length > 1 ? "s" : ""}{" "}
                sélectionné{groupMembers.length > 1 ? "s" : ""}
              </p>
              <div className="mt-2 divide-y divide-syn-border">
                {contacts.map((contact) => {
                  const selected = groupMembers.includes(contact.user.id);
                  return (
                    <button
                      key={contact.user.id}
                      type="button"
                      onClick={() =>
                        setGroupMembers((current) =>
                          selected
                            ? current.filter((id) => id !== contact.user.id)
                            : current.length < 23
                            ? [...current, contact.user.id]
                            : current
                        )
                      }
                      className={`flex min-h-14 w-full items-center gap-3 px-2 text-left ${
                        selected ? "bg-syn-accent/5" : ""
                      }`}
                    >
                      <ProfileAvatar
                        user={contact.user}
                        active={isRecentlyActive(contact.user.lastSeen)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black">
                          {contact.user.name}
                        </span>
                        <span className="block truncate text-xs text-syn-textSecondary">
                          @{contact.user.username}
                        </span>
                      </span>
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                          selected
                            ? "border-syn-accent bg-syn-accent text-white"
                            : "border-syn-border"
                        }`}
                      >
                        {selected ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={
                  !groupName.trim() || groupMembers.length < 2 || groupBusy
                }
                onClick={() => void createGroup()}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-syn-accent text-sm font-black text-white disabled:opacity-40"
              >
                {groupBusy ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Créer le groupe
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {contactToRemove ? (
          <motion.div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event: React.MouseEvent<HTMLDivElement>) => {
              if (event.currentTarget === event.target)
                setContactToRemove(null);
            }}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              className="w-full max-w-sm rounded-xl border border-syn-border bg-syn-elevatedSurface p-5 text-syn-textPrimary shadow-2xl"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-syn-destructive/10 text-syn-destructive">
                <UserMinus className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-black">
                Retirer {contactToRemove.user.name} ?
              </h2>
              <p className="mt-2 text-sm leading-6 text-syn-textSecondary">
                La discussion restera dans tes archives, mais vous devrez
                accepter une nouvelle demande pour vous écrire à nouveau.
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setContactToRemove(null)}
                  className="flex-1 rounded-lg border border-syn-border px-4 py-3 text-sm font-bold"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => void removeContact()}
                  disabled={processingId === contactToRemove.friendshipId}
                  className="flex-1 rounded-lg bg-syn-destructive px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  Retirer
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function ProfileAvatar({
  user,
  active,
}: {
  user: MessagingProfile;
  active: boolean;
}) {
  return (
    <div className="relative shrink-0">
      <Avatar
        src={user.avatar}
        name={user.name}
        username={user.username}
        size="lg"
      />
      {active ? (
        <span
          className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-[3px] border-syn-surface bg-syn-accent2"
          aria-label="Actif récemment"
        />
      ) : null}
    </div>
  );
}

function RequestGroup({
  title,
  requests,
  processingId,
  onAction,
  onProfile,
}: {
  title: string;
  requests: ContactRequest[];
  processingId: string | null;
  onAction: (
    request: ContactRequest,
    action: "accept" | "reject" | "cancel"
  ) => void;
  onProfile: (username: string) => void;
}) {
  return (
    <div>
      <h2 className="mb-3 text-xs font-black uppercase text-syn-textSecondary">
        {title}
      </h2>
      <div className="divide-y divide-syn-border overflow-hidden rounded-xl border border-syn-border bg-syn-surface">
        {requests.map((request) => (
          <div
            key={request.id}
            className="flex items-start gap-3 px-3 py-4 sm:px-4"
          >
            <button
              type="button"
              onClick={() => onProfile(request.user.username)}
            >
              <ProfileAvatar
                user={request.user}
                active={isRecentlyActive(request.user.lastSeen)}
              />
            </button>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onProfile(request.user.username)}
                className="block max-w-full text-left"
              >
                <p className="truncate text-sm font-extrabold">
                  {request.user.name}
                </p>
                <p className="truncate text-xs text-syn-textSecondary">
                  @{request.user.username}
                </p>
              </button>
              {request.message ? (
                <p className="mt-2 line-clamp-3 rounded-lg bg-syn-surfaceMuted px-3 py-2 text-sm leading-5 text-syn-textSecondary">
                  {request.message}
                </p>
              ) : null}
              <p className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-syn-textSecondary">
                <Clock3 className="h-3 w-3" />
                {formatDate(request.createdAt)}
              </p>
            </div>
            {request.direction === "received" ? (
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={processingId === request.id}
                  onClick={() => onAction(request, "accept")}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-syn-textPrimary text-syn-background disabled:opacity-40"
                  aria-label="Accepter"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={processingId === request.id}
                  onClick={() => onAction(request, "reject")}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-syn-border text-syn-textSecondary hover:text-syn-destructive disabled:opacity-40"
                  aria-label="Refuser"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={processingId === request.id}
                onClick={() => onAction(request, "cancel")}
                className="shrink-0 rounded-full border border-syn-border px-3 py-2 text-xs font-bold text-syn-textSecondary hover:text-syn-destructive disabled:opacity-40"
              >
                Annuler
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  text,
  actionLabel,
  onAction,
}: {
  icon: typeof MessageCircle;
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center px-5 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-syn-surfaceMuted text-syn-textSecondary">
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-black">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-syn-textSecondary">
        {text}
      </p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-syn-textPrimary px-5 py-2.5 text-sm font-bold text-syn-background"
        >
          <UserPlus className="h-4 w-4" />
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

function InboxLoading({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center bg-syn-background text-syn-textSecondary ${
        compact ? "min-h-[360px]" : "min-h-screen"
      }`}
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-syn-accent/30 border-t-syn-accent" />
    </div>
  );
}
