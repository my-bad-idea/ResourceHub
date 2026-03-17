import React from 'react';
import { useRouter } from '../hooks/useRouter';
import { AdminLayout } from '../layout/AdminLayout';
import { AdminCategories } from '../admin/AdminCategories';
import { AdminTags } from '../admin/AdminTags';
import { AdminUsers } from '../admin/AdminUsers';
import { AdminConfig } from '../admin/AdminConfig';
import { AdminEmail } from '../admin/AdminEmail';

const ADMIN_TABS = ['categories', 'tags', 'users', 'config', 'email'];

function AdminPage() {
  const { route, navigate } = useRouter();
  const path = route.path || '';
  const subpath = path.replace(/^\/admin\/?/, '') || 'categories';
  const activeTab = ADMIN_TABS.includes(subpath) ? subpath : 'categories';

  React.useEffect(() => {
    if (!ADMIN_TABS.includes(subpath)) {
      navigate('#/admin/categories');
    }
  }, [subpath, navigate]);

  const tabContent = {
    categories: React.createElement(AdminCategories, null),
    tags: React.createElement(AdminTags, null),
    users: React.createElement(AdminUsers, null),
    config: React.createElement(AdminConfig, null),
    email: React.createElement(AdminEmail, null),
  };

  return (
    <AdminLayout activeTab={activeTab}>
      {tabContent[activeTab] || null}
    </AdminLayout>
  );
}

export { AdminPage };
