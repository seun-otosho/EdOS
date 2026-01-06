import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { attendanceAPI, academicAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ClipboardCheck,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Save
} from 'lucide-react';

const ATTENDANCE_STATUSES = [
  { value: 'present', label: 'Present', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  { value: 'absent', label: 'Absent', color: 'bg-red-100 text-red-700', icon: XCircle },
  { value: 'late', label: 'Late', color: 'bg-amber-100 text-amber-700', icon: Clock },
  { value: 'excused', label: 'Excused', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
  { value: 'medical', label: 'Medical', color: 'bg-purple-100 text-purple-700', icon: AlertCircle },
];

const AttendancePage = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState({});

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchSections(selectedClass);
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass && selectedDate) {
      fetchAttendance();
    }
  }, [selectedClass, selectedSection, selectedDate]);

  const fetchClasses = async () => {
    try {
      let res;
      if (user?.user_type === 'teacher') {
        res = await academicAPI.getMyClasses();
      } else {
        res = await academicAPI.getClasses();
      }
      setClasses(res.data);
      if (res.data.length > 0) {
        setSelectedClass(res.data[0].id);
      }
    } catch (error) {
      toast.error('Failed to load classes');
    }
  };

  const fetchSections = async (classId) => {
    try {
      const res = await academicAPI.getSections(classId);
      setSections(res.data);
    } catch (error) {
      console.error('Failed to load sections');
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await attendanceAPI.getClassAttendance(
        selectedClass,
        selectedDate,
        selectedSection || undefined
      );
      setAttendanceData(res.data);
      
      // Initialize attendance records
      const records = {};
      res.data.forEach(student => {
        records[student.student_id] = student.status || 'present';
      });
      setAttendanceRecords(records);
    } catch (error) {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId, status) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      const records = Object.entries(attendanceRecords).map(([studentId, status]) => ({
        student_id: studentId,
        status: status
      }));

      await attendanceAPI.bulkMarkAttendance({
        class_id: selectedClass,
        section_id: selectedSection || undefined,
        date: selectedDate,
        attendance_type: 'daily',
        records: records
      });

      toast.success('Attendance saved successfully!');
      fetchAttendance();
    } catch (error) {
      toast.error('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const markAllPresent = () => {
    const records = {};
    attendanceData.forEach(student => {
      records[student.student_id] = 'present';
    });
    setAttendanceRecords(records);
  };

  const getStatusBadge = (status) => {
    const statusInfo = ATTENDANCE_STATUSES.find(s => s.value === status);
    if (!statusInfo) return <Badge>{status}</Badge>;
    return (
      <Badge className={statusInfo.color}>
        {statusInfo.label}
      </Badge>
    );
  };

  // Calculate summary
  const summary = {
    total: attendanceData.length,
    present: Object.values(attendanceRecords).filter(s => s === 'present').length,
    absent: Object.values(attendanceRecords).filter(s => s === 'absent').length,
    late: Object.values(attendanceRecords).filter(s => s === 'late').length,
    excused: Object.values(attendanceRecords).filter(s => ['excused', 'medical'].includes(s)).length,
  };

  return (
    <div className="space-y-6" data-testid="attendance-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-600">Mark and manage student attendance</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {sections.length > 0 && (
              <div className="space-y-1">
                <Label>Section</Label>
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Sections</SelectItem>
                    {sections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>Section {section.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label>Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40"
              />
            </div>

            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={markAllPresent}>
                Mark All Present
              </Button>
              <Button onClick={handleSaveAttendance} disabled={saving || attendanceData.length === 0}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Attendance'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{summary.total}</p>
            <p className="text-sm text-gray-500">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{summary.present}</p>
            <p className="text-sm text-gray-500">Present</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{summary.absent}</p>
            <p className="text-sm text-gray-500">Absent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{summary.late}</p>
            <p className="text-sm text-gray-500">Late</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{summary.excused}</p>
            <p className="text-sm text-gray-500">Excused</p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : attendanceData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Users className="w-12 h-12 mb-4" />
              <p>No students found. Select a class to mark attendance.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Enrollment #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Quick Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceData.map((student, idx) => (
                  <TableRow key={student.student_id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-700">
                          {student.student_name?.charAt(0)}
                        </div>
                        <span className="font-medium">{student.student_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{student.enrollment_number}</TableCell>
                    <TableCell>
                      <Select
                        value={attendanceRecords[student.student_id] || 'present'}
                        onValueChange={(v) => handleStatusChange(student.student_id, v)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ATTENDANCE_STATUSES.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {ATTENDANCE_STATUSES.slice(0, 3).map((status) => (
                          <Button
                            key={status.value}
                            variant={attendanceRecords[student.student_id] === status.value ? 'default' : 'outline'}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => handleStatusChange(student.student_id, status.value)}
                          >
                            <status.icon className="w-4 h-4" />
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendancePage;
