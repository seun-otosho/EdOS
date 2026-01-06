import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { dashboardAPI, gradesAPI, attendanceAPI, academicAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GraduationCap,
  ClipboardCheck,
  Award,
  Calendar,
  BookOpen,
  Clock,
  FileText,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';

const StudentPortalPage = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [gradesData, setGradesData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dashRes, gradesRes] = await Promise.all([
        dashboardAPI.getStudentDashboard(),
        gradesAPI.getMyGrades().catch(() => ({ data: { subjects: [] } }))
      ]);
      setDashboardData(dashRes.data);
      setGradesData(gradesRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const student = dashboardData?.student;

  if (!student) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Student Portal</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-gray-500">
            <GraduationCap className="w-12 h-12 mb-4" />
            <p>Student profile not found.</p>
            <p className="text-sm">Please contact your administrator.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="student-portal-page">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
            <GraduationCap className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Welcome, {student.first_name}!</h1>
            <p className="opacity-90">
              {student.class_info?.name || 'Class not assigned'} • {student.enrollment_number}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Attendance</p>
                <p className="text-2xl font-bold text-green-600">
                  {dashboardData?.attendance?.percentage || 0}%
                </p>
              </div>
              <ClipboardCheck className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Subjects</p>
                <p className="text-2xl font-bold text-blue-600">
                  {gradesData?.subjects?.length || 0}
                </p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Tasks</p>
                <p className="text-2xl font-bold text-amber-600">
                  {dashboardData?.upcoming_assignments?.length || 0}
                </p>
              </div>
              <FileText className="w-8 h-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Classes Today</p>
                <p className="text-2xl font-bold text-purple-600">
                  {dashboardData?.today_schedule?.length || 0}
                </p>
              </div>
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData?.today_schedule?.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.today_schedule.map((slot, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <p className="text-sm font-bold text-blue-600">{slot.start_time}</p>
                      <p className="text-xs text-gray-500">{slot.end_time}</p>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{slot.subject_name}</p>
                      <p className="text-sm text-gray-500">{slot.teacher_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No classes scheduled today</p>
            )}
          </CardContent>
        </Card>

        {/* Grades Overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              My Grades
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gradesData?.subjects?.length > 0 ? (
              <div className="space-y-4">
                {gradesData.subjects.map((subject) => (
                  <div key={subject.subject_id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{subject.subject_name}</p>
                        <p className="text-sm text-gray-500">{subject.subject_code}</p>
                      </div>
                      <Badge
                        className={subject.average_percentage >= 70 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}
                      >
                        {subject.average_percentage?.toFixed(1)}%
                      </Badge>
                    </div>
                    <Progress value={subject.average_percentage || 0} className="h-2" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No grades available yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Upcoming Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dashboardData?.upcoming_assignments?.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.upcoming_assignments.map((assignment, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={
                      assignment.submission_status === 'submitted'
                        ? 'w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center'
                        : 'w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center'
                    }>
                      {assignment.submission_status === 'submitted' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <FileText className="w-5 h-5 text-amber-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{assignment.title}</p>
                      <p className="text-sm text-gray-500">{assignment.subject_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      Due: {new Date(assignment.due_date).toLocaleDateString()}
                    </p>
                    <Badge variant={assignment.submission_status === 'submitted' ? 'default' : 'secondary'}>
                      {assignment.submission_status === 'submitted' ? 'Submitted' : 'Pending'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No pending assignments</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Grades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Recent Grades
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dashboardData?.recent_grades?.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.recent_grades.map((grade, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{grade.subject_name}</p>
                    <p className="text-sm text-gray-500">{grade.assignment_title || 'Assessment'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{grade.score}/{grade.max_score}</p>
                    <Badge className={grade.percentage >= 70 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                      {grade.percentage?.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No recent grades</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentPortalPage;
