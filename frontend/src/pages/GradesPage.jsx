import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { gradesAPI, academicAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Award,
  Plus,
  FileText,
  Calendar,
  Users,
  Edit,
  Eye,
  Send
} from 'lucide-react';

const ASSIGNMENT_TYPES = [
  { value: 'homework', label: 'Homework' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'test', label: 'Test' },
  { value: 'exam', label: 'Exam' },
  { value: 'project', label: 'Project' },
  { value: 'classwork', label: 'Classwork' },
  { value: 'participation', label: 'Participation' },
];

const GradesPage = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [filters, setFilters] = useState({ class_id: '', subject_id: '' });

  const isTeacher = user?.user_type === 'teacher';
  const isAdmin = ['school_admin', 'super_admin', 'principal'].includes(user?.user_type);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (isTeacher || isAdmin) {
      fetchAssignments();
    }
  }, [filters]);

  const fetchData = async () => {
    try {
      if (isTeacher) {
        const [classesRes, subjectsRes] = await Promise.all([
          academicAPI.getMyClasses(),
          academicAPI.getSubjects()
        ]);
        setClasses(classesRes.data);
        setSubjects(subjectsRes.data);
      } else if (isAdmin) {
        const [classesRes, subjectsRes] = await Promise.all([
          academicAPI.getClasses(),
          academicAPI.getSubjects()
        ]);
        setClasses(classesRes.data);
        setSubjects(subjectsRes.data);
      }
      fetchAssignments();
    } catch (error) {
      toast.error('Failed to load data');
    }
  };

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await gradesAPI.getAssignments(filters);
      setAssignments(res.data);
    } catch (error) {
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const getTypeBadge = (type) => {
    const colors = {
      homework: 'bg-blue-100 text-blue-700',
      quiz: 'bg-purple-100 text-purple-700',
      test: 'bg-amber-100 text-amber-700',
      exam: 'bg-red-100 text-red-700',
      project: 'bg-green-100 text-green-700',
      classwork: 'bg-gray-100 text-gray-700',
      participation: 'bg-cyan-100 text-cyan-700',
    };
    return <Badge className={colors[type] || 'bg-gray-100'}>{type}</Badge>;
  };

  const getStatusBadge = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-700',
      published: 'bg-green-100 text-green-700',
      closed: 'bg-red-100 text-red-700',
      graded: 'bg-blue-100 text-blue-700',
    };
    return <Badge className={colors[status] || 'bg-gray-100'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6" data-testid="grades-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grades & Assignments</h1>
          <p className="text-gray-600">Manage assignments and student grades</p>
        </div>
        {(isTeacher || isAdmin) && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <CreateAssignmentForm
                classes={classes}
                subjects={subjects}
                onClose={() => setShowCreateDialog(false)}
                onSuccess={() => {
                  setShowCreateDialog(false);
                  fetchAssignments();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      {(isTeacher || isAdmin) && (
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="space-y-1">
                <Label>Class</Label>
                <Select
                  value={filters.class_id}
                  onValueChange={(v) => setFilters(prev => ({ ...prev, class_id: v === 'all' ? '' : v }))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Subject</Label>
                <Select
                  value={filters.subject_id}
                  onValueChange={(v) => setFilters(prev => ({ ...prev, subject_id: v === 'all' ? '' : v }))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignments List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : assignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <FileText className="w-12 h-12 mb-4" />
              <p>No assignments yet. Create your first assignment.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Class / Subject</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{assignment.title}</p>
                        <p className="text-sm text-gray-500 truncate max-w-xs">
                          {assignment.description || 'No description'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{assignment.class_name}</p>
                        <p className="text-xs text-gray-500">{assignment.subject_name}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(assignment.assignment_type)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">
                          {new Date(assignment.due_date).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(assignment.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{assignment.submission_count || 0}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(assignment.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
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

// Create Assignment Form
const CreateAssignmentForm = ({ classes, subjects, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState([]);
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      max_score: 100,
      weight: 1,
      allow_late_submission: false,
      late_penalty_percent: 0
    }
  });

  const selectedClassId = watch('class_id');

  useEffect(() => {
    if (selectedClassId) {
      fetchSections(selectedClassId);
    }
  }, [selectedClassId]);

  const fetchSections = async (classId) => {
    try {
      const res = await academicAPI.getSections(classId);
      setSections(res.data);
    } catch (error) {
      console.error('Failed to load sections');
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Combine date and time for due_date
      const dueDateTime = new Date(`${data.due_date}T${data.due_time || '23:59'}`);
      
      await gradesAPI.createAssignment({
        ...data,
        due_date: dueDateTime.toISOString(),
        max_score: parseFloat(data.max_score),
        weight: parseFloat(data.weight),
        late_penalty_percent: parseFloat(data.late_penalty_percent) || 0
      });
      toast.success('Assignment created!');
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create assignment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <DialogHeader>
        <DialogTitle>Create Assignment</DialogTitle>
        <DialogDescription>Create a new assignment for students</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-4 py-4 max-h-[60vh] overflow-y-auto">
        <div className="col-span-2 space-y-2">
          <Label>Title *</Label>
          <Input {...register('title', { required: true })} placeholder="Assignment title" />
        </div>
        
        <div className="space-y-2">
          <Label>Class *</Label>
          <Select onValueChange={(v) => setValue('class_id', v)}>
            <SelectTrigger>
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
          <div className="space-y-2">
            <Label>Section</Label>
            <Select onValueChange={(v) => setValue('section_id', v === 'all' ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder="All sections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>Section {section.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Subject *</Label>
          <Select onValueChange={(v) => setValue('subject_id', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Type *</Label>
          <Select onValueChange={(v) => setValue('assignment_type', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {ASSIGNMENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Due Date *</Label>
          <Input type="date" {...register('due_date', { required: true })} />
        </div>

        <div className="space-y-2">
          <Label>Due Time</Label>
          <Input type="time" {...register('due_time')} defaultValue="23:59" />
        </div>

        <div className="space-y-2">
          <Label>Max Score</Label>
          <Input type="number" {...register('max_score')} />
        </div>

        <div className="space-y-2">
          <Label>Weight</Label>
          <Input type="number" step="0.1" {...register('weight')} />
        </div>

        <div className="col-span-2 space-y-2">
          <Label>Description</Label>
          <Textarea {...register('description')} placeholder="Assignment description..." />
        </div>

        <div className="col-span-2 space-y-2">
          <Label>Instructions</Label>
          <Textarea {...register('instructions')} placeholder="Detailed instructions for students..." />
        </div>

        <div className="col-span-2 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={watch('allow_late_submission')}
              onCheckedChange={(v) => setValue('allow_late_submission', v)}
            />
            <Label>Allow late submissions</Label>
          </div>
          {watch('allow_late_submission') && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                {...register('late_penalty_percent')}
                className="w-20"
              />
              <span className="text-sm text-gray-500">% penalty per day</span>
            </div>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Assignment'}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default GradesPage;
