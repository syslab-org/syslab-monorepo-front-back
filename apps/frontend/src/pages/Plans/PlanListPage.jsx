import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function PlanListPage() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listPlans()
      .then((data) => setItems(data))       // <-- data debe ser JSON
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Cargando…</div>;
  if (err) return <pre style={{ color: 'red' }}>{err}</pre>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Planes de red</h2>
      <ul className="space-y-2">
        {items.map((p) => (
          <li key={p.id}>
            <a className="text-blue-600 underline" href={`/admin/plans/${p.id}`}>
              {p.name || p.id} — {p.status}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
