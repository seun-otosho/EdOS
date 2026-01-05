import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { studentAPI, academicAPI, userAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import {
  GraduationCap,
  UserPlus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Upload,
  Eye,
  Link as LinkIcon
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const StudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ class_id: '', search: '' });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentSheet, setShowStudentSheet] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [filters, pagination.page]);

  const fetchClasses = async () => {
    try {
      const res = await academicAPI.getClasses();
      setClasses(res.data);
    } catch (error) {
      console.error('Failed to load classes');
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await studentAPI.getStudents({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      });
      setStudents(res.data.data);
      setPagination(prev => ({ ...prev, total: res.data.total }));
    } catch (error) {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudent = async (student) => {
    try {
      const res = await studentAPI.getStudent(student.id);
      setSelectedStudent(res.data);
      setShowStudentSheet(true);
    } catch (error) {
      toast.error('Failed to load student details');
    }
  };

  const handleDeactivate = async (studentId) => {
    if (!window.confirm('Are you sure you want to deactivate this student?')) return;
    try {
      await studentAPI.deactivateStudent(studentId);
      toast.success('Student deactivated');
      fetchStudents();
    } catch (error) {
      toast.error('Failed to deactivate student');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
      graduated: 'bg-blue-100 text-blue-700',
      transferred: 'bg-amber-100 text-amber-700',
      withdrawn: 'bg-red-100 text-red-700',
    };
    return <Badge className={colors[status] || 'bg-gray-100'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6" data-testid="students-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-600">Manage student records</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <CreateStudentForm
                classes={classes}
                onClose={() => setShowCreateDialog(false)}
                onSuccess={() => {
                  setShowCreateDialog(false);
                  fetchStudents();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search students..."
                className="pl-10"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            <Select
              value={filters.class_id}
              onValueChange={(v) => setFilters(prev => ({ ...prev, class_id: v === 'all' ? '' : v }))}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Enrollment #</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <GraduationCap className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{student.first_name} {student.last_name}</p>
                          <p className="text-sm text-gray-500">{student.email || 'No email'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{student.enrollment_number}</TableCell>
                    <TableCell>
                      {classes.find(c => c.id === student.class_id)?.name || 'Not assigned'}
                    </TableCell>
                    <TableCell className="capitalize">{student.gender}</TableCell>
                    <TableCell>{getStatusBadge(student.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewStudent(student)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <LinkIcon className="w-4 h-4 mr-2" />
                            Link Parent
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeactivate(student.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {students.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No students found. Add your first student to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.total > pagination.limit && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={pagination.page === 1}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={pagination.page * pagination.limit >= pagination.total}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          >
            Next
          </Button>
        </div>
      )}

      {/* Student Details Sheet */}
      <StudentDetailsSheet
        student={selectedStudent}
        open={showStudentSheet}
        onClose={() => setShowStudentSheet(false)}
        classes={classes}
      />
    </div>
  );
};

// Create Student Form
const CreateStudentForm = ({ classes, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await studentAPI.createStudent(data);
      toast.success('Student created successfully!');
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create student');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <DialogHeader>
        <DialogTitle>Add New Student</DialogTitle>
        <DialogDescription>Enter student information</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-4 py-4">
        <div className="space-y-2">
          <Label>First Name *</Label>
          <Input {...register('first_name', { required: true })} />
        </div>
        <div className="space-y-2">
          <Label>Last Name *</Label>
          <Input {...register('last_name', { required: true })} />
        </div>
        <div className="space-y-2">
          <Label>Date of Birth *</Label>
          <Input type="date" {...register('date_of_birth', { required: true })} />
        </div>
        <div className="space-y-2">
          <Label>Gender *</Label>
          <Select onValueChange={(v) => setValue('gender', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" {...register('email')} />
        </div>
        <div className="space-y-2">
          <Label>Phone Number</Label>
          <Input {...register('phone_number')} />
        </div>
        <div className="space-y-2">
          <Label>Class</Label>
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
        <div className="space-y-2">
          <Label>City</Label>
          <Input {...register('city')} />
        </div>
        <div className="col-span-2 space-y-2">
          <Label>Address</Label>
          <Input {...register('address')} />
        </div>
        <div className="col-span-2 space-y-2">
          <Label>Previous School</Label>
          <Input {...register('previous_school')} placeholder="Name of previous school (if any)" />
        </div>
        <div className="col-span-2 space-y-2">
          <Label>Admission Notes</Label>
          <Textarea {...register('admission_notes')} placeholder="Any additional notes..." />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Student'}
        </Button>
      </DialogFooter>
    </form>
  );
};

// Student Details Sheet
const StudentDetailsSheet = ({ student, open, onClose, classes }) => {
  if (!student) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p>{student.first_name} {student.last_name}</p>
              <p className="text-sm font-normal text-gray-500">{student.enrollment_number}</p>
            </div>
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="info" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="parents">Parents</TabsTrigger>
            <TabsTrigger value="medical">Medical</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Date of Birth</p>
                <p className="font-medium">{new Date(student.date_of_birth).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Gender</p>
                <p className="font-medium capitalize">{student.gender}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Class</p>
                <p className="font-medium">
                  {student.class_info?.name || classes.find(c => c.id === student.class_id)?.name || 'Not assigned'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Enrollment Date</p>
                <p className="font-medium">{new Date(student.enrollment_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{student.email || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{student.phone_number || 'Not provided'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-medium">{student.address || 'Not provided'}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="parents" className="space-y-4 mt-4">
            {student.parents?.length > 0 ? (
              student.parents.map((parent, idx) => (
                <Card key={idx}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{parent.first_name} {parent.last_name}</p>
                        <p className="text-sm text-gray-500">{parent.email}</p>
                        <p className="text-sm text-gray-500 capitalize">{parent.relationship}</p>
                      </div>
                      {parent.is_primary_contact && (
                        <Badge>Primary</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No parents linked</p>
            )}
          </TabsContent>

          <TabsContent value="medical" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Blood Type</p>
                <p className="font-medium">{student.medical_info?.blood_type || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Allergies</p>
                <p className="font-medium">
                  {student.medical_info?.allergies?.length > 0
                    ? student.medical_info.allergies.join(', ')
                    : 'None reported'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Medical Conditions</p>
                <p className="font-medium">
                  {student.medical_info?.medical_conditions?.length > 0
                    ? student.medical_info.medical_conditions.join(', ')
                    : 'None reported'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Special Needs</p>
                <p className="font-medium">{student.medical_info?.special_needs || 'None'}</p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Emergency Contacts</CardTitle>
              </CardHeader>
              <CardContent>
                {student.emergency_contacts?.length > 0 ? (
                  student.emergency_contacts.map((contact, idx) => (
                    <div key={idx} className="flex justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-gray-500">{contact.relationship}</p>
                      </div>
                      <p className="text-sm">{contact.phone_number}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No emergency contacts</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default StudentsPage;
