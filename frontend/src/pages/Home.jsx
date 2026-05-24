import React from 'react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/AuthContext';
import {
  GraduationCap,
  Users,
  BarChart3,
  Bell,
  CheckCircle2,
  ArrowRight,
  Shield,
  TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const { user, isLoadingAuth } = useAuth();
  const isAuthenticated = !!user;
  const loading = isLoadingAuth;

  const features = [
    {
      icon: CheckCircle2,
      title: "Smart Attendance",
      description: "One-click digital attendance with late arrival and half-day tracking"
    },
    {
      icon: TrendingUp,
      title: "Engagement Scoring",
      description: "AI-powered engagement scores based on attendance, participation & performance"
    },
    {
      icon: BarChart3,
      title: "Real-time Analytics",
      description: "Visual dashboards with trends, heatmaps and actionable insights"
    },
    {
      icon: Bell,
      title: "Early Warning Alerts",
      description: "Automatic notifications for at-risk students to teachers and parents"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
              <span className="font-bold text-xl text-slate-800">EduSphere</span>
            </div>
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <Link to={createPageUrl('Dashboard')}>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Go to Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to={createPageUrl('RoleSelection')}>
                    <Button variant="ghost">Sign In</Button>
                  </Link>
                  <Link to={createPageUrl('RoleSelection')}>
                    <Button className="bg-blue-600 hover:bg-blue-700">Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-full px-4 py-2 mb-6">
              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
              <span className="text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">360° Learning Intelligence</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-tight mb-6">
              A Complete View of
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600"> Learning & Engagement</span>
            </h1>
            <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
              Track attendance, monitor engagement, analyze performance—all in one comprehensive platform. A 360° view of every student's journey.
            </p>
            <div className="flex justify-center">
              <Link to={createPageUrl('RoleSelection')}>
                <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white text-lg px-12 py-6 rounded-full shadow-lg">
                  Login
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Dashboard Preview */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-16 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent z-10 pointer-events-none"></div>
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-100 px-4 py-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="p-6 bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="text-sm text-slate-500">Total Students</div>
                    <div className="text-2xl font-bold text-slate-800">1,234</div>
                    <div className="text-xs text-green-600 mt-1">+12% this month</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="text-sm text-slate-500">Avg Attendance</div>
                    <div className="text-2xl font-bold text-slate-800">94.5%</div>
                    <div className="text-xs text-green-600 mt-1">Above target</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="text-sm text-slate-500">Engagement Score</div>
                    <div className="text-2xl font-bold text-slate-800">87</div>
                    <div className="text-xs text-blue-600 mt-1">Good</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="text-sm text-slate-500">At-Risk Students</div>
                    <div className="text-2xl font-bold text-orange-600">23</div>
                    <div className="text-xs text-orange-600 mt-1">Needs attention</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Everything You Need for Student Success
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              A comprehensive platform designed to help schools monitor, analyze, and improve student engagement.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-slate-50 rounded-2xl p-6 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-purple-600 via-pink-600 to-purple-700">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Built for Every Role
            </h2>
            <p className="text-lg text-blue-100 max-w-2xl mx-auto">
              Tailored dashboards and features for principals, teachers, and parents.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Shield, title: "Principals", desc: "Full school oversight, manage classes, teachers, and view comprehensive analytics" },
              { icon: Users, title: "Teachers", desc: "Mark attendance, track student engagement, and receive at-risk alerts" },
              { icon: GraduationCap, title: "Parents", desc: "Simple dashboard to view child's attendance, engagement, and progress" }
            ].map((role, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
              >
                <role.icon className="w-10 h-10 text-white mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">{role.title}</h3>
                <p className="text-purple-100">{role.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Ready to Transform Your School?
          </h2>
          <p className="text-lg text-slate-600 mb-8">
            Join thousands of schools using EduTrack to improve student engagement and success.
          </p>
          <Link to={createPageUrl('RoleSelection')}>
            <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white text-lg px-12 py-6 rounded-full shadow-lg">
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-white">EduSphere</span>
          </div>
          <p className="text-sm">360° View of Learning, Engagement & Performance</p>
        </div>
      </footer>
    </div>
  );
}
