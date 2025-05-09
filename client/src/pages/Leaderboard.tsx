import { useEffect, useState } from 'react';

export default function Leaderboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/projects');
        if (!res.ok) throw new Error('Failed to fetch projects');
        const data = await res.json();
        // Sort by likes descending
        data.sort((a: any, b: any) => (b.likes?.length || 0) - (a.likes?.length || 0));
        setProjects(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-primary mb-8">🏆 Project Like Leaderboard</h1>
        {loading && <div className="text-center py-8 text-gray-500">Loading leaderboard...</div>}
        {error && <div className="text-center py-8 text-red-500">{error}</div>}
        {!loading && !error && (
          <ol className="space-y-4">
            {projects.slice(0, 10).map((project, idx) => (
              <li key={project._id} className="bg-white rounded-xl shadow p-6 flex items-center gap-6">
                <span className="text-2xl font-bold text-primary w-8 text-center">{idx + 1}</span>
                <div className="flex-1">
                  <div className="text-lg font-semibold text-gray-900">{project.title}</div>
                  <div className="text-sm text-gray-500">by {project.author?.name || 'Unknown'}</div>
                  <div className="text-xs text-gray-400">{project.likes?.length || 0} likes</div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
} 