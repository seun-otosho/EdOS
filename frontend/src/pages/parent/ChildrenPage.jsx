import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { studentAPI, attendanceAPI, gradesAPI, academicAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GraduationCap,
  ClipboardCheck,
  Award,
  Calendar,
  BookOpen,
  TrendingUp,
  Clock,
  FileText,
  AlertCircle
} from 'lucide-react';

const ParentChildrenPage = () => {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState(null);
  const [gradesData, setGradesData] = useState(null);
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      fetchChildData(selectedChild.id);
    }
  }, [selectedChild]);

  const fetchChildren = async () => {
    try {
      const res = await studentAPI.getMyChildren();
      setChildren(res.data);
      if (res.data.length > 0) {
        setSelectedChild(res.data[0]);
      }
    } catch (error) {
      toast.error('Failed to load children');
    } finally {
      setLoading(false);
    }
  };

  const fetchChildData = async (studentId) => {
    try {
      // Fetch attendance
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1).toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];
      
      const [attendanceRes, gradesRes] = await Promise.all([
        attendanceAPI.getStudentAttendance(studentId, startDate, endDate).catch(() => ({ data: { records: [], summary: {} } })),
        gradesAPI.getStudentGrades(studentId).catch(() => ({ data: { subjects: [] } }))
      ]);
      
      setAttendanceData(attendanceRes.data);
      setGradesData(gradesRes.data);
    } catch (error) {
      console.error('Failed to fetch child data:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">My Children</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-gray-500">
            <GraduationCap className="w-12 h-12 mb-4" />
            <p>No children linked to your account.</p>
            <p className="text-sm">Please contact the school administrator.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="parent-children-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Children</h1>
          <p className="text-gray-600">Monitor your children's academic progress</p>
        </div>
        {children.length > 1 && (
          <Select
            value={selectedChild?.id}
            onValueChange={(v) => setSelectedChild(children.find(c => c.id === v))}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select child" />
            </SelectTrigger>
            <SelectContent>
              {children.map((child) => (
                <SelectItem key={child.id} value={child.id}>
                  {child.first_name} {child.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {selectedChild && (
        <>
          {/* Child Info Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <GraduationCap className="w-10 h-10 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">
                    {selectedChild.first_name} {selectedChild.last_name}
                  </h2>
                  <p className="text-gray-500">
                    {selectedChild.class_info?.name || 'Class not assigned'} • {selectedChild.enrollment_number}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="capitalize">{selectedChild.gender}</Badge>
                    <Badge className="bg-green-100 text-green-700">{selectedChild.status}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-3xl font-bold text-green-600">
                      {attendanceData?.summary?.attendance_percentage || 0}%
                    </p>
                    <p className="text-sm text-gray-600">Attendance</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-3xl font-bold text-blue-600">
                      {gradesData?.subjects?.length || 0}
                    </p>
                    <p className="text-sm text-gray-600">Subjects</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="grades" className="space-y-4">
            <TabsList>
              <TabsTrigger value="grades">
                <Award className="w-4 h-4 mr-2" />
                Grades
              </TabsTrigger>
              <TabsTrigger value="attendance">
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Attendance
              </TabsTrigger>
              <TabsTrigger value="schedule">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule
              </TabsTrigger>
            </TabsList>

            <TabsContent value="grades">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gradesData?.subjects?.length > 0 ? (
                  gradesData.subjects.map((subject) => (
                    <Card key={subject.subject_id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{subject.subject_name}</CardTitle>
                          <Badge
                            className={subject.average_percentage >= 70 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                          >
                            {subject.average_percentage?.toFixed(1)}%
                          </Badge>
                        </div>
                        <CardDescription>{subject.subject_code}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Progress value={subject.average_percentage || 0} className="h-2 mb-2" />
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>{subject.graded_assignments || 0} graded</span>
                          <span>{subject.total_assignments || 0} total</span>
                        </div>
                        {subject.grades?.slice(0, 3).map((grade, idx) => (
                          <div key={idx} className="flex justify-between py-2 border-t mt-2">
                            <span className="text-sm">{grade.assignment_title || 'Assessment'}</span>
                            <span className="text-sm font-medium">{grade.score}/{grade.max_score}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="col-span-2">
                    <CardContent className="flex flex-col items-center justify-center h-48 text-gray-500">
                      <Award className="w-12 h-12 mb-4" />
                      <p>No grades available yet.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="attendance">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">
                      {attendanceData?.summary?.present_days || 0}
                    </p>
                    <p className="text-sm text-gray-500">Present</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-red-600">
                      {attendanceData?.summary?.absent_days || 0}
                    </p>
                    <p className="text-sm text-gray-500">Absent</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-amber-600">
                      {attendanceData?.summary?.late_days || 0}
                    </p>
                    <p className="text-sm text-gray-500">Late</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-blue-600">
                      {attendanceData?.summary?.excused_days || 0}
                    </p>
                    <p className="text-sm text-gray-500">Excused</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                  {attendanceData?.records?.length > 0 ? (
                    <div className="space-y-2">
                      {attendanceData.records.slice(0, 10).map((record, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">
                              {new Date(record.date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                          <Badge
                            className={
                              record.status === 'present' ? 'bg-green-100 text-green-700' :
                              record.status === 'absent' ? 'bg-red-100 text-red-700' :
                              record.status === 'late' ? 'bg-amber-100 text-amber-700' :
                              'bg-blue-100 text-blue-700'
                            }
                          >
                            {record.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No attendance records yet.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schedule">
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-48 text-gray-500">
                  <Calendar className="w-12 h-12 mb-4" />
                  <p>Schedule view coming soon.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default ParentChildrenPage;
