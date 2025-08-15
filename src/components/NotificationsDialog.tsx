
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState } from 'react';
import axiosInstance from '@/lib/axios';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationsDialog = ({ isOpen, onClose }: NotificationsDialogProps) => {
  const { userRole } = useAuth();
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; description: string; createdAt: string; type: string }>>([]);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return; // Skip if not authenticated yet
      const resp = await axiosInstance.get('/notifications');
      if (resp.data?.success) {
        const list = Array.isArray(resp.data.notifications) ? resp.data.notifications : (resp.data.data || []);
        const mapped = list.map((n: any) => ({
          id: n._id || n.id,
          title: n.title,
          description: n.message || n.description,
          createdAt: n.createdAt,
          type: n.type || 'system'
        }));
        setNotifications(mapped);
        // propagate unread count to layout badge via localStorage event
        const count = Number(resp.data.unreadCount || 0);
        localStorage.setItem('unread_notifications_count', String(count));
        window.dispatchEvent(new StorageEvent('storage', { key: 'unread_notifications_count', newValue: String(count) }));
      }
    } catch (e) {
      // silent fail
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [userRole, isOpen]);

  // When opened, mark all as read on clear
  const clearAll = async () => {
    try {
      await axiosInstance.patch('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => n));
      localStorage.setItem('unread_notifications_count', '0');
      window.dispatchEvent(new StorageEvent('storage', { key: 'unread_notifications_count', newValue: '0' }));
      onClose();
    } catch {}
  };

  useEffect(() => {
    let socket: Socket | null = null;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const namespace = userRole === 'student' ? '/student' : userRole === 'hostel-incharge' ? '/hostel-incharge' : userRole === 'floor-incharge' ? '/floor-incharge' : '/warden';
      socket = io(`http://localhost:5000${namespace}`, {
        auth: { token },
        path: '/socket.io'
      });
      socket.on('notification', (n: any) => {
        setNotifications(prev => [{ id: n.id || Math.random().toString(), title: n.title, description: n.message || n.description, createdAt: n.createdAt || new Date().toISOString(), type: n.type || 'system' }, ...prev]);
      });
    } catch {}
    return () => { try { socket?.disconnect(); } catch {} };
  }, [userRole, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Notifications</DialogTitle>
            <button onClick={clearAll} className="text-xs px-2 py-1 rounded border hover:bg-gray-50">Clear</button>
          </div>
        </DialogHeader>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="rounded-lg border p-4 hover:bg-gray-50 transition-colors"
              >
                <h4 className="text-sm font-medium">{notification.title}</h4>
                <p className="text-sm text-gray-500 mt-1">
                  {notification.description}
                </p>
                <span className="text-xs text-gray-400 mt-2 block">
                  {new Date(notification.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationsDialog;
