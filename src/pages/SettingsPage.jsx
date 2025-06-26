import { Layout } from '../components/layout';
import { UserSettings } from '../components/settings';

const SettingsPage = () => {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <UserSettings />
      </div>
    </Layout>
  );
};

export default SettingsPage; 