import { Layout } from '../components/layout';
import { Dashboard } from '../components/reporting';

const HistoryPage = () => {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Dashboard />
      </div>
    </Layout>
  );
};

export default HistoryPage; 