function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className='meta-row font-sans flex justify-between items-center mb-2' >
      <span className='text-dpw-muted text-[11px]'>{label}</span>
      <span className='text-dpw-text font-medium text-xs'>{children}</span>
    </div>
  )
}

export { MetaRow };

