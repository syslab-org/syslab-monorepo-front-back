//#apps/frontend/src/pages/Dashboard.jsx
import { Link } from "react-router-dom"

function Dashboard() {


  return (

    <div className="dashboard">
      {/** cabecera / estadística /cards */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Panel</h1>

        {/** botones de historial de planes */}

        <Link
          to="/admin/plans"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 border
                     hover:bg-gray-50 transition text-sm font-medium"
        >
          <span>Ver planes de red</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M13 5l7 7-7 7M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </div>
  )
}

export default Dashboard
