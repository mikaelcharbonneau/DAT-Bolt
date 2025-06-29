import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Mail, Phone, Building, Clock, Pencil, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { Box, Spinner, Layer, Form, FormField, TextInput, Button } from 'grommet';

interface Activity {
  id: string;
  type: 'inspection' | 'issue' | 'report';
  description: string;
  created_at: string;
}

interface UserStats {
  walkthroughs_completed: number;
  issues_resolved: number;
  reports_generated: number;
}

interface UserProfile {
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  department: string;
}

const Profile = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<UserStats>({
    walkthroughs_completed: 0,
    issues_resolved: 0,
    reports_generated: 0
  });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      Promise.all([
        fetchUserActivities(),
        fetchUserStats(),
        fetchUserProfile()
      ]).finally(() => setLoading(false));
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        const defaultProfile = {
          user_id: user?.id,
          full_name: '',
          avatar_url: null,
          phone: null,
          department: 'Data Center Operations'
        };

        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .upsert(defaultProfile)
          .select()
          .maybeSingle();

        if (createError) throw createError;
        setProfile(newProfile);
      } else {
        setProfile(data);
      }
    } catch (error) {
      const err = error as Error;
      console.error('Error fetching profile:', err);
      setError('Failed to load profile');
    }
  };

  const fetchUserActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      const err = error as Error;
      console.error('Error fetching activities:', err);
      setError('Failed to load activities');
    }
  };

  const fetchUserStats = async () => {
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setStats(data);
      } else {
        const defaultStats = {
          user_id: user?.id,
          walkthroughs_completed: 0,
          issues_resolved: 0,
          reports_generated: 0
        };

        const { error: createError } = await supabase
          .from('user_stats')
          .upsert(defaultStats);

        if (createError) throw createError;
        setStats(defaultStats);
      }
    } catch (error) {
      const err = error as Error;
      console.error('Error fetching stats:', err);
      setError('Failed to load statistics');
    }
  };

  const handleProfileUpdate = async (values: Partial<UserProfile>) => {
    try {
      setError(null);
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user?.id,
          ...values,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      await fetchUserProfile();
      setShowEditModal(false);
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (error) {
      const err = error as Error;
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      setError(null);
      const file = event.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await handleProfileUpdate({ avatar_url: publicUrl });
    } catch (error) {
      const err = error as Error;
      console.error('Error uploading avatar:', err);
      setError('Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const calculateProgressPercentage = (value: number, type: keyof UserStats) => {
    const maxValues = {
      walkthroughs_completed: 50,
      issues_resolved: 100,
      reports_generated: 30
    };
    return Math.min((value / maxValues[type]) * 100, 100);
  };

  if (!user) return null;

  if (loading) {
    return (
      <Box fill align="center\" justify="center\" pad="large">
        <Spinner size="medium" />
        <Box margin={{ top: 'medium' }}>
          <p className="text-gray-600">Loading profile...</p>
        </Box>
      </Box>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {updateSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          Profile updated successfully!
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-6 flex items-center">
          <div className="relative">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 bg-[#01A982] rounded-full flex items-center justify-center text-white text-3xl font-medium">
                {profile?.full_name?.charAt(0) || user.email?.charAt(0)}
              </div>
            )}
            <label className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg cursor-pointer">
              <Upload className="w-4 h-4 text-gray-600" />
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploading}
              />
            </label>
          </div>
          <div className="ml-6 flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  {profile?.full_name || 'Update your profile'}
                </h1>
                <p className="text-gray-600">Data Center Technician</p>
              </div>
              <button
                onClick={() => setShowEditModal(true)}
                className="p-2 text-gray-600 hover:text-gray-900"
              >
                <Pencil className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center text-gray-600">
                <Mail className="w-4 h-4 mr-2" />
                <span className="text-sm">{user.email}</span>
              </div>
              {profile?.phone && (
                <div className="flex items-center text-gray-600">
                  <Phone className="w-4 h-4 mr-2" />
                  <span className="text-sm">{profile.phone}</span>
                </div>
              )}
              <div className="flex items-center text-gray-600">
                <Building className="w-4 h-4 mr-2" />
                <span className="text-sm">{profile?.department}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Clock className="w-4 h-4 mr-2" />
                <span className="text-sm">Last active: {format(new Date(), 'PPp')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Activity Log */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-medium text-gray-900">Activity Log</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {activities.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">
                  No activities recorded yet
                </div>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="px-6 py-4">
                    <div className="flex justify-between mb-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        activity.type === 'inspection' 
                          ? 'bg-emerald-100 text-emerald-800'
                          : activity.type === 'issue'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(activity.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{activity.description}</p>
                  </div>
                ))
              )}
            </div>
            {activities.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-100 text-center">
                <button className="text-sm text-[#01A982] font-medium hover:text-[#018768]">
                  View All Activity
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Settings and Stats */}
        <div className="space-y-6">
          {/* Settings */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-medium text-gray-900">Settings</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Email Notifications</span>
                <button 
                  className={`relative inline-flex items-center h-6 rounded-full w-11 bg-[#01A982]`}
                >
                  <span className="sr-only">Toggle email notifications</span>
                  <span className="inline-block w-5 h-5 transform translate-x-6 bg-white rounded-full" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Auto-save Reports</span>
                <button 
                  className={`relative inline-flex items-center h-6 rounded-full w-11 bg-[#01A982]`}
                >
                  <span className="sr-only">Toggle auto-save reports</span>
                  <span className="inline-block w-5 h-5 transform translate-x-6 bg-white rounded-full" />
                </button>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-medium text-gray-900">Statistics</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">Walkthroughs Completed</span>
                    <span className="text-sm font-medium text-gray-900">
                      {stats.walkthroughs_completed}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-[#01A982] h-2 rounded-full" 
                      style={{ 
                        width: `${calculateProgressPercentage(stats.walkthroughs_completed, 'walkthroughs_completed')}%` 
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">Issues Resolved</span>
                    <span className="text-sm font-medium text-gray-900">
                      {stats.issues_resolved}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-[#425563] h-2 rounded-full" 
                      style={{ 
                        width: `${calculateProgressPercentage(stats.issues_resolved, 'issues_resolved')}%` 
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">Reports Generated</span>
                    <span className="text-sm font-medium text-gray-900">
                      {stats.reports_generated}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-[#FF8D6D] h-2 rounded-full" 
                      style={{ 
                        width: `${calculateProgressPercentage(stats.reports_generated, 'reports_generated')}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <Layer
          onEsc={() => setShowEditModal(false)}
          onClickOutside={() => setShowEditModal(false)}
        >
          <Box pad="medium" gap="medium" width="medium">
            <h2 className="text-xl font-semibold">Edit Profile</h2>
            <Form
              value={profile || {}}
              onSubmit={({ value }) => handleProfileUpdate(value)}
            >
              <FormField name="full_name" label="Full Name">
                <TextInput name="full_name" placeholder="Enter your full name" />
              </FormField>
              <FormField name="phone" label="Phone">
                <TextInput name="phone" placeholder="Enter your phone number" />
              </FormField>
              <FormField name="department" label="Department">
                <TextInput name="department" placeholder="Enter your department" />
              </FormField>
              <Box direction="row" gap="medium" justify="end" margin={{ top: 'medium' }}>
                <Button label="Cancel" onClick={() => setShowEditModal(false)} />
                <Button type="submit" primary label="Save Changes" />
              </Box>
            </Form>
          </Box>
        </Layer>
      )}
    </div>
  );
};

export default Profile;