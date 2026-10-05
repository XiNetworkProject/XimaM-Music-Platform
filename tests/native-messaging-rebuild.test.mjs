import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = name => fs.readFileSync(`synaura-app/src/screens/${name}.tsx`, 'utf8');
const inbox = screen('MessagesScreen');
const conversation = screen('ConversationScreen');

test('native inbox preserves real queries, sharing and friend/group actions', () => {
  for (const name of ['getMessageConversations', 'getMessageContacts', 'getMessageRequests', 'createDirectConversation', 'createGroupConversation', 'mutateMessageRequest', 'sendConversationMessage', 'subscribeToMessagingInboxRealtime']) assert.ok(inbox.includes(name), name);
  assert.match(inbox, /enabled: Boolean\(auth.user && auth.token\)/);
  assert.match(inbox, /if \(pendingShare\)/);
  assert.match(inbox, /share: undefined/);
  assert.match(inbox, /groupMembers.length < 2/);
});

test('new inbox navigation remains explicit, named and keyboard-safe', () => {
  for (const label of ['Créer un groupe', 'Nouvelle discussion', 'Rechercher dans la messagerie', 'Effacer la recherche', 'Nom du groupe']) assert.ok(inbox.includes(label), label);
  assert.match(inbox, /CollectionTabs options=\{tabs\}/);
  assert.match(inbox, /KeyboardAvoidingView style=\{styles.sheetBackdrop\}/);
  assert.match(inbox, /keyboardShouldPersistTaps="handled" style=\{styles.groupContacts\}/);
  assert.match(inbox, /navigation.navigate\('Login', \{ returnTo: \{ screen: 'Messages' \}/);
});

test('conversation keeps authorization, room identity and durable message outbox', () => {
  for (const fragment of [
    'enabled: Boolean(auth.user && auth.token && conversationId)',
    'Boolean(conversation?.canMessage && !conversation?.blocked)',
    'loadedRoomRef.current !== responseRoomId',
    'messagingKeys.conversation(conversationId), activeRoomId',
    'enqueueMessage', 'deliverOutboxMessage', 'readMessageOutbox',
    'useVoiceMessageRecorder', 'openInternalLink',
  ]) assert.ok(conversation.includes(fragment), fragment);
});

test('composer remains outside the virtual list with bounded multiline input', () => {
  assert.match(conversation, /keyboardVerticalOffset=\{0\}/);
  assert.match(conversation, /keyboardDismissMode="on-drag"/);
  assert.ok(conversation.indexOf('<View style={[styles.composerWrap') > conversation.indexOf('drawDistance={layout.height * 1.25}'));
  assert.match(conversation, /accessibilityLabel="Message"/);
  assert.match(conversation, /input: \{ minHeight: 46, maxHeight: 144/);
  assert.match(conversation, /sharedBubble: \{ width: 274, maxWidth: '100%'/);
  assert.match(conversation, /audioBubble: \{ width: 254, maxWidth: '100%'/);
});

test('theme and animations follow native preferences without remounting drafts', () => {
  assert.match(conversation, /useMessagingColors\(\)/);
  assert.match(conversation, /EntryMotionScope/);
  assert.match(conversation, /if \(!motion\) return null/);
  assert.match(conversation, /return \(\) => animation.stop\(\)/);
  assert.doesNotMatch(conversation, /key=\{colors.background\}/);
  const palette = fs.readFileSync('synaura-app/src/components/messaging/useMessagingColors.ts', 'utf8');
  assert.match(palette, /background: palette.bg/);
  assert.match(palette, /text: palette.text/);
});
