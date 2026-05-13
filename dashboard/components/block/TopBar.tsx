import { Button } from "@/components/ui/Button";

interface TopBarProps {
  pendingCount: number;
  onRefresh: () => void;
}

export function TopBar({ pendingCount, onRefresh }: TopBarProps) {
  return (
    <div
      className="component-TopBar bg-white border-b border-dpw-border px-6 h-14 flex items-center justify-between flex-shrink-0"
    >
      <div className="flex items-center gap-3">

        <h1
          className="font-serif text-[18px] font-semibold text-dpw-dark m-0"
        >
          Approval Queue
        </h1>

        {pendingCount > 0 && (
          <span
            className="bg-dpw-gold-pale text-dpw-gold border border-dpw-border rounded-full px-2.5 py-[2px] text-[11px] font-medium"
          >
            {pendingCount} Pending Review
          </span>
        )}
      </div>

      <div className="flex gap-2">

        <Button
          onClick={onRefresh}
          bgColor="bg-transparent hover:bg-dpw-bg"
          textColor="text-[#8a7a5a]"
          border="border-dpw-border"
          className="font-sans text-[13px]"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
              strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M16.023 9.348h4.992m-18.03 10.296v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          }
        >
          Refresh
        </Button>

        <Button
          bgColor="bg-dpw-gold hover:bg-dpw-gold-light"
          textColor="text-white"
          border="border-dpw-gold hover:border-dpw-gold-light"
          className="font-sans text-[13px]"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
              strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          }
        >
          Approve All Safe
        </Button>

      </div>
    </div>
  );
}