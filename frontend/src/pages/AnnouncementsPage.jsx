import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { communicationAPI, academicAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Bell,
  Plus,
  Pin,
  Calendar,
  Users,
  Edit,
  Trash2,
  Megaphone,
  AlertTriangle,
  Info
} from 'lucide-react';

const PRIORITY_CONFIG = {
  low: { color: 'bg-gray-100 text-gray-700', label: 'Low' },
  normal: { color: 'bg-blue-100 text-blue-700', label: 'Normal' },
  high: { color: 'bg-amber-100 text-amber-700', label: 'High' },
  urgent: { color: 'bg-red-100 text-red-700', label: 'Urgent' },
};

const AUDIENCE_CONFIG = {
  all: { label: 'Everyone', icon: Users },
  teachers: { label: 'Teachers Only', icon: Users },
  parents: { label: 'Parents Only', icon: Users },
  students: { label: 'Students Only', icon: Users },
  specific_class: { label: 'Specific Classes', icon: Users },
};

const AnnouncementsPage = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const canCreate = ['school_admin', 'super_admin', 'principal', 'teacher'].includes(user?.user_type);
  const canDelete = ['school_admin', 'super_admin', 'principal'].includes(user?.user_type);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await communicationAPI.getAnnouncements();
      setAnnouncements(res.data);
    } catch (error) {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await communicationAPI.deleteAnnouncement(id);
      toast.success('Announcement deleted');
      fetchAnnouncements();
    } catch (error) {
      toast.error('Failed to delete announcement');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="announcements-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-600">School-wide announcements and updates</p>
        </div>
        {canCreate && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <AnnouncementForm
                onClose={() => setShowCreateDialog(false)}
                onSuccess={() => {
                  setShowCreateDialog(false);
                  fetchAnnouncements();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Megaphone className="w-12 h-12 mb-4" />
            <p>No announcements yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Pinned Announcements */}
          {announcements.filter(a => a.is_pinned).length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Pin className="w-4 h-4" />
                Pinned
              </h2>
              {announcements.filter(a => a.is_pinned).map((announcement) => (
                <AnnouncementCard
                  key={announcement.id}
                  announcement={announcement}
                  canDelete={canDelete}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {/* Regular Announcements */}
          <div className="space-y-4">
            {announcements.filter(a => a.is_pinned).length > 0 && (
              <h2 className="text-lg font-semibold">Recent</h2>
            )}
            {announcements.filter(a => !a.is_pinned).map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                canDelete={canDelete}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Announcement Card
const AnnouncementCard = ({ announcement, canDelete, onDelete }) => {
  const priorityConfig = PRIORITY_CONFIG[announcement.priority] || PRIORITY_CONFIG.normal;

  return (
    <Card className={announcement.is_pinned ? 'border-l-4 border-l-blue-500' : ''}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {announcement.is_pinned && (
                <Pin className="w-4 h-4 text-blue-600" />
              )}
              {announcement.priority === 'urgent' && (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              )}
              <h3 className="text-lg font-semibold">{announcement.title}</h3>
            </div>
            <p className="text-gray-600 whitespace-pre-wrap">{announcement.content}</p>
            <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(announcement.published_at || announcement.created_at).toLocaleDateString()}
              </span>
              <span>By {announcement.creator_name}</span>
              <Badge className={priorityConfig.color}>{priorityConfig.label}</Badge>
              <Badge variant="outline">
                {AUDIENCE_CONFIG[announcement.audience]?.label || announcement.audience}
              </Badge>
            </div>
          </div>
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(announcement.id)}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Announcement Form
const AnnouncementForm = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      priority: 'normal',
      audience: 'all',
      is_pinned: false,
      is_published: true
    }
  });

  const selectedAudience = watch('audience');

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await academicAPI.getClasses();
      setClasses(res.data);
    } catch (error) {
      console.error('Failed to load classes');
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await communicationAPI.createAnnouncement(data);
      toast.success('Announcement created!');
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create announcement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <DialogHeader>
        <DialogTitle>Create Announcement</DialogTitle>
        <DialogDescription>Post an announcement to the school community</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
        <div className="space-y-2">
          <Label>Title *</Label>
          <Input {...register('title', { required: true })} placeholder="Announcement title" />
        </div>

        <div className="space-y-2">
          <Label>Content *</Label>
          <Textarea
            {...register('content', { required: true })}
            placeholder="Write your announcement..."
            rows={6}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select defaultValue="normal" onValueChange={(v) => setValue('priority', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Audience</Label>
            <Select defaultValue="all" onValueChange={(v) => setValue('audience', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everyone</SelectItem>
                <SelectItem value="teachers">Teachers Only</SelectItem>
                <SelectItem value="parents">Parents Only</SelectItem>
                <SelectItem value="students">Students Only</SelectItem>
                <SelectItem value="specific_class">Specific Classes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedAudience === 'specific_class' && (
          <div className="space-y-2">
            <Label>Select Classes</Label>
            <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto p-2 bg-gray-50 rounded-lg">
              {classes.map((cls) => (
                <label key={cls.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    value={cls.id}
                    onChange={(e) => {
                      const currentIds = watch('target_class_ids') || [];
                      if (e.target.checked) {
                        setValue('target_class_ids', [...currentIds, cls.id]);
                      } else {
                        setValue('target_class_ids', currentIds.filter(id => id !== cls.id));
                      }
                    }}
                  />
                  {cls.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch
              checked={watch('is_pinned')}
              onCheckedChange={(v) => setValue('is_pinned', v)}
            />
            <Label>Pin to top</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={watch('is_published')}
              onCheckedChange={(v) => setValue('is_published', v)}
            />
            <Label>Publish immediately</Label>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Announcement'}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default AnnouncementsPage;
