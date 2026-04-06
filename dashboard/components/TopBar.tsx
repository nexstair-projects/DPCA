'use client'

import { FiRefreshCw } from 'react-icons/fi'

export default function TopBar() {
  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-dpw-dark">Inbox</h2>
        <p className="text-gray-500 text-sm">Manage incoming messages and draft replies</p>
      </div>
      
      <div className="flex gap-4">
        <button className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <FiRefreshCw className="w-4 h-4" />
          Refresh
        </button>
        <button className="px-6 py-2 bg-dpw-gold text-white font-semibold rounded-lg hover:bg-opacity-90 transition-all">
          Approve All Safe
        </button>
      </div>
    </header>
  )
}
