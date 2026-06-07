'use client';

import { useState } from 'react';
import { useSellerVerification } from '@/hooks/useSellerVerification';
import { VerificationPanel } from '@/components/seller';

export default function SellerDashboardPage() {
  const {
    user,
    status,
    rejectionReason,
    isLoadingVerification,
    toast,
    handleUpload,
    notifications,
    unreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useSellerVerification();

  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <div className="p-8 flex flex-col gap-8 max-w-[800px] w-full mx-auto">
      {toast && (
        <div
          className={`fixed bottom-8 right-8 p-4 rounded-md font-body text-sm font-medium text-white shadow-lg z-50
            ${toast.type === 'success' ? 'bg-success' : 'bg-danger'}`}
        >
          {toast.message}
        </div>
      )}

      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl text-text">Account Verification</h1>
          <span className="font-body text-sm text-text/60">{user?.email}</span>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-md hover:bg-white/10 transition-colors"
            title="Notifications"
          >
            <span className="text-xl">🔔</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-danger text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-primary border border-white/10 rounded-md shadow-lg z-50 overflow-hidden">
              <div className="p-3 border-b border-white/10 flex items-center justify-between">
                <span className="font-semibold text-white text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => { void markAllNotificationsAsRead(); }}
                    className="text-xs text-white/50 hover:text-white/80 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-white/40 text-sm">No notifications yet</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${!n.is_read ? 'bg-white/5' : ''}`}
                      onClick={() => {
                        if (!n.is_read) {
                          void markNotificationAsRead(n.id);
                        }
                      }}
                    >
                      <div className="flex items-start gap-2">
                        {!n.is_read && <span className="w-2 h-2 mt-1.5 rounded-full bg-secondary flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{n.title}</p>
                          <p className="text-xs text-white/60 mt-0.5 line-clamp-2">{n.message}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <div>
        {isLoadingVerification ? (
          <div className="bg-primary rounded-md p-6 animate-pulse min-h-[200px]" />
        ) : (
          <VerificationPanel
            status={status}
            rejectionReason={rejectionReason}
            onUpload={handleUpload}
          />
        )}
      </div>
    </div>
  );
}
