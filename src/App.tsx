import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import CrearEscrow from './pages/CrearEscrow';
import VistaComprador from './pages/VistaComprador';
import SalaEntrega from './pages/SalaEntrega';
import DisputasArbitraje from './pages/DisputasArbitraje';
import Certificados from './pages/Certificados';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page — no app shell */}
        <Route path="/" element={<Landing />} />

        {/* App pages — wrapped in Layout (Header + footer) */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/crear-escrow" element={<CrearEscrow />} />
          <Route path="/vista-comprador" element={<VistaComprador />} />
          <Route path="/sala-de-entrega" element={<SalaEntrega />} />
          <Route path="/disputas-y-arbitraje" element={<DisputasArbitraje />} />
          <Route path="/certificados" element={<Certificados />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
