const ADMIN_TABS = ['categories', 'tags', 'users', 'config', 'email'];

function AdminPage() {
  const { route, navigate } = window.useRouter();
  const path = route.path || '';
  const subpath = path.replace(/^\/admin\/?/, '') || 'categories';
  const activeTab = ADMIN_TABS.includes(subpath) ? subpath : 'categories';

  React.useEffect(() => {
    if (!ADMIN_TABS.includes(subpath)) {
      navigate('#/admin/categories');
    }
  }, [subpath, navigate]);

  const tabContent = {
    categories: React.createElement(window.AdminCategories, null),
    tags: React.createElement(window.AdminTags, null),
    users: React.createElement(window.AdminUsers, null),
    config: React.createElement(window.AdminConfig, null),
    email: React.createElement(window.AdminEmail, null),
  };

  return (
    <window.AdminLayout activeTab={activeTab}>
      {tabContent[activeTab] || null}
    </window.AdminLayout>
  );
}

window.AdminPage = AdminPage;
