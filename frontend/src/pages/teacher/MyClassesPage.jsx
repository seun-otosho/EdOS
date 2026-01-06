import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { academicAPI, attendanceAPI, gradesAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen,
  Users,
  ClipboardCheck,
  Award,
  Calendar,
  ChevronRight,
  Clock
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TeacherMyClassesPage = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await academicAPI.getMyClasses();
      setClasses(res.data);
      if (res.data.length > 0) {
        setSelectedClass(res.data[0]);
        fetchClassStudents(res.data[0].id);
      }
    } catch (error) {
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassStudents = async (classId, sectionId) => {
    try {
      const res = await academicAPI.getClassStudents(classId, sectionId);
      setClassStudents(res.data);
    } catch (error) {
      console.error('Failed to load students');
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
    <div className="space-y-6" data-testid="teacher-classes-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Classes</h1>
          <p className="text-gray-600">View and manage your assigned classes</p>
        </div>
      </div>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-gray-500">
            <BookOpen className="w-12 h-12 mb-4" />
            <p>No classes assigned to you yet.</p>
            <p className="text-sm">Contact your administrator to get class assignments.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Class List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assigned Classes</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {classes.map((cls) => (
                    <div
                      key={cls.id}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedClass?.id === cls.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                      }`}
                      onClick={() => {
                        setSelectedClass(cls);
                        fetchClassStudents(cls.id);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{cls.name}</p>
                          <p className="text-sm text-gray-500">
                            {cls.student_count || 0} students
                          </p>
                          {cls.subjects && cls.subjects.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {cls.subjects.slice(0, 3).map((subj, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {subj.name}
                                </Badge>
                              ))}
                              {cls.subjects.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{cls.subjects.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Class Details */}
          <div className="lg:col-span-2">
            {selectedClass ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedClass.name}</CardTitle>
                      <CardDescription>
                        {selectedClass.student_count || 0} students enrolled
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => navigate('/attendance')}
                      >
                        <ClipboardCheck className="w-4 h-4 mr-2" />
                        Take Attendance
                      </Button>
                      <Button onClick={() => navigate('/gradebook')}>
                        <Award className="w-4 h-4 mr-2" />
                        Gradebook
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="students">
                    <TabsList>
                      <TabsTrigger value="students">
                        <Users className="w-4 h-4 mr-2" />
                        Students
                      </TabsTrigger>
                      <TabsTrigger value="subjects">
                        <BookOpen className="w-4 h-4 mr-2" />
                        Subjects
                      </TabsTrigger>
                      <TabsTrigger value="sections">
                        <Calendar className="w-4 h-4 mr-2" />
                        Sections
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="students" className="mt-4">
                      {classStudents.length > 0 ? (
                        <div className="space-y-2">
                          {classStudents.map((student, idx) => (
                            <div
                              key={student.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-700">
                                  {idx + 1}
                                </div>
                                <div>
                                  <p className="font-medium">
                                    {student.first_name} {student.last_name}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {student.enrollment_number}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="outline">{student.gender}</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-8">
                          No students enrolled in this class.
                        </p>
                      )}
                    </TabsContent>

                    <TabsContent value="subjects" className="mt-4">
                      {selectedClass.subjects && selectedClass.subjects.length > 0 ? (
                        <div className="space-y-3">
                          {selectedClass.subjects.map((subject) => (
                            <div
                              key={subject.id}
                              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                            >
                              <div>
                                <p className="font-medium">{subject.name}</p>
                                <p className="text-sm text-gray-500">{subject.code}</p>
                              </div>
                              <Badge>{subject.credits} credits</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-8">
                          No subjects assigned.
                        </p>
                      )}
                    </TabsContent>

                    <TabsContent value="sections" className="mt-4">
                      {selectedClass.sections && selectedClass.sections.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                          {selectedClass.sections.map((section) => (
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
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-8">
                          No sections defined.
                        </p>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <BookOpen className="w-12 h-12 mb-4" />
                  <p>Select a class to view details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherMyClassesPage;
