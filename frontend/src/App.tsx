import { Routes, Route, Link } from 'react-router-dom';
import { TripProvider } from './context/TripContext';
import Home from './pages/Home';
import Trip from './pages/Trip';
import DayView from './pages/DayView';
import NewTripPage from './pages/NewTripPage';
import EditTripPage from './pages/EditTripPage';
import './App.css';

function App() {
  return (
    <TripProvider>
      <header>
        <Link to="/">אפליקציית טיולים</Link>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/trip/new" element={<NewTripPage />} />
          <Route path="/trip/:id/edit" element={<EditTripPage />} />
          <Route path="/trip/:id" element={<Trip />} />
          <Route path="/trip/:id/day/:dayIndex" element={<DayView />} />
        </Routes>
      </main>
    </TripProvider>
  );
}

export default App;
