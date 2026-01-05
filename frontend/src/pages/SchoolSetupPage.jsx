import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { schoolAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Building2,
  Calendar,
  Settings,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Upload
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const SchoolSetupPage = () => {
  const { school, updateSchool } = useAuth();
  const [currentSchool, setCurrentSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [academicYears, setAcademicYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    fetchSchoolData();
  }, []);

  const fetchSchoolData = async () => {
    try {
      const [schoolRes, yearsRes, termsRes, holidaysRes] = await Promise.all([
        schoolAPI.getCurrentSchool(),
        schoolAPI.getAcademicYears().catch(() => ({ data: [] })),
        schoolAPI.getTerms().catch(() => ({ data: [] })),
        schoolAPI.getHolidays().catch(() => ({ data: [] }))
      ]);
      setCurrentSchool(schoolRes.data);
      setAcademicYears(yearsRes.data || []);
      setTerms(termsRes.data || []);
      setHolidays(holidaysRes.data || []);
    } catch (error) {
      toast.error('Failed to load school data');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSetup = async () => {
    try {
      await schoolAPI.completeSetup();
      toast.success('School setup completed!');
      fetchSchoolData();
    } catch (error) {
      toast.error('Failed to complete setup');
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
    <div className="space-y-6" data-testid="school-setup-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">School Setup</h1>
          <p className="text-gray-600">Configure your school settings</p>
        </div>
        {!currentSchool?.setup_completed && (
          <Button onClick={handleCompleteSetup} className="bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Mark Setup Complete
          </Button>
        )}
        {currentSchool?.setup_completed && (
          <Badge className="bg-green-100 text-green-700 text-sm px-3 py-1">
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Setup Complete
          </Badge>
        )}
      </div>

      <Tabs defaultValue="info" className="space-y-6">
        <TabsList>
          <TabsTrigger value="info">
            <Building2 className="w-4 h-4 mr-2" />
            School Info
          </TabsTrigger>
          <TabsTrigger value="academic">
            <Calendar className="w-4 h-4 mr-2" />
            Academic Calendar
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <SchoolInfoForm school={currentSchool} onUpdate={fetchSchoolData} />
        </TabsContent>

        <TabsContent value="academic">
          <AcademicCalendar
            academicYears={academicYears}
            terms={terms}
            holidays={holidays}
            onUpdate={fetchSchoolData}
          />
        </TabsContent>

        <TabsContent value="settings">
          <SchoolSettings school={currentSchool} onUpdate={fetchSchoolData} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// School Info Form
const SchoolInfoForm = ({ school, onUpdate }) => {
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: school?.name || '',
      address: school?.address || '',
      city: school?.city || '',
      state: school?.state || '',
      country: school?.country || '',
      postal_code: school?.postal_code || '',
      phone_number: school?.phone_number || '',
      email: school?.email || '',
      website: school?.website || '',
    },
  });

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      await schoolAPI.updateSchool(data);
      toast.success('School information updated!');
      onUpdate();
    } catch (error) {
      toast.error('Failed to update school');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>School Information</CardTitle>
        <CardDescription>Update your school's basic information</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">School Name</Label>
              <Input id="name" {...register('name')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input id="phone_number" {...register('phone_number')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" {...register('website')} placeholder="https://" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register('address')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register('city')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State/Province</Label>
              <Input id="state" {...register('state')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...register('country')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal_code">Postal Code</Label>
              <Input id="postal_code" {...register('postal_code')} />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

// Academic Calendar
const AcademicCalendar = ({ academicYears, terms, holidays, onUpdate }) => {
  const [showYearDialog, setShowYearDialog] = useState(false);
  const [showTermDialog, setShowTermDialog] = useState(false);
  const [showHolidayDialog, setShowHolidayDialog] = useState(false);

  return (
    <div className="space-y-6">
      {/* Academic Years */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Academic Years</CardTitle>
            <CardDescription>Manage academic years</CardDescription>
          </div>
          <Dialog open={showYearDialog} onOpenChange={setShowYearDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Year
              </Button>
            </DialogTrigger>
            <DialogContent>
              <AcademicYearForm
                onClose={() => setShowYearDialog(false)}
                onSuccess={() => {
                  setShowYearDialog(false);
                  onUpdate();
                }}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {academicYears.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No academic years configured</p>
          ) : (
            <div className="space-y-3">
              {academicYears.map((year) => (
                <div key={year.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{year.name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(year.start_date).toLocaleDateString()} - {new Date(year.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  {year.is_current && (
                    <Badge className="bg-green-100 text-green-700">Current</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Terms */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Terms / Semesters</CardTitle>
            <CardDescription>Configure academic terms</CardDescription>
          </div>
          <Dialog open={showTermDialog} onOpenChange={setShowTermDialog}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={academicYears.length === 0}>
                <Plus className="w-4 h-4 mr-2" />
                Add Term
              </Button>
            </DialogTrigger>
            <DialogContent>
              <TermForm
                academicYears={academicYears}
                onClose={() => setShowTermDialog(false)}
                onSuccess={() => {
                  setShowTermDialog(false);
                  onUpdate();
                }}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {terms.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No terms configured</p>
          ) : (
            <div className="space-y-3">
              {terms.map((term) => (
                <div key={term.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{term.name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(term.start_date).toLocaleDateString()} - {new Date(term.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline">{term.term_type}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Holidays */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Holidays</CardTitle>
            <CardDescription>School holidays and breaks</CardDescription>
          </div>
          <Dialog open={showHolidayDialog} onOpenChange={setShowHolidayDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Holiday
              </Button>
            </DialogTrigger>
            <DialogContent>
              <HolidayForm
                onClose={() => setShowHolidayDialog(false)}
                onSuccess={() => {
                  setShowHolidayDialog(false);
                  onUpdate();
                }}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {holidays.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No holidays configured</p>
          ) : (
            <div className="space-y-2">
              {holidays.map((holiday) => (
                <div key={holiday.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{holiday.name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(holiday.date).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      try {
                        await schoolAPI.deleteHoliday(holiday.id);
                        toast.success('Holiday deleted');
                        onUpdate();
                      } catch (error) {
                        toast.error('Failed to delete holiday');
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Academic Year Form
const AcademicYearForm = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await schoolAPI.createAcademicYear({
        ...data,
        is_current: data.is_current === 'true'
      });
      toast.success('Academic year created!');
      onSuccess();
    } catch (error) {
      toast.error('Failed to create academic year');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <DialogHeader>
        <DialogTitle>Add Academic Year</DialogTitle>
        <DialogDescription>Create a new academic year</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Name (e.g., 2024-2025)</Label>
          <Input {...register('name', { required: true })} placeholder="2024-2025" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input type="date" {...register('start_date', { required: true })} />
          </div>
          <div className="space-y-2">
            <Label>End Date</Label>
            <Input type="date" {...register('end_date', { required: true })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Set as Current Year?</Label>
          <Select onValueChange={(v) => {}} {...register('is_current')}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create'}
        </Button>
      </DialogFooter>
    </form>
  );
};

// Term Form
const TermForm = ({ academicYears, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, setValue } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await schoolAPI.createTerm({
        ...data,
        is_current: data.is_current === 'true'
      });
      toast.success('Term created!');
      onSuccess();
    } catch (error) {
      toast.error('Failed to create term');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <DialogHeader>
        <DialogTitle>Add Term</DialogTitle>
        <DialogDescription>Create a new academic term</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Academic Year</Label>
          <Select onValueChange={(v) => setValue('academic_year_id', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {academicYears.map((year) => (
                <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Term Name</Label>
          <Input {...register('name', { required: true })} placeholder="Term 1" />
        </div>
        <div className="space-y-2">
          <Label>Term Type</Label>
          <Select onValueChange={(v) => setValue('term_type', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semester">Semester</SelectItem>
              <SelectItem value="trimester">Trimester</SelectItem>
              <SelectItem value="quarter">Quarter</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input type="date" {...register('start_date', { required: true })} />
          </div>
          <div className="space-y-2">
            <Label>End Date</Label>
            <Input type="date" {...register('end_date', { required: true })} />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create'}
        </Button>
      </DialogFooter>
    </form>
  );
};

// Holiday Form
const HolidayForm = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await schoolAPI.createHoliday(data);
      toast.success('Holiday added!');
      onSuccess();
    } catch (error) {
      toast.error('Failed to add holiday');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <DialogHeader>
        <DialogTitle>Add Holiday</DialogTitle>
        <DialogDescription>Add a school holiday</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Holiday Name</Label>
          <Input {...register('name', { required: true })} placeholder="e.g., Christmas Break" />
        </div>
        <div className="space-y-2">
          <Label>Date</Label>
          <Input type="date" {...register('date', { required: true })} />
        </div>
        <div className="space-y-2">
          <Label>Description (Optional)</Label>
          <Input {...register('description')} placeholder="Additional details" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Holiday'}
        </Button>
      </DialogFooter>
    </form>
  );
};

// School Settings
const SchoolSettings = ({ school, onUpdate }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>System Settings</CardTitle>
        <CardDescription>Configure system-wide settings</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="font-medium mb-2">School Code</h3>
            <p className="text-2xl font-mono bg-gray-100 p-3 rounded-lg">{school?.code}</p>
            <p className="text-sm text-gray-500 mt-1">Use this code to identify your school</p>
          </div>

          <Separator />

          <div>
            <h3 className="font-medium mb-2">Theme Colors</h3>
            <div className="flex gap-4">
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-lg border"
                    style={{ backgroundColor: school?.primary_color || '#3B82F6' }}
                  />
                  <Input defaultValue={school?.primary_color || '#3B82F6'} className="w-32" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Secondary Color</Label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-lg border"
                    style={{ backgroundColor: school?.secondary_color || '#10B981' }}
                  />
                  <Input defaultValue={school?.secondary_color || '#10B981'} className="w-32" />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-medium mb-2">Attendance Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Minimum Attendance Threshold</p>
                  <p className="text-sm text-gray-500">Students below this will be flagged</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    defaultValue={school?.settings?.attendance_threshold || 75}
                    className="w-20"
                  />
                  <span>%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SchoolSetupPage;
