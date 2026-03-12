function AdminPage() {
  const [activeTab, setActiveTab] = React.useState('categories');

  const tabContent = {
    categories: React.createElement(window.AdminCategories, null),
    tags: React.createElement(window.AdminTags, null),
    users: React.createElement(window.AdminUsers, null),
    config: React.createElement(window.AdminConfig, null),
    email: React.createElement(window.AdminEmail, null),
  };

  return (
    <window.AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {tabContent[activeTab] || null}
    </window.AdminLayout>
  );
}

window.AdminPage = AdminPage;
