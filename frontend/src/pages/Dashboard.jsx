import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/hooks/AuthContext';
import { getSchoolByPrincipal, getTeacherByUserId } from '@/lib/db';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();

  useEffect(() => {
    if (!isLoadingAuth) redirect(authUser);
  }, [isLoadingAuth, authUser]);

  const redirect = async (user) => {
    if (!user) { navigate(createPageUrl('RoleSelection')); return; }

    const parentClassId = localStorage.getItem('parent_class_id');
    if (parentClassId) { navigate(createPageUrl('ParentDashboard')); return; }

    try {
      const [school, teacher] = await Promise.all([
        getSchoolByPrincipal(user.uid),
        getTeacherByUserId(user.uid),
      ]);
      if (school) { navigate(createPageUrl('PrincipalDashboard')); return; }
      if (teacher) { navigate(createPageUrl('TeacherDashboard')); return; }
    } catch (err) {
      console.error('Dashboard redirect error:', err);
    }

    navigate(createPageUrl('RoleSelection'));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-slate-600">Loading your dashboard...</p>
      </div>
    </div>
  );
}
