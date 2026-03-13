import { useQuery } from '@tanstack/react-query';
import { Users as UsersIcon, ShieldCheck, User } from 'lucide-react';
import { usersApi } from '../api/users';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorAlert } from '../components/ErrorAlert';
import { formatDate } from '../utils/format';
import { useAuth } from '../hooks/useAuth';

export default function Users() {
  const { user: currentUser } = useAuth();

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
  });

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <ShieldCheck className="w-16 h-16 text-gray-200 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Admin Access Required</h2>
        <p className="text-gray-500 text-sm">
          You need administrator privileges to view the users list.
        </p>
      </div>
    );
  }

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message="Failed to load users" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-sm text-gray-500 mt-1">
          {users?.length ?? 0} team members in your workspace
        </p>
      </div>

      {(users ?? []).length === 0 ? (
        <EmptyState
          icon={<UsersIcon className="w-12 h-12" />}
          title="No users found"
          description="No other users in your tenant yet."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">User</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden sm:table-cell">Email</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Role</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden md:table-cell">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden lg:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(users ?? []).map((user) => (
                <tr
                  key={user.id}
                  className={`hover:bg-gray-50/50 transition-colors ${
                    user.id === currentUser?.id ? 'bg-indigo-50/30' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-indigo-700">
                          {user.full_name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {user.full_name}
                          {user.id === currentUser?.id && (
                            <span className="ml-1.5 text-xs text-indigo-600 font-normal">(you)</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400 sm:hidden">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {user.role === 'admin' ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                          <Badge variant="purple">Admin</Badge>
                        </>
                      ) : (
                        <>
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <Badge variant="gray">Member</Badge>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Badge variant={user.is_active ? 'green' : 'red'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                    {formatDate(user.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
