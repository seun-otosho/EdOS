import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  ClipboardCheck,
  FileText,
  Settings,
  School,
  UserPlus,
  Layers,
  Clock,
  BarChart3,
  MessageSquare,
  Bell,
  Home,
  Clipboard,
  Award
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();

  const getMenuItems = () => {
    const userType = user?.user_type;

    if (userType === 'school_admin' || userType === 'super_admin' || userType === 'principal') {
      return [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: School, label: 'School Setup', path: '/school-setup' },
        { icon: Users, label: 'Users', path: '/users' },
        { icon: GraduationCap, label: 'Students', path: '/students' },
        { icon: Layers, label: 'Classes', path: '/classes' },
        { icon: BookOpen, label: 'Subjects', path: '/subjects' },
        { icon: Clock, label: 'Timetable', path: '/timetable' },
        { icon: ClipboardCheck, label: 'Attendance', path: '/attendance' },
        { icon: Award, label: 'Grades', path: '/grades' },
        { icon: Calendar, label: 'Calendar', path: '/calendar' },
        { icon: BarChart3, label: 'Reports', path: '/reports' },
        { icon: Settings, label: 'Settings', path: '/settings' },
      ];
    }

    if (userType === 'teacher') {
      return [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Layers, label: 'My Classes', path: '/my-classes' },
        { icon: ClipboardCheck, label: 'Attendance', path: '/attendance' },
        { icon: FileText, label: 'Assignments', path: '/assignments' },
        { icon: Award, label: 'Gradebook', path: '/gradebook' },
        { icon: Clock, label: 'Schedule', path: '/schedule' },
        { icon: MessageSquare, label: 'Messages', path: '/messages' },
      ];
    }

    if (userType === 'parent') {
      return [
        { icon: Home, label: 'Dashboard', path: '/dashboard' },
        { icon: GraduationCap, label: 'My Children', path: '/my-children' },
        { icon: Award, label: 'Grades', path: '/grades' },
        { icon: ClipboardCheck, label: 'Attendance', path: '/attendance' },
        { icon: FileText, label: 'Assignments', path: '/assignments' },
        { icon: Calendar, label: 'Calendar', path: '/calendar' },
        { icon: MessageSquare, label: 'Messages', path: '/messages' },
        { icon: Clipboard, label: 'Leave Request', path: '/leave-request' },
      ];
    }

    if (userType === 'student') {
      return [
        { icon: Home, label: 'Dashboard', path: '/dashboard' },
        { icon: Award, label: 'My Grades', path: '/grades' },
        { icon: ClipboardCheck, label: 'Attendance', path: '/attendance' },
        { icon: FileText, label: 'Assignments', path: '/assignments' },
        { icon: Clock, label: 'Schedule', path: '/schedule' },
        { icon: Calendar, label: 'Calendar', path: '/calendar' },
      ];
    }

    return [];
  };

  const menuItems = getMenuItems();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
            <School className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">EdOS</h1>
            <p className="text-xs text-gray-500">School Management</p>
          </div>
        </div>
      </div>

      <nav className="px-4 pb-6">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
