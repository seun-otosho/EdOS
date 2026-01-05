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
import { Textarea } from '@/components/ui/textarea';
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
  Layers,
  Plus,
  Users,
  BookOpen,
  Edit,
  Trash2,
  ChevronRight
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

const ClassesPage = () => {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [showSectionDialog, setShowSectionDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [classesRes, teachersRes] = await Promise.all([
        academicAPI.getClasses(),
        userAPI.getTeachers()
      ]);
      setClasses(classesRes.data);
      setTeachers(teachersRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassDetails = async (classId) => {
    try {
      const res = await academicAPI.getClass(classId);
      setSelectedClass(res.data);
    } catch (error) {
      toast.error('Failed to load class details');
    }
  };

  const handleArchiveClass = async (classId) => {
    if (!window.confirm('Are you sure you want to archive this class?')) return;
    try {
      await academicAPI.archiveClass(classId);
      toast.success('Class archived');
      fetchData();
      setSelectedClass(null);
    } catch (error) {
      toast.error('Failed to archive class');
    }
  };

  return (
    <div className="space-y-6" data-testid="classes-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classes & Sections</h1>
          <p className="text-gray-600">Manage classes, sections, and student assignments</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Class
            </Button>
          </DialogTrigger>
          <DialogContent>
            <CreateClassForm
              onClose={() => setShowCreateDialog(false)}
              onSuccess={() => {
                setShowCreateDialog(false);
                fetchData();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Classes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : classes.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No classes yet</p>
              ) : (
                <div className="divide-y">
                  {classes.map((cls) => (
                    <div
                      key={cls.id}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedClass?.id === cls.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                      }`}
                      onClick={() => fetchClassDetails(cls.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{cls.name}</p>
                          <p className="text-sm text-gray-500">
                            Grade {cls.grade_level} • {cls.student_count || 0} students
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Class Details */}
        <div className="lg:col-span-2">
          {selectedClass ? (
            <ClassDetails
              classData={selectedClass}
              teachers={teachers}
              onUpdate={() => fetchClassDetails(selectedClass.id)}
              onArchive={() => handleArchiveClass(selectedClass.id)}
              onAddSection={() => setShowSectionDialog(true)}
            />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-96 text-gray-500">
                <Layers className="w-12 h-12 mb-4" />
                <p>Select a class to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add Section Dialog */}
      <Dialog open={showSectionDialog} onOpenChange={setShowSectionDialog}>
        <DialogContent>
          <CreateSectionForm
            classId={selectedClass?.id}
            teachers={teachers}
            onClose={() => setShowSectionDialog(false)}
            onSuccess={() => {
              setShowSectionDialog(false);
              fetchClassDetails(selectedClass.id);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Create Class Form
const CreateClassForm = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await academicAPI.createClass({
        ...data,
        grade_level: parseInt(data.grade_level),
        capacity: parseInt(data.capacity) || 40
      });
      toast.success('Class created successfully!');
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <DialogHeader>
        <DialogTitle>Create New Class</DialogTitle>
        <DialogDescription>Add a new class to your school</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Class Name *</Label>
          <Input
            {...register('name', { required: true })}
            placeholder="e.g., Grade 5, Class 10-A"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Grade Level *</Label>
            <Select onValueChange={(v) => setValue('grade_level', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                {[...Array(12)].map((_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>Grade {i + 1}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Capacity</Label>
            <Input
              type="number"
              {...register('capacity')}
              placeholder="40"
              defaultValue={40}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea {...register('description')} placeholder="Optional description..." />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Class'}
        </Button>
      </DialogFooter>
    </form>
  );
};

// Create Section Form
const CreateSectionForm = ({ classId, teachers, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, setValue } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await academicAPI.createSection({
        ...data,
        class_id: classId,
        capacity: parseInt(data.capacity) || 40
      });
      toast.success('Section created!');
      onSuccess();
    } catch (error) {
      toast.error('Failed to create section');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <DialogHeader>
        <DialogTitle>Add Section</DialogTitle>
        <DialogDescription>Create a new section for this class</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Section Name *</Label>
          <Input {...register('name', { required: true })} placeholder="e.g., A, B, C" />
        </div>
        <div className="space-y-2">
          <Label>Class Teacher</Label>
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
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Room Number</Label>
            <Input {...register('room_number')} placeholder="e.g., 101" />
          </div>
          <div className="space-y-2">
            <Label>Capacity</Label>
            <Input type="number" {...register('capacity')} defaultValue={40} />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Section'}
        </Button>
      </DialogFooter>
    </form>
  );
};

// Class Details Component
const ClassDetails = ({ classData, teachers, onUpdate, onArchive, onAddSection }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>{classData.name}</CardTitle>
          <CardDescription>
            Grade {classData.grade_level} • {classData.student_count || 0} students
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onAddSection}>
            <Plus className="w-4 h-4 mr-1" />
            Add Section
          </Button>
          <Button variant="destructive" size="sm" onClick={onArchive}>
            <Trash2 className="w-4 h-4 mr-1" />
            Archive
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sections">
          <TabsList>
            <TabsTrigger value="sections">Sections</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
          </TabsList>

          <TabsContent value="sections" className="mt-4">
            {classData.sections?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classData.sections.map((section) => (
                  <Card key={section.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Section {section.name}</p>
                          <p className="text-sm text-gray-500">
                            Room {section.room_number || 'TBD'}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {section.student_count || 0}/{section.capacity}
                        </Badge>
                      </div>
                      {section.teacher_name && (
                        <p className="text-sm text-gray-600 mt-2">
                          Teacher: {section.teacher_name}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No sections yet. Add a section to organize students.</p>
            )}
          </TabsContent>

          <TabsContent value="subjects" className="mt-4">
            {classData.subjects?.length > 0 ? (
              <div className="space-y-3">
                {classData.subjects.map((subject) => (
                  <div key={subject.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{subject.name}</p>
                      <p className="text-sm text-gray-500">{subject.code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{subject.teacher_name || 'No teacher'}</p>
                      <p className="text-xs text-gray-500">{subject.periods_per_week} periods/week</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No subjects assigned. Go to Subjects page to assign.</p>
            )}
          </TabsContent>

          <TabsContent value="students" className="mt-4">
            <p className="text-gray-500 text-center py-8">
              {classData.student_count || 0} students enrolled. View in Students page.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ClassesPage;
