import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { dashboardAPI, schoolAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  TrendingUp,
  Calendar,
  Bell,
  ArrowRight,
  Clock,
  Award,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';

const DashboardPage = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      let data;
      const userType = user?.user_type;

      if (userType === 'school_admin' || userType === 'super_admin' || userType === 'principal') {
        const [dashRes, schoolRes] = await Promise.all([
          dashboardAPI.getAdminDashboard(),
          schoolAPI.getCurrentSchool()
        ]);
        data = dashRes.data;
        setSchool(schoolRes.data);
      } else if (userType === 'teacher') {
        const res = await dashboardAPI.getTeacherDashboard();
        data = res.data;
      } else if (userType === 'parent') {
        const res = await dashboardAPI.getParentDashboard();
        data = res.data;
      } else if (userType === 'student') {
        const res = await dashboardAPI.getStudentDashboard();
        data = res.data;
      }

      setDashboardData(data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
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

  // Admin Dashboard
  if (user?.user_type === 'school_admin' || user?.user_type === 'super_admin' || user?.user_type === 'principal') {
    return <AdminDashboard data={dashboardData} school={school} />;
  }

  // Teacher Dashboard
  if (user?.user_type === 'teacher') {
    return <TeacherDashboard data={dashboardData} />;
  }

  // Parent Dashboard
  if (user?.user_type === 'parent') {
    return <ParentDashboard data={dashboardData} />;
  }

  // Student Dashboard
  if (user?.user_type === 'student') {
    return <StudentDashboard data={dashboardData} />;
  }

  return <div>Unknown user type</div>;
};

// Admin Dashboard Component
const AdminDashboard = ({ data, school }) => {
  const stats = data?.stats || {};

  return (
    <div className="space-y-6" data-testid="admin-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome to {school?.name || 'your school'}</p>
        </div>
        {!school?.setup_completed && (
          <Link to="/school-setup">
            <Button className="bg-amber-500 hover:bg-amber-600">
              <AlertCircle className="w-4 h-4 mr-2" />
              Complete Setup
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total_students || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Teachers</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total_teachers || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Classes</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total_classes || 0}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today's Attendance</p>
                <p className="text-3xl font-bold text-gray-900">{stats.attendance_rate || 0}%</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <ClipboardCheck className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Class Stats & Recent Students */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Class Overview</CardTitle>
            <CardDescription>Student distribution across classes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.class_stats?.slice(0, 5).map((cls) => (
                <div key={cls.id} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{cls.name}</span>
                      <span className="text-sm text-gray-500">
                        {cls.student_count}/{cls.capacity}
                      </span>
                    </div>
                    <Progress value={(cls.student_count / cls.capacity) * 100} className="h-2" />
                  </div>
                </div>
              ))}
              {(!data?.class_stats || data.class_stats.length === 0) && (
                <p className="text-gray-500 text-center py-4">No classes yet. Create your first class.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Students</CardTitle>
            <CardDescription>Latest student registrations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.recent_students?.map((student) => (
                <div key={student.id} className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{student.first_name} {student.last_name}</p>
                    <p className="text-sm text-gray-500">
                      Added {new Date(student.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {(!data?.recent_students || data.recent_students.length === 0) && (
                <p className="text-gray-500 text-center py-4">No students yet. Add your first student.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to="/students">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <GraduationCap className="w-6 h-6" />
                <span>Add Student</span>
              </Button>
            </Link>
            <Link to="/users">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <Users className="w-6 h-6" />
                <span>Invite Teacher</span>
              </Button>
            </Link>
            <Link to="/classes">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <BookOpen className="w-6 h-6" />
                <span>Create Class</span>
              </Button>
            </Link>
            <Link to="/attendance">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <ClipboardCheck className="w-6 h-6" />
                <span>Mark Attendance</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Teacher Dashboard Component
const TeacherDashboard = ({ data }) => {
  const stats = data?.stats || {};

  return (
    <div className="space-y-6" data-testid="teacher-dashboard">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
        <p className="text-gray-600">Manage your classes and students</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">My Classes</p>
                <p className="text-3xl font-bold">{stats.total_classes || 0}</p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-3xl font-bold">{stats.total_students || 0}</p>
              </div>
              <GraduationCap className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Grading</p>
                <p className="text-3xl font-bold">{stats.pending_grading || 0}</p>
              </div>
              <Award className="w-8 h-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today's Classes</p>
                <p className="text-3xl font-bold">{stats.today_classes || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule & Classes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Today's Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.today_schedule?.map((slot, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm font-bold text-blue-600">{slot.start_time}</p>
                    <p className="text-xs text-gray-500">{slot.end_time}</p>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{slot.subject_name}</p>
                    <p className="text-sm text-gray-500">{slot.class_name} • Room {slot.room_number || 'TBD'}</p>
                  </div>
                </div>
              ))}
              {(!data?.today_schedule || data.today_schedule.length === 0) && (
                <p className="text-gray-500 text-center py-4">No classes scheduled for today</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.my_classes?.map((cls) => (
                <div key={cls.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{cls.name}</p>
                    <p className="text-sm text-gray-500">{cls.student_count} students</p>
                  </div>
                  <Link to={`/my-classes`}>
                    <Button size="sm" variant="ghost">
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              ))}
              {(!data?.my_classes || data.my_classes.length === 0) && (
                <p className="text-gray-500 text-center py-4">No classes assigned yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Parent Dashboard Component
const ParentDashboard = ({ data }) => {
  return (
    <div className="space-y-6" data-testid="parent-dashboard">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Parent Dashboard</h1>
        <p className="text-gray-600">Monitor your children's progress</p>
      </div>

      {/* Children Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data?.children?.map((child) => (
          <Card key={child.id}>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>{child.first_name} {child.last_name}</CardTitle>
                  <CardDescription>{child.class_name || 'Not assigned'}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{child.attendance_percentage}%</p>
                  <p className="text-sm text-gray-600">Attendance</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{child.pending_assignments}</p>
                  <p className="text-sm text-gray-600">Pending Work</p>
                </div>
              </div>

              {child.recent_grades?.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Recent Grades</p>
                  <div className="space-y-2">
                    {child.recent_grades.slice(0, 3).map((grade, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span>{grade.subject_name}</span>
                        <Badge variant={grade.percentage >= 70 ? 'default' : 'destructive'}>
                          {grade.percentage}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {(!data?.children || data.children.length === 0) && (
          <Card className="col-span-2">
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">No children linked to your account yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// Student Dashboard Component
const StudentDashboard = ({ data }) => {
  const student = data?.student;

  return (
    <div className="space-y-6" data-testid="student-dashboard">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {student?.first_name}!
        </h1>
        <p className="text-gray-600">{student?.class_info?.name || 'Class not assigned'}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-4xl font-bold text-green-600">{data?.attendance?.percentage || 0}%</p>
            <p className="text-gray-600">Attendance Rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-4xl font-bold text-blue-600">{data?.upcoming_assignments?.length || 0}</p>
            <p className="text-gray-600">Pending Assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-4xl font-bold text-purple-600">{data?.today_schedule?.length || 0}</p>
            <p className="text-gray-600">Classes Today</p>
          </CardContent>
        </Card>
      </div>

      {/* Schedule & Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Today's Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.today_schedule?.map((slot, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm font-bold text-blue-600">{slot.start_time}</p>
                  </div>
                  <div>
                    <p className="font-medium">{slot.subject_name}</p>
                    <p className="text-sm text-gray-500">{slot.teacher_name}</p>
                  </div>
                </div>
              ))}
              {(!data?.today_schedule || data.today_schedule.length === 0) && (
                <p className="text-gray-500 text-center py-4">No classes today</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.upcoming_assignments?.map((assignment, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{assignment.title}</p>
                    <p className="text-sm text-gray-500">{assignment.subject_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      Due: {new Date(assignment.due_date).toLocaleDateString()}
                    </p>
                    <Badge variant={assignment.submission_status === 'submitted' ? 'default' : 'secondary'}>
                      {assignment.submission_status === 'submitted' ? 'Submitted' : 'Pending'}
                    </Badge>
                  </div>
                </div>
              ))}
              {(!data?.upcoming_assignments || data.upcoming_assignments.length === 0) && (
                <p className="text-gray-500 text-center py-4">No pending assignments</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
