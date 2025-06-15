
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import PhotoMigrationSystem from './components/PhotoMigrationSystem';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/migration" element={<PhotoMigrationSystem />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
