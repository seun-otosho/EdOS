import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { attendanceAPI, studentAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Calendar,
  Plus,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

const LeaveRequestPage = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const isParent = user?.user_type === 'parent';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      if (isParent) {
        const childrenRes = await studentAPI.getMyChildren();
        setChildren(childrenRes.data);
      }
      const requestsRes = await attendanceAPI.getLeaveRequests();
      setLeaveRequests(requestsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { color: 'bg-amber-100 text-amber-700', icon: Clock },
      approved: { color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
      rejected: { color: 'bg-red-100 text-red-700', icon: XCircle },
      cancelled: { color: 'bg-gray-100 text-gray-700', icon: AlertCircle },
    };
    const { color, icon: Icon } = config[status] || config.pending;
    return (
      <Badge className={color}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="leave-request-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
          <p className="text-gray-600">
            {isParent ? 'Request leave for your children' : 'Manage student leave requests'}
          </p>
        </div>
        {isParent && children.length > 0 && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <LeaveRequestForm
                children={children}
                onClose={() => setShowCreateDialog(false)}
                onSuccess={() => {
                  setShowCreateDialog(false);
                  fetchData();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leave History</CardTitle>
        </CardHeader>
        <CardContent>
          {leaveRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <Calendar className="w-12 h-12 mb-4" />
              <p>No leave requests yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Date Range</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {request.student_name}
                    </TableCell>
                    <TableCell>
                      {new Date(request.start_date).toLocaleDateString()} -
                      {new Date(request.end_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {request.reason}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      {new Date(request.created_at).toLocaleDateString()}
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

// Leave Request Form
const LeaveRequestForm = ({ children, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await attendanceAPI.createLeaveRequest(data);
      toast.success('Leave request submitted!');
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <DialogHeader>
        <DialogTitle>Request Leave</DialogTitle>
        <DialogDescription>Submit a leave request for your child</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Child *</Label>
          <Select onValueChange={(v) => setValue('student_id', v)}>
            <SelectTrigger>
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
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start Date *</Label>
            <Input type="date" {...register('start_date', { required: true })} />
          </div>
          <div className="space-y-2">
            <Label>End Date *</Label>
            <Input type="date" {...register('end_date', { required: true })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Reason *</Label>
          <Textarea
            {...register('reason', { required: true })}
            placeholder="Please provide the reason for leave..."
            rows={4}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Request'}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default LeaveRequestPage;
