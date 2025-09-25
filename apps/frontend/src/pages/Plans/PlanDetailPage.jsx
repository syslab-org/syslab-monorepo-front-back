import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';

export default function PlanDetailPage() {
  const { id } = useParams();
  const [plan, setPlan] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.getPlan(id)
      .then(setPlan)
      .catch((e) => setErr(e.message));
  }, [id]);

  if (err) return <pre style={{ color: 'red' }}>{err}</pre>;
  if (!plan) return <div>Cargando…</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Plan {plan.name || plan.id}</h2>
      <pre className="bg-gray-50 p-3 rounded">{JSON.stringify(plan, null, 2)}</pre>
    </div>
  );
}
