import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, MessageSquare } from 'lucide-react';
import { messageService } from '../services/api';

const getId = (value) => String(value?._id || value?.id || value || '');

const MessageNotifications = ({ onOpenMessages, onOpenConversation }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const [countResponse, inboxResponse] = await Promise.all([
        messageService.getUnreadCount(),
        messageService.getInbox({ limit: 8, isRead: false }),
      ]);
      setUnreadCount(countResponse.data.unreadCount || 0);
      setNotifications(inboxResponse.data.messages || []);
    } catch {
      setUnreadCount(0);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 15000);
    return () => window.clearInterval(intervalId);
  }, [loadNotifications]);

  useEffect(() => {
    window.addEventListener('school-messages-updated', loadNotifications);
    return () => window.removeEventListener('school-messages-updated', loadNotifications);
  }, [loadNotifications]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!dropdownRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [isOpen]);

  const unreadBadge = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <div className="flex shrink-0 items-center gap-2" ref={dropdownRef}>
      <button
        type="button"
        onClick={onOpenMessages}
        title="Open messages"
        aria-label={`Open messages${unreadCount ? `, ${unreadCount} unread` : ''}`}
        className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-[#d9c5b0] bg-white text-[#7a4e2d] shadow-sm transition hover:bg-[#fffaf3]"
      >
        <MessageSquare className="h-5 w-5" />
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-500" />}
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(open => !open)}
          title="Notifications"
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread messages` : ''}`}
          aria-expanded={isOpen}
          className={`relative flex h-11 w-11 items-center justify-center rounded-xl border border-[#d9c5b0] bg-white text-[#7a4e2d] shadow-sm transition hover:bg-[#fffaf3] ${isOpen ? 'ring-2 ring-[#7a4e2d]/20' : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-2 -top-2 flex min-h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-yellow-400 px-1.5 text-[11px] font-black leading-none text-[#1f1b16] shadow-sm">
              {unreadBadge}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 top-14 z-[80] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#d9c5b0] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#d9c5b0]/60 px-4 py-3">
              <div>
                <h2 className="text-sm font-black text-[#3f2a1d]">Notifications</h2>
                <p className="text-[10px] text-[#8a6a50]">Unread messages</p>
              </div>
              <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700">
                {unreadCount} unread
              </span>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {loading && notifications.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-[#8a6a50]">Loading notifications...</p>
              ) : notifications.length === 0 ? (
                <p className="px-3 py-7 text-center text-xs text-[#8a6a50]">You’re all caught up.</p>
              ) : notifications.map(notification => (
                <button
                  key={notification._id}
                  type="button"
                  onClick={() => {
                    const senderId = getId(notification.senderId);
                    setIsOpen(false);
                    if (senderId) onOpenConversation(senderId);
                  }}
                  className="mb-1 block w-full rounded-xl p-3 text-left transition hover:bg-[#f4ecdf]"
                >
                  <span className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#7a4e2d]/10 text-[#7a4e2d]">
                      <MessageSquare className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-bold text-[#3f2a1d]">
                          {notification.senderId?.name || 'New message'}
                        </span>
                        <time className="shrink-0 text-[9px] text-[#8a6a50]">
                          {new Date(notification.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </time>
                      </span>
                      {notification.subject && (
                        <span className="mt-0.5 block truncate text-[10px] font-semibold text-[#7a4e2d]">
                          {notification.subject}
                        </span>
                      )}
                      <span className="mt-0.5 block line-clamp-2 text-[10px] leading-relaxed text-[#6d4c35]">
                        {notification.message}
                      </span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenMessages();
              }}
              className="w-full border-t border-[#d9c5b0]/60 px-4 py-3 text-center text-xs font-bold text-[#7a4e2d] transition hover:bg-[#fffaf3]"
            >
              Open messages
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageNotifications;