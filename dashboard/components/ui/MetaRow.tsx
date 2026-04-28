import {S} from '@/lib/theme';


function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className='meta-row' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 11 }}>
      <span style={{ color: S.muted }}>{label}</span>
      <span style={{ color: S.text, fontWeight: 500 }}>{children}</span>
    </div>
  )
}

export default MetaRow;