import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageSquare, RefreshCw, Search, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService, messageService } from '../services/api';

const getId = (value) => String(value?._id || value?.id || value || '');

const MessagingPanel = ({ contacts = [], messageTarget = null }) => {
  const [currentUserId, setCurrentUserId] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const normalizedContacts = useMemo(
    () => contacts
      .map(contact => ({ ...contact, id: getId(contact.id || contact._id) }))
      .filter(contact => contact.id),
    [contacts]
  );

  const selectedContact = normalizedContacts.find(contact => contact.id === selectedContactId);
  const visibleContacts = normalizedContacts.filter(contact =>
    `${contact.name || ''} ${contact.email || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    let active = true;
    authService.getProfile()
      .then(({ data }) => {
        if (active) setCurrentUserId(getId(data.user?._id));
      })
      .catch(() => {
        if (active) toast.error('Could not load your messaging profile.');
      });
    messageService.getUnreadCount()
      .then(({ data }) => {
        if (active) setUnreadCount(data.unreadCount || 0);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!normalizedContacts.some(contact => contact.id === selectedContactId)) {
      setSelectedContactId(normalizedContacts[0]?.id || '');
    }
  }, [normalizedContacts, selectedContactId]);

  useEffect(() => {
    const targetId = getId(messageTarget?.id);
    if (targetId && normalizedContacts.some(contact => contact.id === targetId)) {
      setSelectedContactId(targetId);
    }
  }, [messageTarget, normalizedContacts]);

  const loadConversation = useCallback(async (showSpinner = true) => {
    if (!selectedContactId || !currentUserId) {
      setMessages([]);
      return;
    }

    if (showSpinner) setLoading(true);
    try {
      const { data } = await messageService.getConversation(selectedContactId, { limit: 100 });
      const conversation = data.messages || [];
      const unreadIncoming = conversation.filter(message =>
        getId(message.recipientId) === currentUserId && !message.isRead
      );

      if (unreadIncoming.length > 0) {
        await Promise.all(unreadIncoming.map(message =>
          messageService.markAsRead(message._id).catch(() => null)
        ));
        window.dispatchEvent(new Event('school-messages-updated'));
      }

      setMessages(conversation.map(message =>
        unreadIncoming.some(unread => unread._id === message._id)
          ? { ...message, isRead: true }
          : message
      ));
      const unreadResponse = await messageService.getUnreadCount().catch(() => null);
      if (unreadResponse) setUnreadCount(unreadResponse.data.unreadCount || 0);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load this conversation.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [currentUserId, selectedContactId]);

  useEffect(() => {
    loadConversation();
    if (!selectedContactId || !currentUserId) return undefined;

    const intervalId = window.setInterval(() => {
      loadConversation(false);
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [loadConversation]);

  const handleSend = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!selectedContactId || !text) return;

    try {
      setSending(true);
      await messageService.send({
        recipientId: selectedContactId,
        subject: subject.trim() || undefined,
        message: text,
      });
      setSubject('');
      setDraft('');
      await loadConversation(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="grid min-h-[34rem] gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="overflow-hidden rounded-2xl border border-[#d9c5b0] bg-[#fffaf3]">
        <div className="border-b border-[#d9c5b0]/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-[#3f2a1d]">People</h2>
            {unreadCount > 0 && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                {unreadCount} unread
              </span>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8a6a50]" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search by name or email"
              className="w-full rounded-xl border border-[#d9c5b0] bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-[#7a4e2d]"
            />
          </div>
        </div>
        <div className="max-h-[28rem] overflow-y-auto p-2">
          {visibleContacts.map(contact => (
            <button
              key={contact.id}
              type="button"
              onClick={() => setSelectedContactId(contact.id)}
              className={`mb-1 w-full rounded-xl p-3 text-left transition ${
                selectedContactId === contact.id
                  ? 'bg-[#7a4e2d] text-white'
                  : 'text-[#3f2a1d] hover:bg-[#f4ecdf]'
              }`}
            >
              <span className="block truncate text-sm font-bold">{contact.name || 'School contact'}</span>
              <span className={`mt-0.5 block truncate text-[10px] ${selectedContactId === contact.id ? 'text-white/75' : 'text-[#8a6a50]'}`}>
                {contact.role || contact.email || 'School contact'}
              </span>
            </button>
          ))}
          {visibleContacts.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-[#8a6a50]">
              {normalizedContacts.length ? 'No matching contacts.' : 'No school contacts are available.'}
            </p>
          )}
        </div>
      </aside>

      <div className="flex min-h-[34rem] min-w-0 flex-col overflow-hidden rounded-2xl border border-[#d9c5b0] bg-[#fffaf3]">
        <header className="flex items-center justify-between gap-3 border-b border-[#d9c5b0]/60 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7a4e2d]/10 text-[#7a4e2d]">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-bold text-[#3f2a1d]">{selectedContact?.name || 'Messages'}</h2>
              <p className="truncate text-[10px] text-[#8a6a50]">{selectedContact?.email || selectedContact?.role || ''}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadConversation()}
            disabled={!selectedContactId || loading}
            title="Refresh conversation"
            className="rounded-lg p-2 text-[#7a4e2d] hover:bg-[#f4ecdf] disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto bg-white/50 p-4 sm:p-6">
          {!selectedContact ? (
            <div className="flex h-full min-h-56 items-center justify-center text-center text-sm text-[#8a6a50]">
              Select a contact to open a conversation.
            </div>
          ) : loading ? (
            <div className="flex h-full min-h-56 items-center justify-center text-sm text-[#8a6a50]">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="flex h-full min-h-56 flex-col items-center justify-center text-center text-[#8a6a50]">
              <MessageSquare className="mb-3 h-8 w-8 opacity-40" />
              <p className="text-sm font-semibold">No messages yet</p>
            </div>
          ) : messages.map(message => {
            const isMine = getId(message.senderId) === currentUserId;
            return (
              <div key={message._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <article className={`max-w-[90%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${
                  isMine ? 'rounded-br-sm bg-[#7a4e2d] text-white' : 'rounded-bl-sm border border-[#d9c5b0]/70 bg-white text-[#3f2a1d]'
                }`}>
                  {!isMine && <p className="mb-1 text-[10px] font-bold text-[#7a4e2d]">{message.senderId?.name || selectedContact.name}</p>}
                  {message.subject && <p className="mb-1 text-xs font-bold">{message.subject}</p>}
                  <p className="whitespace-pre-wrap break-words text-sm">{message.message}</p>
                  <time className={`mt-2 block text-right text-[9px] ${isMine ? 'text-white/70' : 'text-[#8a6a50]'}`}>
                    {new Date(message.createdAt).toLocaleString()}
                  </time>
                </article>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSend} className="space-y-2 border-t border-[#d9c5b0]/60 bg-[#fffaf3] p-3 sm:p-4">
          <input
            value={subject}
            onChange={event => setSubject(event.target.value)}
            placeholder="Subject (optional)"
            disabled={!selectedContact || sending}
            className="w-full rounded-xl border border-[#d9c5b0] bg-white px-3 py-2 text-xs outline-none focus:border-[#7a4e2d] disabled:opacity-50"
          />
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={event => setDraft(event.target.value)}
              placeholder={selectedContact ? `Message ${selectedContact.name || 'contact'}...` : 'Select a contact first'}
              rows={2}
              maxLength={5000}
              disabled={!selectedContact || sending}
              className="min-h-12 flex-1 resize-y rounded-xl border border-[#d9c5b0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#7a4e2d] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!selectedContact || !draft.trim() || sending}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#7a4e2d] px-4 text-xs font-bold text-white transition hover:bg-[#624021] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span>{sending ? 'Sending...' : 'Send'}</span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default MessagingPanel;