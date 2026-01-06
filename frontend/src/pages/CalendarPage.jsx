import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { communicationAPI, schoolAPI } from '@/services/api';
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
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Users
} from 'lucide-react';

const EVENT_TYPES = [
  { value: 'assembly', label: 'Assembly', color: 'bg-blue-100 text-blue-700' },
  { value: 'exam', label: 'Exam', color: 'bg-red-100 text-red-700' },
  { value: 'holiday', label: 'Holiday', color: 'bg-green-100 text-green-700' },
  { value: 'meeting', label: 'Meeting', color: 'bg-purple-100 text-purple-700' },
  { value: 'sports', label: 'Sports', color: 'bg-amber-100 text-amber-700' },
  { value: 'cultural', label: 'Cultural', color: 'bg-pink-100 text-pink-700' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-700' },
];

const CalendarPage = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const canCreate = ['school_admin', 'super_admin', 'principal', 'teacher'].includes(user?.user_type);

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const [eventsRes, holidaysRes] = await Promise.all([
        communicationAPI.getEvents({
          start_date: startOfMonth.toISOString(),
          end_date: endOfMonth.toISOString()
        }),
        schoolAPI.getHolidays().catch(() => ({ data: [] }))
      ]);

      setEvents(eventsRes.data);
      setHolidays(holidaysRes.data);
    } catch (error) {
      toast.error('Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const getEventsForDay = (day) => {
    if (!day) return [];
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
    return events.filter(e => e.start_datetime.startsWith(dateStr));
  };

  const isHoliday = (day) => {
    if (!day) return false;
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
    return holidays.some(h => h.date === dateStr);
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() &&
           currentDate.getMonth() === today.getMonth() &&
           currentDate.getFullYear() === today.getFullYear();
  };

  const navigateMonth = (direction) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="calendar-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">School Calendar</h1>
          <p className="text-gray-600">View events, holidays, and important dates</p>
        </div>
        {canCreate && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <EventForm
                onClose={() => setShowCreateDialog(false)}
                onSuccess={() => {
                  setShowCreateDialog(false);
                  fetchData();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => navigateMonth(-1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <CardTitle>
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigateMonth(1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map((day) => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth().map((day, idx) => {
                const dayEvents = getEventsForDay(day);
                const holiday = isHoliday(day);
                const today = isToday(day);

                return (
                  <div
                    key={idx}
                    className={`min-h-[80px] p-1 border rounded-lg cursor-pointer transition-colors ${
                      day ? 'hover:bg-gray-50' : 'bg-gray-50'
                    } ${
                      today ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    } ${
                      holiday ? 'bg-green-50' : ''
                    } ${
                      selectedDate === day ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => day && setSelectedDate(day)}
                  >
                    {day && (
                      <>
                        <div className={`text-sm font-medium mb-1 ${
                          today ? 'text-blue-600' : holiday ? 'text-green-600' : 'text-gray-900'
                        }`}>
                          {day}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 2).map((event, i) => {
                            const typeConfig = EVENT_TYPES.find(t => t.value === event.event_type);
                            return (
                              <div
                                key={i}
                                className={`text-xs px-1 py-0.5 rounded truncate ${typeConfig?.color || 'bg-gray-100'}`}
                              >
                                {event.title}
                              </div>
                            );
                          })}
                          {dayEvents.length > 2 && (
                            <div className="text-xs text-gray-500">+{dayEvents.length - 2} more</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Events List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedDate
                ? `Events on ${monthNames[currentDate.getMonth()]} ${selectedDate}`
                : 'Upcoming Events'
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDate ? (
              <div className="space-y-3">
                {getEventsForDay(selectedDate).length > 0 ? (
                  getEventsForDay(selectedDate).map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No events on this day</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {events.slice(0, 5).map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
                {events.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No events this month</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            {EVENT_TYPES.map((type) => (
              <div key={type.value} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${type.color}`}></div>
                <span className="text-sm">{type.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-100 border border-green-300"></div>
              <span className="text-sm">Holiday</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Event Card
const EventCard = ({ event }) => {
  const typeConfig = EVENT_TYPES.find(t => t.value === event.event_type);

  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{event.title}</p>
          {event.description && (
            <p className="text-sm text-gray-600 mt-1">{event.description}</p>
          )}
        </div>
        <Badge className={typeConfig?.color || 'bg-gray-100'}>
          {typeConfig?.label || event.event_type}
        </Badge>
      </div>
      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date(event.start_datetime).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
        {event.location && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {event.location}
          </span>
        )}
      </div>
    </div>
  );
};

// Event Form
const EventForm = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      event_type: 'other',
      is_all_day: false,
      target_audience: 'all'
    }
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Combine date and time
      const startDateTime = new Date(`${data.start_date}T${data.start_time || '09:00'}`);
      const endDateTime = data.end_date
        ? new Date(`${data.end_date}T${data.end_time || '10:00'}`)
        : null;

      await communicationAPI.createEvent({
        ...data,
        start_datetime: startDateTime.toISOString(),
        end_datetime: endDateTime?.toISOString()
      });
      toast.success('Event created!');
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <DialogHeader>
        <DialogTitle>Add Event</DialogTitle>
        <DialogDescription>Create a new calendar event</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Title *</Label>
          <Input {...register('title', { required: true })} placeholder="Event title" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Event Type</Label>
            <Select defaultValue="other" onValueChange={(v) => setValue('event_type', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input {...register('location')} placeholder="e.g., Main Hall" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start Date *</Label>
            <Input type="date" {...register('start_date', { required: true })} />
          </div>
          <div className="space-y-2">
            <Label>Start Time</Label>
            <Input type="time" {...register('start_time')} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>End Date</Label>
            <Input type="date" {...register('end_date')} />
          </div>
          <div className="space-y-2">
            <Label>End Time</Label>
            <Input type="time" {...register('end_time')} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea {...register('description')} placeholder="Event description..." />
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={watch('is_all_day')}
            onCheckedChange={(v) => setValue('is_all_day', v)}
          />
          <Label>All day event</Label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Event'}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default CalendarPage;
