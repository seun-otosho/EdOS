import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { academicAPI, userAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
import { BookOpen, Plus, Edit, Trash2, UserPlus } from 'lucide-react';

const SubjectsPage = () => {
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subjectsRes, classesRes, teachersRes] = await Promise.all([
        academicAPI.getSubjects(),
        academicAPI.getClasses(),
        userAPI.getTeachers()
      ]);
      setSubjects(subjectsRes.data);
      setClasses(classesRes.data);
      setTeachers(teachersRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="subjects-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
          <p className="text-gray-600">Manage subjects and assign to classes</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserPlus className="w-4 h-4 mr-2" />
                Assign to Class
              </Button>
            </DialogTrigger>
            <DialogContent>
              <AssignSubjectForm
                subjects={subjects}
                classes={classes}
                teachers={teachers}
                onClose={() => setShowAssignDialog(false)}
                onSuccess={() => {
                  setShowAssignDialog(false);
                  toast.success('Subject assigned!');
                }}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <CreateSubjectForm
                onClose={() => setShowCreateDialog(false)}
                onSuccess={() => {
                  setShowCreateDialog(false);
                  fetchData();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : subjects.length === 0 ? (
          <div className="col-span-3">
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-48 text-gray-500">
                <BookOpen className="w-12 h-12 mb-4" />
                <p>No subjects yet. Create your first subject.</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          subjects.map((subject) => (
            <Card key={subject.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{subject.name}</h3>
                      <p className="text-sm text-gray-500">{subject.code}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {subject.is_elective && (
                      <Badge variant="outline">Elective</Badge>
                    )}
                  </div>
                </div>
                {subject.description && (
                  <p className="text-sm text-gray-600 mt-3 line-clamp-2">{subject.description}</p>
                )}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-sm text-gray-500">{subject.credits} credits</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedSubject(subject);
                      setShowAssignDialog(true);
                    }}
                  >
                    Assign
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

// Create Subject Form
const CreateSubjectForm = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: { credits: 1, is_elective: false }
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await academicAPI.createSubject({
        ...data,
        credits: parseFloat(data.credits) || 1
      });
      toast.success('Subject created!');
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create subject');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <DialogHeader>
        <DialogTitle>Add New Subject</DialogTitle>
        <DialogDescription>Create a new subject for your school</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Subject Name *</Label>
          <Input {...register('name', { required: true })} placeholder="e.g., Mathematics" />
        </div>
        <div className="space-y-2">
          <Label>Subject Code *</Label>
          <Input {...register('code', { required: true })} placeholder="e.g., MATH101" />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea {...register('description')} placeholder="Subject description..." />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Credits</Label>
            <Input type="number" step="0.5" {...register('credits')} />
          </div>
          <div className="space-y-2">
            <Label>Elective Subject</Label>
            <div className="flex items-center h-10">
              <Switch
                checked={watch('is_elective')}
                onCheckedChange={(v) => setValue('is_elective', v)}
              />
            </div>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Subject'}
        </Button>
      </DialogFooter>
    </form>
  );
};

// Assign Subject Form
const AssignSubjectForm = ({ subjects, classes, teachers, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: { periods_per_week: 5 }
  });

  const selectedClassId = watch('class_id');
  const [sections, setSections] = useState([]);

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
      await academicAPI.assignSubjectToClass({
        ...data,
        periods_per_week: parseInt(data.periods_per_week) || 5
      });
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to assign subject');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <DialogHeader>
        <DialogTitle>Assign Subject to Class</DialogTitle>
        <DialogDescription>Assign a subject with teacher to a class</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Subject *</Label>
          <Select onValueChange={(v) => setValue('subject_id', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name} ({subject.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            <Label>Section (Optional)</Label>
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
          <Label>Teacher</Label>
          <Select onValueChange={(v) => setValue('teacher_id', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select teacher" />
            </SelectTrigger>
            <SelectContent>
              {teachers.map((teacher) => (
                <SelectItem key={teacher.id} value={teacher.id}>
                  {teacher.first_name} {teacher.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Periods Per Week</Label>
          <Input type="number" {...register('periods_per_week')} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Assigning...' : 'Assign Subject'}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default SubjectsPage;
